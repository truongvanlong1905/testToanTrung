import { NextResponse } from "next/server";
import crypto from "crypto";
import type { Logger } from "./logger";

export class AppError extends Error {
  public readonly status: number;
  public readonly errorCode: string;
  public readonly extra?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    errorCode = "APP_ERROR",
    extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.errorCode = errorCode;
    this.extra = extra;
  }
}

export function getRequestId(req?: Request): string {
  const headerId = req?.headers?.get("x-request-id")?.trim();
  if (headerId) return headerId;
  return crypto.randomUUID();
}

export function apiSuccess<T>(
  data: T,
  status = 200,
  extraFields?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(extraFields || {}),
    },
    { status }
  );
}

export function apiError(
  message: string | { code: string; message: string },
  status = 400,
  extraFields?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(extraFields || {}),
    },
    { status }
  );
}

export function handleRouteError(
  error: unknown,
  logger: Logger,
  action: string,
  requestId: string,
  startTime: number,
  fallbackMessage = "Lỗi xử lý yêu cầu từ máy chủ",
  headers?: HeadersInit
): NextResponse {
  const durationMs = Math.max(0, Date.now() - startTime);

  if (error instanceof AppError) {
    logger.warn({
      requestId,
      action,
      durationMs,
      status: error.status,
      errorCode: error.errorCode,
      message: error.message,
      meta: error.extra,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.errorCode,
          message: error.message,
        },
        ...(error.extra || {}),
      },
      { status: error.status, headers }
    );
  }

  const errMessage = error instanceof Error ? error.message : fallbackMessage;
  logger.error({
    requestId,
    action,
    durationMs,
    status: 500,
    errorCode: "INTERNAL_ERROR",
    message: errMessage,
  });

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: fallbackMessage,
      },
    },
    { status: 500, headers }
  );
}
