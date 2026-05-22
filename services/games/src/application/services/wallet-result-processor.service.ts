import {
  type WalletCreditedEvent,
  type WalletCreditRejectedEvent,
  type WalletDebitedEvent,
  type WalletDebitRejectedEvent,
  WALLET_EVENT_NAMES,
} from "@crash/events";
import type { Clock } from "../ports/clock";
import type { GameRealtimeNotifier } from "../ports/game-realtime.notifier";
import type {
  GameTransaction,
  GameUnitOfWork,
} from "../ports/game-unit-of-work";
import { ConfirmWalletCreditUseCase } from "../use-cases/confirm-wallet-credit.use-case";
import { ConfirmWalletDebitUseCase } from "../use-cases/confirm-wallet-debit.use-case";
import { RejectWalletDebitUseCase } from "../use-cases/reject-wallet-debit.use-case";

export type WalletResultEvent =
  | WalletDebitedEvent
  | WalletDebitRejectedEvent
  | WalletCreditedEvent
  | WalletCreditRejectedEvent;

export class WalletResultProcessor {
  constructor(
    private readonly gameUnitOfWork: GameUnitOfWork,
    private readonly clock: Clock,
    private readonly realtimeNotifier: GameRealtimeNotifier,
  ) {}

  async process(event: WalletResultEvent): Promise<void> {
    if (this.isWalletDebitedEvent(event)) {
      await this.processWalletDebited(event);
      return;
    }

    if (this.isWalletDebitRejectedEvent(event)) {
      await this.processWalletDebitRejected(event);
      return;
    }

    if (this.isWalletCreditedEvent(event)) {
      await this.processWalletCredited(event);
      return;
    }

    await this.processWalletCreditRejected(event);
  }

  private async processWithIdempotency(
    event: WalletResultEvent,
    handler: (transaction: GameTransaction) => Promise<void>,
  ): Promise<void> {
    await this.gameUnitOfWork.transaction(async (transaction) => {
      const alreadyProcessed =
        await transaction.processedEventRepository.exists(
          event.metadata.eventId,
        );

      if (alreadyProcessed) {
        console.log(
          `Games wallet result processor ignored duplicated event ${event.metadata.eventId} (${event.metadata.eventName}).`,
        );

        return;
      }

      await handler(transaction);

      await transaction.processedEventRepository.save({
        eventId: event.metadata.eventId,
        eventName: event.metadata.eventName,
      });
    });
  }

  private async processWalletDebited(event: WalletDebitedEvent): Promise<void> {
    await this.processWithIdempotency(event, async (transaction) => {
      const useCase = new ConfirmWalletDebitUseCase(
        transaction.roundRepository,
        this.clock,
        this.realtimeNotifier,
      );

      await useCase.execute({
        betId: event.payload.referenceId,
      });
    });
  }

  private async processWalletDebitRejected(
    event: WalletDebitRejectedEvent,
  ): Promise<void> {
    await this.processWithIdempotency(event, async (transaction) => {
      const useCase = new RejectWalletDebitUseCase(
        transaction.roundRepository,
        this.clock,
        this.realtimeNotifier,
      );

      await useCase.execute({
        betId: event.payload.referenceId,
        reason: event.payload.reason,
      });
    });
  }

  private async processWalletCredited(
    event: WalletCreditedEvent,
  ): Promise<void> {
    await this.processWithIdempotency(event, async (transaction) => {
      const useCase = new ConfirmWalletCreditUseCase(
        transaction.roundRepository,
        this.clock,
        this.realtimeNotifier,
      );

      await useCase.execute({
        betId: event.payload.referenceId,
      });
    });
  }

  private async processWalletCreditRejected(
    event: WalletCreditRejectedEvent,
  ): Promise<void> {
    await this.processWithIdempotency(event, async () => {
      console.warn(
        `Wallet credit rejected for bet ${event.payload.referenceId}: ${event.payload.reason}`,
      );
    });
  }

  private isWalletDebitedEvent(
    event: WalletResultEvent,
  ): event is WalletDebitedEvent {
    return event.metadata.eventName === WALLET_EVENT_NAMES.WALLET_DEBITED;
  }

  private isWalletDebitRejectedEvent(
    event: WalletResultEvent,
  ): event is WalletDebitRejectedEvent {
    return (
      event.metadata.eventName === WALLET_EVENT_NAMES.WALLET_DEBIT_REJECTED
    );
  }

  private isWalletCreditedEvent(
    event: WalletResultEvent,
  ): event is WalletCreditedEvent {
    return event.metadata.eventName === WALLET_EVENT_NAMES.WALLET_CREDITED;
  }
}
