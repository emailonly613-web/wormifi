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
  | "email_authenticated"
  | "passkey_added"
  | "passkey_authenticated"
  | "progress_awarded"
  | "entitlement_recorded"
  | "recovery_completed"
  | "session_revoked";

export type CaptainEntitlementProductId =
  | "captain-club-monthly-v1"
  | "legend-voyage-lifetime-v1";
export type CaptainEntitlementEventAction =
  | "grant"
  | "renew"
  | "cancel_at_period_end"
  | "reverse"
  | "correct";
export type CaptainEntitlementEventSource =
  | "local_test"
  | "operator_correction"
  | "payment_provider";

export interface CaptainEntitlementEventRecord {
  eventId: string;
  accountId: string;
  productId: CaptainEntitlementProductId;
  action: CaptainEntitlementEventAction;
  source: CaptainEntitlementEventSource;
  occurredAtMs: number;
  paidThroughMs: number | null;
  reversesEventId: string | null;
  externalReferenceHash: string | null;
  idempotencyKey: string;
}

export interface CaptainEntitlementState {
  productId: CaptainEntitlementProductId;
  relationship: "access_while_active" | "permanent_ownership";
  active: boolean;
  permanent: boolean;
  paidThroughMs: number | null;
  cancelAtPeriodEnd: boolean;
  lastEventAtMs: number | null;
  history: CaptainEntitlementEventRecord[];
}

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

/**
 * A keyed digest of the normalized address is the durable lookup key. Wormifi
 * never needs the raw address after the one request that delivers a link.
 */
export interface PassportEmailIdentityRecord {
  emailKey: string;
  accountId: string;
  createdAtMs: number;
  verifiedAtMs: number;
}

export interface PassportEmailLinkRecord {
  linkId: string;
  emailKey: string;
  accountId: string | null;
  tokenHash: string;
  createdAtMs: number;
  expiresAtMs: number;
  consumedAtMs: number | null;
}

export interface CaptainProgressionRecord {
  accountId: string;
  xp: number;
  completedRuns: number;
  totalScore: number;
  lastAwardXp: number;
  updatedAtMs: number;
}

export interface AuthoritativeLifeAward {
  accountId: string;
  idempotencyKey: string;
  roomId: string;
  lifeId: string;
  finalScore: number;
  kills: number;
  rank: number;
  peakMass: number;
  rulesetVersion: string;
  formulaVersion: string;
  xpDelta: number;
  occurredAtMs: number;
}

export interface CaptainLogEventRecord {
  eventId: string;
  accountId: string;
  type: CaptainLogEventType;
  occurredAtMs: number;
  detail: Readonly<Record<string, string | number | boolean>>;
  idempotencyKey?: string;
}

export interface EmailLinkDelivery {
  sendSignInLink(input: {
    email: string;
    completionUrl: string;
    expiresAtMs: number;
  }): Promise<void>;
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
