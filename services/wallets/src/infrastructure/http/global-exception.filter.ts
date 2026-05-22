import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { ApiErrorResponse } from "./api-response";
import { mapApplicationError } from "./application-error.mapper";
import { ERROR_CODES } from "./error-codes";
import { getRequestId } from "./request-id";

interface HttpResponseLike {
  status(statusCode: number): {
    json(body: unknown): void;
  };
}

interface HttpRequestLike {
  headers?: Record<string, string | string[] | undefined>;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();

    const response = context.getResponse<HttpResponseLike>();
    const request = context.getRequest<HttpRequestLike>();

    const mappedApplicationError = mapApplicationError(exception);

    const statusCode =
      mappedApplicationError?.statusCode ?? this.getStatusCode(exception);

    const message =
      mappedApplicationError?.message ?? this.getMessage(exception);

    const code =
      mappedApplicationError?.code ?? this.getCode(exception, statusCode);

    const details =
      mappedApplicationError?.details ?? this.getDetails(exception);

    const body: ApiErrorResponse = {
      success: false,
      timestamp: new Date().toISOString(),
      requestId: getRequestId(request),
      error: {
        code,
        message,
        statusCode,
        ...(details !== undefined ? { details } : {}),
      },
    };

    response.status(statusCode).json(body);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getMessage(exception: unknown): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === "string") {
        return response;
      }

      if (this.isObject(response)) {
        const message = response["message"];

        if (Array.isArray(message)) {
          return message.join(", ");
        }

        if (typeof message === "string") {
          return message;
        }
      }

      return exception.message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return "Internal server error";
  }

  private getCode(exception: unknown, statusCode: number): string {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (this.isObject(response) && typeof response["code"] === "string") {
        return response["code"];
      }
    }

    switch (statusCode) {
      case HttpStatus.UNAUTHORIZED:
        return ERROR_CODES.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ERROR_CODES.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ERROR_CODES.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ERROR_CODES.CONFLICT;
      case HttpStatus.BAD_REQUEST:
        return ERROR_CODES.VALIDATION_ERROR;
      default:
        return ERROR_CODES.INTERNAL_SERVER_ERROR;
    }
  }

  private getDetails(exception: unknown): unknown {
    if (!(exception instanceof HttpException)) {
      return undefined;
    }

    const response = exception.getResponse();

    if (this.isObject(response) && response["details"] !== undefined) {
      return response["details"];
    }

    return undefined;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }
}
