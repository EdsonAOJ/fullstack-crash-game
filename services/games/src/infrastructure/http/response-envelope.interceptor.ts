import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { map, Observable } from "rxjs";
import { getRequestId } from "./request-id";
import type { ApiSuccessResponse } from "./api-response";

interface HttpRequestLike {
  headers?: Record<string, string | string[] | undefined>;
}

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse> {
    const request = context.switchToHttp().getRequest<HttpRequestLike>();
    const requestId = getRequestId(request);

    return next.handle().pipe(
      map((data: unknown) => ({
        success: true,
        timestamp: new Date().toISOString(),
        requestId,
        data,
        meta: null,
      })),
    );
  }
}
