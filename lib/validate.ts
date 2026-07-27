import { ValidationError } from "./authorize";

export async function readJsonBody<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ValidationError("Request body must be valid JSON");
  }
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`'${field}' is required`);
  }
  return value.trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireEmail(value: unknown, field = "email"): string {
  const email = requireString(value, field);
  if (!EMAIL_RE.test(email)) {
    throw new ValidationError(`'${field}' must be a valid email address`);
  }
  return email.toLowerCase();
}
