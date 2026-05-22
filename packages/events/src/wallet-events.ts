export const WALLET_EVENT_NAMES = {
  WALLET_DEBIT_REQUESTED: "wallet.debit.requested",
  WALLET_DEBITED: "wallet.debited",
  WALLET_DEBIT_REJECTED: "wallet.debit.rejected",
  WALLET_CREDIT_REQUESTED: "wallet.credit.requested",
  WALLET_CREDITED: "wallet.credited",
  WALLET_CREDIT_REJECTED: "wallet.credit.rejected",
} as const;

export type WalletEventName =
  (typeof WALLET_EVENT_NAMES)[keyof typeof WALLET_EVENT_NAMES];

export interface IntegrationEventMetadata {
  eventId: string;
  eventName: string;
  occurredAt: string;
  correlationId: string;
  causationId?: string;
  version: number;
  source: string;
}

export interface WalletDebitRequestedPayload {
  playerId: string;
  amountCents: string;
  referenceType: "BET";
  referenceId: string;
}

export interface WalletDebitRequestedEvent {
  metadata: IntegrationEventMetadata & {
    eventName: typeof WALLET_EVENT_NAMES.WALLET_DEBIT_REQUESTED;
  };
  payload: WalletDebitRequestedPayload;
}

export interface WalletDebitedPayload {
  playerId: string;
  walletId: string;
  amountCents: string;
  balanceCents: string;
  referenceType: "BET";
  referenceId: string;
}

export interface WalletDebitedEvent {
  metadata: IntegrationEventMetadata & {
    eventName: typeof WALLET_EVENT_NAMES.WALLET_DEBITED;
  };
  payload: WalletDebitedPayload;
}

export interface WalletDebitRejectedPayload {
  playerId: string;
  amountCents: string;
  reason:
    | "INSUFFICIENT_BALANCE"
    | "WALLET_NOT_FOUND"
    | "INVALID_AMOUNT"
    | "DUPLICATED_EVENT"
    | "UNKNOWN";
  referenceType: "BET";
  referenceId: string;
}

export interface WalletDebitRejectedEvent {
  metadata: IntegrationEventMetadata & {
    eventName: typeof WALLET_EVENT_NAMES.WALLET_DEBIT_REJECTED;
  };
  payload: WalletDebitRejectedPayload;
}

export interface WalletCreditRequestedPayload {
  playerId: string;
  amountCents: string;
  referenceType: "CASHOUT" | "REFUND";
  referenceId: string;
}

export interface WalletCreditRequestedEvent {
  metadata: IntegrationEventMetadata & {
    eventName: typeof WALLET_EVENT_NAMES.WALLET_CREDIT_REQUESTED;
  };
  payload: WalletCreditRequestedPayload;
}

export interface WalletCreditedPayload {
  playerId: string;
  walletId: string;
  amountCents: string;
  balanceCents: string;
  referenceType: "CASHOUT" | "REFUND";
  referenceId: string;
}

export interface WalletCreditedEvent {
  metadata: IntegrationEventMetadata & {
    eventName: typeof WALLET_EVENT_NAMES.WALLET_CREDITED;
  };
  payload: WalletCreditedPayload;
}

export interface WalletCreditRejectedPayload {
  playerId: string;
  amountCents: string;
  reason:
    | "WALLET_NOT_FOUND"
    | "INVALID_AMOUNT"
    | "DUPLICATED_EVENT"
    | "UNKNOWN";
  referenceType: "CASHOUT" | "REFUND";
  referenceId: string;
}

export interface WalletCreditRejectedEvent {
  metadata: IntegrationEventMetadata & {
    eventName: typeof WALLET_EVENT_NAMES.WALLET_CREDIT_REJECTED;
  };
  payload: WalletCreditRejectedPayload;
}

export type WalletIntegrationEvent =
  | WalletDebitRequestedEvent
  | WalletDebitedEvent
  | WalletDebitRejectedEvent
  | WalletCreditRequestedEvent
  | WalletCreditedEvent
  | WalletCreditRejectedEvent;
