interface PublishWalletDebitedInput {
  eventId: string;
  correlationId: string;
  causationId: string;
  playerId: string;
  walletId: string;
  amountCents: string;
  balanceCents: string;
  referenceType?: string;
  referenceId?: string;
}

interface PublishWalletDebitRejectedInput {
  eventId: string;
  correlationId: string;
  causationId: string;
  playerId: string;
  amountCents: string;
  reason:
    | "INSUFFICIENT_BALANCE"
    | "WALLET_NOT_FOUND"
    | "INVALID_AMOUNT"
    | "DUPLICATED_EVENT"
    | "UNKNOWN";
  referenceType?: string;
  referenceId?: string;
}

interface PublishWalletCreditedInput {
  eventId: string;
  correlationId: string;
  causationId: string;
  playerId: string;
  walletId: string;
  amountCents: string;
  balanceCents: string;
  referenceType?: string;
  referenceId?: string;
}

interface PublishWalletCreditRejectedInput {
  eventId: string;
  correlationId: string;
  causationId: string;
  playerId: string;
  amountCents: string;
  reason:
    | "WALLET_NOT_FOUND"
    | "INVALID_AMOUNT"
    | "DUPLICATED_EVENT"
    | "UNKNOWN";
  referenceType?: string;
  referenceId?: string;
}

export interface WalletResultEventsPublisher {
  publishWalletDebited(input: PublishWalletDebitedInput): Promise<void>;

  publishWalletDebitRejected(
    input: PublishWalletDebitRejectedInput,
  ): Promise<void>;

  publishWalletCredited(input: PublishWalletCreditedInput): Promise<void>;

  publishWalletCreditRejected(
    input: PublishWalletCreditRejectedInput,
  ): Promise<void>;
}
