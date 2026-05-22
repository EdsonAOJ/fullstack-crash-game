import { randomUUID } from "node:crypto";

interface HttpRequestLike {
  headers?: Record<string, string | string[] | undefined>;
}

export function getRequestId(request: HttpRequestLike): string {
  const headerValue = request.headers?.["x-request-id"];

  if (Array.isArray(headerValue)) {
    return headerValue[0] ?? randomUUID();
  }

  return headerValue ?? randomUUID();
}
