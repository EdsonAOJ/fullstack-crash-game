import { HttpStatus } from "@nestjs/common";
import { BetNotFoundError } from "../../application/errors/bet-not-found.error";
import { CurrentBetNotFoundError } from "../../application/errors/current-bet-not-found.error";
import { CurrentRoundNotFoundError } from "../../application/errors/current-round-not-found.error";
import { LatestRoundNotFoundError } from "../../application/errors/latest-round-not-found.error";
import { RoundNotFoundError } from "../../application/errors/round-not-found.error";
import { BetNotFoundInRoundError } from "../../domain/errors/bet-not-found-in-round.error";
import { CashoutNotAllowedError } from "../../domain/errors/cashout-not-allowed.error";
import { DuplicatedBetError } from "../../domain/errors/duplicated-bet.error";
import { InvalidBetAmountError } from "../../domain/errors/invalid-bet-amount.error";
import { RoundNotAcceptingBetsError } from "../../domain/errors/round-not-accepting-bets.error";
import { RoundNotRunningError } from "../../domain/errors/round-not-running.error";
import { ERROR_CODES } from "./error-codes";

export interface MappedApplicationError {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, string>;
}

export function mapApplicationError(
  exception: Error,
): MappedApplicationError | null {
  if (exception instanceof CurrentRoundNotFoundError) {
    return {
      statusCode: HttpStatus.NOT_FOUND,
      code: ERROR_CODES.CURRENT_ROUND_NOT_FOUND,
      message: exception.message,
    };
  }

  if (exception instanceof LatestRoundNotFoundError) {
    return {
      statusCode: HttpStatus.NOT_FOUND,
      code: ERROR_CODES.LATEST_ROUND_NOT_FOUND,
      message: exception.message,
    };
  }

  if (exception instanceof RoundNotFoundError) {
    return {
      statusCode: HttpStatus.NOT_FOUND,
      code: ERROR_CODES.ROUND_NOT_FOUND,
      message: exception.message,
    };
  }

  if (exception instanceof CurrentBetNotFoundError) {
    return {
      statusCode: HttpStatus.NOT_FOUND,
      code: ERROR_CODES.CURRENT_BET_NOT_FOUND,
      message: exception.message,
    };
  }

  if (exception instanceof BetNotFoundError) {
    return {
      statusCode: HttpStatus.NOT_FOUND,
      code: ERROR_CODES.BET_NOT_FOUND,
      message: exception.message,
    };
  }

  if (exception instanceof BetNotFoundInRoundError) {
    return {
      statusCode: HttpStatus.NOT_FOUND,
      code: ERROR_CODES.BET_NOT_FOUND,
      message: exception.message,
    };
  }

  if (exception instanceof DuplicatedBetError) {
    return {
      statusCode: HttpStatus.CONFLICT,
      code: ERROR_CODES.DUPLICATED_BET,
      message: exception.message,
    };
  }

  if (exception instanceof RoundNotAcceptingBetsError) {
    return {
      statusCode: HttpStatus.CONFLICT,
      code: ERROR_CODES.ROUND_NOT_ACCEPTING_BETS,
      message: exception.message,
    };
  }

  if (exception instanceof RoundNotRunningError) {
    return {
      statusCode: HttpStatus.CONFLICT,
      code: ERROR_CODES.CASHOUT_NOT_ALLOWED,
      message: exception.message,
    };
  }

  if (exception instanceof CashoutNotAllowedError) {
    return {
      statusCode: HttpStatus.CONFLICT,
      code: ERROR_CODES.CASHOUT_NOT_ALLOWED,
      message: exception.message,
    };
  }

  if (exception instanceof InvalidBetAmountError) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: exception.message,
    };
  }

  return null;
}
