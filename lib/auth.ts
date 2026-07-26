import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import type { Role } from "./supabase/types";

const TOKEN_TTL = "8h";
const SALT_ROUNDS = 12;

function getSecretKey() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_JWT_SECRET environment variable");
  }
  return new TextEncoder().encode(secret);
}

export interface AuthTokenPayload {
  userId: string;
  role: Role;
  email: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export async function signToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSecretKey());
}

export class InvalidTokenError extends Error {}

export async function verifyToken(token: string): Promise<AuthTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const { userId, role, email } = payload as Record<string, unknown>;
    if (typeof userId !== "string" || typeof email !== "string" || (role !== "teacher" && role !== "student")) {
      throw new InvalidTokenError("Token payload is malformed");
    }
    return { userId, role, email };
  } catch (error) {
    if (error instanceof InvalidTokenError) throw error;
    throw new InvalidTokenError("Token is invalid or expired");
  }
}
