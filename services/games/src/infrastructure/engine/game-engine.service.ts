import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { Clock } from "../../application/ports/clock";
import type { IdGenerator } from "../../application/ports/id-generator";
import type { RoundRepository } from "../../application/ports/round.repository";
import { Round } from "../../domain/entities/round.entity";
import { Multiplier } from "../../domain/value-objects/multiplier.vo";
import { ProvablyFairService } from "@/domain/services/provably-fair.service";
import type { GameRealtimeNotifier } from "../../application/ports/game-realtime.notifier";
import { RealtimePayloadMapper } from "../realtime/realtime-payload.mapper";
import { readPositiveNumberFromEnv } from "../config/read-env";
import type { GameUnitOfWork } from "../../application/ports/game-unit-of-work";
import { WALLET_EVENT_NAMES } from "@crash/events";

@Injectable()
export class GameEngineService implements OnModuleInit, OnModuleDestroy {
  private interval: ReturnType<typeof setInterval> | null = null;
  private isTickRunning = false;
  private readonly engineTickMs = readPositiveNumberFromEnv(
    "GAME_ENGINE_TICK_MS",
    1000,
  );

  private readonly bettingWindowMs = readPositiveNumberFromEnv(
    "GAME_BETTING_WINDOW_MS",
    10_000,
  );

  private readonly crashRevealMs = readPositiveNumberFromEnv(
    "GAME_CRASH_REVEAL_MS",
    3000,
  );

  private readonly multiplierGrowthPerSecond = readPositiveNumberFromEnv(
    "GAME_MULTIPLIER_GROWTH_PER_SECOND",
    0.1,
  );

  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly provablyFairService: ProvablyFairService,
    private readonly realtimeNotifier: GameRealtimeNotifier,
    private readonly gameUnitOfWork: GameUnitOfWork,
  ) {}

  onModuleInit(): void {
    this.interval = setInterval(() => {
      void this.tick();
    }, this.engineTickMs);

    console.log(
      `Game engine started. tick=${this.engineTickMs}ms bettingWindow=${this.bettingWindowMs}ms crashReveal=${this.crashRevealMs}ms growth=${this.multiplierGrowthPerSecond}/s maxCrash=${this.provablyFairService.getMaxCrashMultiplier()}x`,
    );
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private async tick(): Promise<void> {
    if (this.isTickRunning) {
      return;
    }

    this.isTickRunning = true;

    try {
      await this.processTick();
    } catch (error) {
      console.error("Game engine tick failed.", error);
    } finally {
      this.isTickRunning = false;
    }
  }

  private async processTick(): Promise<void> {
    const round = await this.roundRepository.findCurrent();

    if (!round) {
      await this.ensureRoundLifecycle();
      return;
    }

    const now = this.clock.now();
    const snapshot = round.toSnapshot();

    if (snapshot.status === "WAITING_FOR_BETS") {
      if (now >= snapshot.startsAt) {
        round.start(now);
        await this.roundRepository.save(round);

        this.realtimeNotifier.notifyRoundStarted(
          RealtimePayloadMapper.round(round.toSnapshot()),
        );

        console.log(`Round ${snapshot.id} started.`);
      }

      return;
    }
    if (snapshot.status === "RUNNING") {
      if (!snapshot.startedAt) {
        return;
      }

      const nextMultiplier = this.calculateCurrentMultiplier({
        startedAt: snapshot.startedAt,
        now,
      });

      const autoCashedOutEntities = round.updateMultiplier(nextMultiplier, now);
      const updatedSnapshot = round.toSnapshot();

      const autoCashedOutBets = autoCashedOutEntities.map((bet) =>
        bet.toSnapshot(),
      );

      await this.gameUnitOfWork.transaction(async (transaction) => {
        await transaction.roundRepository.save(round);

        for (const bet of autoCashedOutBets) {
          if (!bet.payoutCents) {
            continue;
          }

          const eventId = this.idGenerator.generate();

          await transaction.outboxRepository.save({
            eventId,
            eventName: WALLET_EVENT_NAMES.WALLET_CREDIT_REQUESTED,
            payload: {
              eventId,
              eventName: WALLET_EVENT_NAMES.WALLET_CREDIT_REQUESTED,
              correlationId: bet.id,
              playerId: bet.playerId,
              amountCents: bet.payoutCents.toString(),
              referenceType: "CASHOUT",
              referenceId: bet.id,
              occurredAt: now.toISOString(),
            },
          });
        }
      });

      this.realtimeNotifier.notifyRoundMultiplierUpdated(
        RealtimePayloadMapper.round(updatedSnapshot),
      );

      for (const bet of autoCashedOutBets) {
        this.realtimeNotifier.notifyBetCashedOut(
          RealtimePayloadMapper.bet(bet),
        );
      }

      if (updatedSnapshot.status === "CRASHED") {
        this.realtimeNotifier.notifyRoundCrashed(
          RealtimePayloadMapper.round(updatedSnapshot),
        );

        console.log(
          `Round ${updatedSnapshot.id} crashed at ${updatedSnapshot.currentMultiplier.toNumber()}x.`,
        );
      }
    }
  }

  private async ensureRoundLifecycle(): Promise<void> {
    const latestCrashedRound = await this.roundRepository.findLatestCrashed();

    if (latestCrashedRound) {
      const snapshot = latestCrashedRound.toSnapshot();

      if (!snapshot.crashedAt) {
        latestCrashedRound.complete(this.clock.now());
        await this.roundRepository.save(latestCrashedRound);
        return;
      }

      const now = this.clock.now();
      const millisecondsSinceCrash =
        now.getTime() - snapshot.crashedAt.getTime();

      if (millisecondsSinceCrash >= this.crashRevealMs) {
        latestCrashedRound.complete(now);
        await this.roundRepository.save(latestCrashedRound);

        this.realtimeNotifier.notifyRoundCompleted(
          RealtimePayloadMapper.round(latestCrashedRound.toSnapshot()),
        );

        console.log(`Round ${snapshot.id} completed.`);
      }

      return;
    }

    await this.createNextRound();
  }

  private async createNextRound(): Promise<void> {
    const now = this.clock.now();

    const nonce = Math.floor(now.getTime() / 1000);
    const fairData = this.provablyFairService.generateRoundData(nonce);

    const newRound = Round.create({
      id: this.idGenerator.generate(),
      crashPoint: fairData.crashPoint,
      serverSeed: fairData.serverSeed,
      serverSeedHash: fairData.serverSeedHash,
      publicSeed: fairData.publicSeed,
      nonce: fairData.nonce,
      startsAt: new Date(now.getTime() + this.bettingWindowMs),
      now,
    });

    await this.roundRepository.save(newRound);

    this.realtimeNotifier.notifyRoundCreated(
      RealtimePayloadMapper.round(newRound.toSnapshot()),
    );

    console.log(`Round ${newRound.toSnapshot().id} created.`);
  }

  private calculateCurrentMultiplier(input: {
    startedAt: Date;
    now: Date;
  }): Multiplier {
    const elapsedMilliseconds = input.now.getTime() - input.startedAt.getTime();
    const elapsedSeconds = Math.max(0, elapsedMilliseconds / 1000);

    const multiplier = 1 + elapsedSeconds * this.multiplierGrowthPerSecond;

    return Multiplier.fromNumber(multiplier);
  }
}
