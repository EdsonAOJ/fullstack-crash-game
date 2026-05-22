import {
  type WalletCreditRequestedEvent,
  type WalletDebitRequestedEvent,
  WALLET_EVENT_NAMES,
} from "@crash/events";
import { WalletNotFoundError } from "../errors/wallet-not-found.error";
import type { Clock } from "../ports/clock";
import type { IdGenerator } from "../ports/id-generator";
import type { WalletUnitOfWork } from "../ports/wallet-unit-of-work";
import { CreditWalletUseCase } from "../use-cases/credit-wallet.use-case";
import { DebitWalletUseCase } from "../use-cases/debit-wallet.use-case";
import { DuplicatedWalletEventError } from "../../domain/errors/duplicated-wallet-event.error";
import { InsufficientBalanceError } from "../../domain/errors/insufficient-balance.error";
import { InvalidMoneyMovementError } from "../../domain/errors/invalid-money-movement.error";

export type WalletCommandEvent =
  | WalletDebitRequestedEvent
  | WalletCreditRequestedEvent;

const WALLET_DEBITED_EVENT = "wallet.debited";
const WALLET_DEBIT_REJECTED_EVENT = "wallet.debit.rejected";
const WALLET_CREDITED_EVENT = "wallet.credited";
const WALLET_CREDIT_REJECTED_EVENT = "wallet.credit.rejected";

