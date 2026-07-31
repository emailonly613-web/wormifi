import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const RECOVERY_CODE_BYTES = 16;
const SESSION_TOKEN_BYTES = 32;
const EMAIL_LINK_TOKEN_BYTES = 32;

function hmac(value: string, pepper: string) {
  return createHmac("sha256", pepper).update(value, "utf8").digest("base64url");
}

export function assertPassportPepper(pepper: string) {
  if (Buffer.byteLength(pepper, "utf8") < 32) {
    throw new Error("Passport pepper must contain at least 32 bytes.");
  }
}

export function generateRecoveryCode() {
  const hex = randomBytes(RECOVERY_CODE_BYTES).toString("hex").toUpperCase();
  return `W1-${hex.match(/.{1,4}/gu)!.join("-")}`;
}

export function normalizeRecoveryCode(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]/gu, "");
}

export function recoveryCodeHash(code: string, salt: string, pepper: string) {
  return hmac(`recovery:v1:${salt}:${normalizeRecoveryCode(code)}`, pepper);
}

export function verifyRecoveryCode(code: string, salt: string, expectedHash: string, pepper: string) {
  const actual = Buffer.from(recoveryCodeHash(code, salt, pepper), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createRecoverySecret(accountId: string, version: number, nowMs: number, pepper: string) {
  const code = generateRecoveryCode();
  const salt = randomBytes(16).toString("base64url");
  return {
    code,
    record: {
      accountId,
      version,
      salt,
      codeHash: recoveryCodeHash(code, salt, pepper),
      createdAtMs: nowMs,
      usedAtMs: null,
    },
  };
}

export function createSessionToken(pepper: string) {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: sessionTokenHash(token, pepper) };
}

export function sessionTokenHash(token: string, pepper: string) {
  return hmac(`session:v1:${token}`, pepper);
}

export function normalizeEmailAddress(value: string) {
  const normalized = value.trim().toLocaleLowerCase("en-US");
  if (
    normalized.length < 3 ||
    normalized.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(normalized)
  ) {
    throw new Error("INVALID_EMAIL");
  }
  return normalized;
}

export function emailAddressKey(email: string, pepper: string) {
  return hmac(`email-identity:v1:${normalizeEmailAddress(email)}`, pepper);
}

export function createEmailLinkToken(pepper: string) {
  const token = randomBytes(EMAIL_LINK_TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: emailLinkTokenHash(token, pepper) };
}

export function emailLinkTokenHash(token: string, pepper: string) {
  return hmac(`email-link:v1:${token}`, pepper);
}

export function constantTimeFakeRecoveryCheck(code: string, pepper: string) {
  const salt = "unknown-account-salt";
  const expected = recoveryCodeHash("W1-0000-0000-0000-0000-0000-0000-0000-0000", salt, pepper);
  return verifyRecoveryCode(code, salt, expected, pepper);
}
