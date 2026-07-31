import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  CredentialDeviceType,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

export type PassportChallengePurpose = "enrollment" | "passkey_addition" | "authentication";
export type CaptainLogEventType =
  | "account_created"
  | "passkey_added"
  | "passkey_authenticated"
  | "recovery_completed"
  | "session_revoked";

export interface PassportAccountRecord {
  accountId: string;
  createdAtMs: number;
}

export interface PassportCredentialRecord {
  credentialId: string;
  accountId: string;
  publicKeyBase64Url: string;
  counter: number;
  transports: AuthenticatorTransportFuture[];
  deviceType: CredentialDeviceType;
  backedUp: boolean;
  createdAtMs: number;
  lastUsedAtMs: number | null;
  revokedAtMs: number | null;
}

export interface PassportChallengeRecord {
  ceremonyId: string;
  purpose: PassportChallengePurpose;
  accountId: string | null;
  expectedChallenge: string;
  createdAtMs: number;
  expiresAtMs: number;
  consumedAtMs: number | null;
}

export interface PassportSessionRecord {
  sessionId: string;
  accountId: string;
  tokenHash: string;
  deviceLabel: string;
  createdAtMs: number;
  lastUsedAtMs: number;
  expiresAtMs: number;
  revokedAtMs: number | null;
}

export interface PassportRecoveryRecord {
  accountId: string;
  version: number;
  salt: string;
  codeHash: string;
  createdAtMs: number;
  usedAtMs: number | null;
}

export interface CaptainLogEventRecord {
  eventId: string;
  accountId: string;
  type: CaptainLogEventType;
  occurredAtMs: number;
  detail: Readonly<Record<string, string | number | boolean>>;
}

export interface RegistrationVerification {
  verified: boolean;
  credential?: Omit<PassportCredentialRecord, "accountId" | "createdAtMs" | "lastUsedAtMs" | "revokedAtMs">;
}

export interface AuthenticationVerification {
  verified: boolean;
  newCounter?: number;
  deviceType?: CredentialDeviceType;
  backedUp?: boolean;
}

export interface PassportWebAuthnAdapter {
  createRegistrationOptions(
    accountId: string,
    excludeCredentialIds?: string[],
  ): Promise<PublicKeyCredentialCreationOptionsJSON>;
  verifyRegistration(
    response: RegistrationResponseJSON,
    expectedChallenge: string,
  ): Promise<RegistrationVerification>;
  createAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON>;
  verifyAuthentication(
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    credential: PassportCredentialRecord,
  ): Promise<AuthenticationVerification>;
}

export type { AuthenticationResponseJSON, RegistrationResponseJSON };