export class WalletCommandProcessor {
  constructor(
    private readonly walletUnitOfWork: WalletUnitOfWork,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async process(event: WalletCommandEvent): Promise<void> {
    const alreadyProcessed = await this.walletUnitOfWork.transaction(
      async (transaction) =>
        transaction.processedEventRepository.exists(event.metadata.eventId),
    );

    if (alreadyProcessed) {
      console.log(
        `Wallet processor ignored duplicated event ${event.metadata.eventId} (${event.metadata.eventName}).`,
      );

      return;
    }

    if (this.isWalletDebitRequestedEvent(event)) {
      await this.handleWalletDebitRequested(event);
      return;
    }

    await this.handleWalletCreditRequested(event);
  }

  private isWalletDebitRequestedEvent(
    event: WalletCommandEvent,
  ): event is WalletDebitRequestedEvent {
    return (
      event.metadata.eventName === WALLET_EVENT_NAMES.WALLET_DEBIT_REQUESTED
    );
  }

  private async handleWalletDebitRequested(
    event: WalletDebitRequestedEvent,
  ): Promise<void> {
    await this.walletUnitOfWork.transaction(async (transaction) => {
      try {
        const debitWalletUseCase = new DebitWalletUseCase(
          transaction.walletRepository,
          this.idGenerator,
          this.clock,
        );

        const output = await debitWalletUseCase.execute({
          playerId: event.payload.playerId,
          eventId: event.metadata.eventId,
          amountCents: BigInt(event.payload.amountCents),
          referenceType: event.payload.referenceType,
          referenceId: event.payload.referenceId,
        });

        await transaction.processedEventRepository.save({
          eventId: event.metadata.eventId,
          eventName: event.metadata.eventName,
        });

        const outboxEventId = this.idGenerator.generate();

        await transaction.outboxRepository.save({
          eventId: outboxEventId,
          eventName: WALLET_DEBITED_EVENT,
          payload: {
            eventId: outboxEventId,
            eventName: WALLET_DEBITED_EVENT,
            correlationId: event.metadata.correlationId,
            causationId: event.metadata.eventId,
            playerId: event.payload.playerId,
            walletId: output.walletId,
            amountCents: event.payload.amountCents,
            balanceCents: output.balanceCents,
            referenceType: event.payload.referenceType ?? null,
            referenceId: event.payload.referenceId ?? null,
            occurredAt: this.clock.now().toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof DuplicatedWalletEventError) {
          await transaction.processedEventRepository.save({
            eventId: event.metadata.eventId,
            eventName: event.metadata.eventName,
          });

          return;
        }

        await transaction.processedEventRepository.save({
          eventId: event.metadata.eventId,
          eventName: event.metadata.eventName,
        });

        const outboxEventId = this.idGenerator.generate();

        await transaction.outboxRepository.save({
          eventId: outboxEventId,
          eventName: WALLET_DEBIT_REJECTED_EVENT,
          payload: {
            eventId: outboxEventId,
            eventName: WALLET_DEBIT_REJECTED_EVENT,
            correlationId: event.metadata.correlationId,
            causationId: event.metadata.eventId,
            playerId: event.payload.playerId,
            amountCents: event.payload.amountCents,
            reason: this.mapDebitErrorReason(error),
            referenceType: event.payload.referenceType ?? null,
            referenceId: event.payload.referenceId ?? null,
            occurredAt: this.clock.now().toISOString(),
          },
        });
      }
    });
  }

  private async handleWalletCreditRequested(
    event: WalletCreditRequestedEvent,
  ): Promise<void> {
    await this.walletUnitOfWork.transaction(async (transaction) => {
      try {
        const creditWalletUseCase = new CreditWalletUseCase(
          transaction.walletRepository,
          this.idGenerator,
          this.clock,
        );

        const output = await creditWalletUseCase.execute({
          playerId: event.payload.playerId,
          eventId: event.metadata.eventId,
          amountCents: BigInt(event.payload.amountCents),
          referenceType: event.payload.referenceType,
          referenceId: event.payload.referenceId,
        });

        await transaction.processedEventRepository.save({
          eventId: event.metadata.eventId,
          eventName: event.metadata.eventName,
        });

        const outboxEventId = this.idGenerator.generate();

        await transaction.outboxRepository.save({
          eventId: outboxEventId,
          eventName: WALLET_CREDITED_EVENT,
          payload: {
            eventId: outboxEventId,
            eventName: WALLET_CREDITED_EVENT,
            correlationId: event.metadata.correlationId,
            causationId: event.metadata.eventId,
            playerId: event.payload.playerId,
            walletId: output.walletId,
            amountCents: event.payload.amountCents,
            balanceCents: output.balanceCents,
            referenceType: event.payload.referenceType ?? null,
            referenceId: event.payload.referenceId ?? null,
            occurredAt: this.clock.now().toISOString(),
          },
        });
      } catch (error) {
        if (error instanceof DuplicatedWalletEventError) {
          await transaction.processedEventRepository.save({
            eventId: event.metadata.eventId,
            eventName: event.metadata.eventName,
          });

          return;
        }

        await transaction.processedEventRepository.save({
          eventId: event.metadata.eventId,
          eventName: event.metadata.eventName,
        });

        const outboxEventId = this.idGenerator.generate();

        await transaction.outboxRepository.save({
          eventId: outboxEventId,
          eventName: WALLET_CREDIT_REJECTED_EVENT,
          payload: {
            eventId: outboxEventId,
            eventName: WALLET_CREDIT_REJECTED_EVENT,
            correlationId: event.metadata.correlationId,
            causationId: event.metadata.eventId,
            playerId: event.payload.playerId,
            amountCents: event.payload.amountCents,
            reason: this.mapCreditErrorReason(error),
            referenceType: event.payload.referenceType ?? null,
            referenceId: event.payload.referenceId ?? null,
            occurredAt: this.clock.now().toISOString(),
          },
        });
      }
    });
  }

  private mapDebitErrorReason(
    error: unknown,
  ):
    | "INSUFFICIENT_BALANCE"
    | "WALLET_NOT_FOUND"
    | "INVALID_AMOUNT"
    | "DUPLICATED_EVENT"
    | "UNKNOWN" {
    if (error instanceof InsufficientBalanceError) {
      return "INSUFFICIENT_BALANCE";
    }

    if (error instanceof WalletNotFoundError) {
      return "WALLET_NOT_FOUND";
    }

    if (error instanceof InvalidMoneyMovementError) {
      return "INVALID_AMOUNT";
    }

    if (error instanceof DuplicatedWalletEventError) {
      return "DUPLICATED_EVENT";
    }

    console.error("Unexpected wallet debit error.", error);

    return "UNKNOWN";
  }

  private mapCreditErrorReason(
    error: unknown,
  ): "WALLET_NOT_FOUND" | "INVALID_AMOUNT" | "DUPLICATED_EVENT" | "UNKNOWN" {
    if (error instanceof WalletNotFoundError) {
      return "WALLET_NOT_FOUND";
    }

    if (error instanceof InvalidMoneyMovementError) {
      return "INVALID_AMOUNT";
    }

    if (error instanceof DuplicatedWalletEventError) {
      return "DUPLICATED_EVENT";
    }

    console.error("Unexpected wallet credit error.", error);

    return "UNKNOWN";
  }
}
