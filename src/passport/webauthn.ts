function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64Url(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function creationOptions(options: Record<string, unknown>): PublicKeyCredentialCreationOptions {
  const user = options.user as Record<string, unknown>;
  const excludeCredentials = Array.isArray(options.excludeCredentials)
    ? options.excludeCredentials.map((credential) => {
        const value = credential as Record<string, unknown>;
        return {
          ...value,
          id: base64UrlToBytes(String(value.id)),
        };
      })
    : undefined;
  return {
    ...options,
    challenge: base64UrlToBytes(String(options.challenge)),
    user: {
      ...user,
      id: base64UrlToBytes(String(user.id)),
    },
    excludeCredentials,
  } as unknown as PublicKeyCredentialCreationOptions;
}

function requestOptions(options: Record<string, unknown>): PublicKeyCredentialRequestOptions {
  const allowCredentials = Array.isArray(options.allowCredentials)
    ? options.allowCredentials.map((credential) => {
        const value = credential as Record<string, unknown>;
        return {
          ...value,
          id: base64UrlToBytes(String(value.id)),
        };
      })
    : undefined;
  return {
    ...options,
    challenge: base64UrlToBytes(String(options.challenge)),
    allowCredentials,
  } as unknown as PublicKeyCredentialRequestOptions;
}

export function passkeysSupported() {
  return typeof window !== "undefined" &&
    typeof window.PublicKeyCredential === "function" &&
    typeof navigator.credentials?.create === "function" &&
    typeof navigator.credentials?.get === "function";
}

export async function createPasskey(options: Record<string, unknown>) {
  if (!passkeysSupported()) throw new Error("PASSKEY_UNSUPPORTED");
  const created = await navigator.credentials.create({
    publicKey: creationOptions(options),
  });
  if (!(created instanceof PublicKeyCredential)) throw new Error("PASSKEY_CANCELLED");
  const response = created.response;
  if (!(response instanceof AuthenticatorAttestationResponse)) {
    throw new Error("PASSKEY_INVALID_RESPONSE");
  }
  return {
    id: created.id,
    rawId: bytesToBase64Url(created.rawId),
    response: {
      clientDataJSON: bytesToBase64Url(response.clientDataJSON),
      attestationObject: bytesToBase64Url(response.attestationObject),
      transports: typeof response.getTransports === "function" ? response.getTransports() : [],
      publicKeyAlgorithm: typeof response.getPublicKeyAlgorithm === "function"
        ? response.getPublicKeyAlgorithm()
        : undefined,
      publicKey: typeof response.getPublicKey === "function" && response.getPublicKey()
        ? bytesToBase64Url(response.getPublicKey()!)
        : undefined,
      authenticatorData: typeof response.getAuthenticatorData === "function"
        ? bytesToBase64Url(response.getAuthenticatorData())
        : undefined,
    },
    type: created.type,
    clientExtensionResults: created.getClientExtensionResults(),
    authenticatorAttachment: created.authenticatorAttachment,
  };
}

export async function getPasskey(options: Record<string, unknown>) {
  if (!passkeysSupported()) throw new Error("PASSKEY_UNSUPPORTED");
  const received = await navigator.credentials.get({
    publicKey: requestOptions(options),
  });
  if (!(received instanceof PublicKeyCredential)) throw new Error("PASSKEY_CANCELLED");
  const response = received.response;
  if (!(response instanceof AuthenticatorAssertionResponse)) {
    throw new Error("PASSKEY_INVALID_RESPONSE");
  }
  return {
    id: received.id,
    rawId: bytesToBase64Url(received.rawId),
    response: {
      clientDataJSON: bytesToBase64Url(response.clientDataJSON),
      authenticatorData: bytesToBase64Url(response.authenticatorData),
      signature: bytesToBase64Url(response.signature),
      userHandle: response.userHandle ? bytesToBase64Url(response.userHandle) : undefined,
    },
    type: received.type,
    clientExtensionResults: received.getClientExtensionResults(),
    authenticatorAttachment: received.authenticatorAttachment,
  };
}
