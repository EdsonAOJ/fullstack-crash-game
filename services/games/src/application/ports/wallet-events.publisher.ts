export interface PublishWalletDebitRequestedInput {
  eventId: string;
  correlationId: string;
  playerId: string;
  amountCents: string;
  referenceId: string;
}

export interface PublishWalletCreditRequestedInput {
  eventId: string;
  correlationId: string;
  playerId: string;
  amountCents: string;
  referenceId: string;
}

export interface WalletEventsPublisher {
  publishDebitRequested(input: PublishWalletDebitRequestedInput): Promise<void>;
  publishCreditRequested(
    input: PublishWalletCreditRequestedInput,
  ): Promise<void>;
}
