export interface ApiSuccessResponse<TData = unknown, TMeta = unknown> {
  success: true;
  timestamp: string;
  requestId: string;
  data: TData;
  meta: TMeta | null;
}

export interface ApiErrorResponse {
  success: false;
  timestamp: string;
  requestId: string;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
}
