import { NextResponse } from "next/server";
import { UnauthorizedError, ForbiddenError, ValidationError, NotFoundError } from "./authorize";

interface ApiBody<T> {
  status: "success" | "error";
  message: string;
  data: T | null;
}

export function apiSuccess<T>(message: string, data: T | null = null, httpStatus = 200) {
  const body: ApiBody<T> = { status: "success", message, data };
  return NextResponse.json(body, { status: httpStatus });
}

export function apiError(message: string, httpStatus: number, data: unknown = null) {
  const body: ApiBody<unknown> = { status: "error", message, data };
  return NextResponse.json(body, { status: httpStatus });
}

/**
 * Maps the typed errors thrown by lib/authorize.ts (and route handlers) to the
 * structured {status, message, data} JSON contract every route must return.
 */
export function toErrorResponse(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return apiError(error.message || "Unauthorized", 401);
  }
  if (error instanceof ForbiddenError) {
    return apiError(error.message || "Forbidden", 403);
  }
  if (error instanceof ValidationError) {
    return apiError(error.message || "Invalid request", 400);
  }
  if (error instanceof NotFoundError) {
    return apiError(error.message || "Not found", 404);
  }
  console.error(error);
  return apiError("Internal server error", 500);
}
