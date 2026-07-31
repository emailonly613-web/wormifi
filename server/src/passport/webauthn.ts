import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import type { PassportCredentialRecord, PassportWebAuthnAdapter } from "./types";

export interface WormifiWebAuthnConfig {
  rpId: string;
  expectedOrigin: string;
  rpName?: string;
}

export class WormifiWebAuthn implements PassportWebAuthnAdapter {
  readonly #rpName: string;

  constructor(private readonly config: WormifiWebAuthnConfig) {
    if (!/^[a-z0-9.-]+$/u.test(config.rpId) || config.rpId.includes(":")) {
      throw new Error("WebAuthn RP ID must be a bare domain.");
    }
    const origin = new URL(config.expectedOrigin);
    if (origin.protocol !== "https:" && origin.hostname !== "localhost") {
      throw new Error("WebAuthn requires an HTTPS origin outside localhost.");
    }
    if (origin.hostname !== config.rpId && !origin.hostname.endsWith(`.${config.rpId}`)) {
      throw new Error("WebAuthn RP ID must equal or parent the expected origin host.");
    }
    this.#rpName = config.rpName ?? "Wormifi Captain Passport";
  }

  createRegistrationOptions(accountId: string, excludeCredentialIds: string[] = []) {
    return generateRegistrationOptions({
      rpName: this.#rpName,
      rpID: this.config.rpId,
      userID: Buffer.from(accountId, "utf8"),
      userName: `captain-${accountId}`,
      userDisplayName: "Wormifi Captain",
      timeout: 120_000,
      attestationType: "none",
      excludeCredentials: excludeCredentialIds.map((id) => ({ id })),
      authenticatorSelection: {
        residentKey: "required",
        requireResidentKey: true,
        userVerification: "required",
      },
    });
  }

  async verifyRegistration(response: RegistrationResponseJSON, expectedChallenge: string) {
    const result = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.config.expectedOrigin,
      expectedRPID: this.config.rpId,
      requireUserPresence: true,
      requireUserVerification: true,
    });
    if (!result.verified) return { verified: false };

    const info = result.registrationInfo;
    return {
      verified: true,
      credential: {
        credentialId: info.credential.id,
        publicKeyBase64Url: Buffer.from(info.credential.publicKey).toString("base64url"),
        counter: info.credential.counter,
        transports: response.response.transports ?? info.credential.transports ?? [],
        deviceType: info.credentialDeviceType,
        backedUp: info.credentialBackedUp,
      },
    };
  }

  createAuthenticationOptions() {
    return generateAuthenticationOptions({
      rpID: this.config.rpId,
      timeout: 120_000,
      userVerification: "required",
    });
  }

  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    credential: PassportCredentialRecord,
  ) {
    const result = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.config.expectedOrigin,
      expectedRPID: this.config.rpId,
      requireUserVerification: true,
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKeyBase64Url, "base64url"),
        counter: credential.counter,
        transports: credential.transports,
      },
    });
    return {
      verified: result.verified,
      newCounter: result.authenticationInfo.newCounter,
      deviceType: result.authenticationInfo.credentialDeviceType,
      backedUp: result.authenticationInfo.credentialBackedUp,
    };
  }
}
