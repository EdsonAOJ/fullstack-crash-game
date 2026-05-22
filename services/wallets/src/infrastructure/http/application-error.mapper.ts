import { HttpStatus } from "@nestjs/common";
import { WalletAlreadyExistsError } from "../../application/errors/wallet-already-exists.error";
import { WalletNotFoundError } from "../../application/errors/wallet-not-found.error";
import { DuplicatedWalletEventError } from "../../domain/errors/duplicated-wallet-event.error";
import { InsufficientBalanceError } from "../../domain/errors/insufficient-balance.error";
import { InvalidMoneyMovementError } from "../../domain/errors/invalid-money-movement.error";
import { ERROR_CODES } from "./error-codes";

export interface MappedApplicationError {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, string>;
}

export function mapApplicationError(
  exception: unknown,
): MappedApplicationError | null {
  if (exception instanceof WalletNotFoundError) {
    return {
      statusCode: HttpStatus.NOT_FOUND,
      code: ERROR_CODES.WALLET_NOT_FOUND,
      message: exception.message,
    };
  }

  if (exception instanceof WalletAlreadyExistsError) {
    return {
      statusCode: HttpStatus.CONFLICT,
      code: ERROR_CODES.WALLET_ALREADY_EXISTS,
      message: exception.message,
    };
  }

  if (exception instanceof InsufficientBalanceError) {
    return {
      statusCode: HttpStatus.CONFLICT,
      code: ERROR_CODES.INSUFFICIENT_BALANCE,
      message: exception.message,
    };
  }

  if (exception instanceof DuplicatedWalletEventError) {
    return {
      statusCode: HttpStatus.CONFLICT,
      code: ERROR_CODES.DUPLICATED_EVENT,
      message: exception.message,
    };
  }

  if (exception instanceof InvalidMoneyMovementError) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: exception.message,
    };
  }

  return null;
}
