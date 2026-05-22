import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from "@nestjs/common";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { ERROR_CODES } from "./error-codes";

@Injectable()
export class ZodValidationPipe<TOutput> implements PipeTransform {
  constructor(private readonly schema: ZodType<TOutput, ZodTypeDef, unknown>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): TOutput {
    const result = this.schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    throw this.toBadRequestException(result.error);
  }

  private toBadRequestException(error: ZodError): BadRequestException {
    return new BadRequestException({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: "Request validation failed.",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
}
