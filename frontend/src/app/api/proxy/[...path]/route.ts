import { NextRequest, NextResponse } from "next/server";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
]);

function buildTargetUrl(request: NextRequest, path: string[]): string {
  const kongUrl = process.env.KONG_URL ?? "http://localhost:8000";
  const targetPath = path.join("/");
  const search = request.nextUrl.search;

  return `${kongUrl}/${targetPath}${search}`;
}

function buildHeaders(request: NextRequest): Headers {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();

    if (!HOP_BY_HOP_HEADERS.has(lowerKey)) {
      headers.set(key, value);
    }
  });

  return headers;
}

async function proxy(
  request: NextRequest,
  context: {
    params: Promise<{
      path: string[];
    }>;
  },
): Promise<NextResponse> {
  const params = await context.params;
  const targetUrl = buildTargetUrl(request, params.path);
  const headers = buildHeaders(request);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: hasBody ? await request.text() : undefined,
    cache: "no-store",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      path: string[];
    }>;
  },
): Promise<NextResponse> {
  return proxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: {
    params: Promise<{
      path: string[];
    }>;
  },
): Promise<NextResponse> {
  return proxy(request, context);
}
