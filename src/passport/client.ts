export interface PassportProgression {
  accountId: string;
  xp: number;
  completedRuns: number;
  totalScore: number;
  lastAwardXp: number;
  updatedAtMs: number;
}

export interface PassportProfile {
  accountId: string;
  sessionId: string;
  progression: PassportProgression;
  entitlements: PassportEntitlementState[];
  passkeyCount: number;
}

export interface PassportEntitlementHistoryEntry {
  eventId: string;
  productId: "captain-club-monthly-v1" | "legend-voyage-lifetime-v1";
  action: "grant" | "renew" | "cancel_at_period_end" | "reverse" | "correct";
  source: "local_test" | "operator_correction" | "payment_provider";
  occurredAtMs: number;
  paidThroughMs: number | null;
  reversesEventId: string | null;
}

export interface PassportEntitlementState {
  productId: PassportEntitlementHistoryEntry["productId"];
  relationship: "access_while_active" | "permanent_ownership";
  active: boolean;
  permanent: boolean;
  paidThroughMs: number | null;
  cancelAtPeriodEnd: boolean;
  lastEventAtMs: number | null;
  history: PassportEntitlementHistoryEntry[];
}

export interface PassportSessionView {
  sessionId: string;
  deviceLabel: string;
  createdAtMs: number;
  lastUsedAtMs: number;
  expiresAtMs: number;
  revokedAtMs: number | null;
  current: boolean;
}

export interface PassportCapabilities {
  guestPlayRequired: false;
  passkeys: boolean;
  emailLinks: boolean;
  passwords: false;
  payments: false;
}

interface AuthenticatedResponse {
  ok: true;
  created: boolean;
  recoveryCode?: string;
  profile: PassportProfile;
}

export class PassportApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

function configuredPassportApiUrl() {
  const configured = import.meta.env.VITE_PASSPORT_API_URL?.trim();
  if (import.meta.env.DEV) {
    const developmentOverride = new URLSearchParams(window.location.search).get("passport_api")?.trim();
    if (developmentOverride?.startsWith("http://") || developmentOverride?.startsWith("https://")) {
      return developmentOverride.replace(/\/$/u, "");
    }
  }
  if (configured) return configured.replace(/\/$/u, "");
  if (import.meta.env.DEV) return "http://127.0.0.1:8080/passport/v1";
  return `${window.location.origin}/passport/v1`;
}

function browserDeviceLabel() {
  const navigatorWithHints = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = navigatorWithHints.userAgentData?.platform || navigator.platform || "Browser";
  const touch = navigator.maxTouchPoints > 0 ? " touch" : "";
  return `${platform}${touch}`.slice(0, 60);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${configuredPassportApiUrl()}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers,
    },
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new PassportApiError("PASSPORT_UNAVAILABLE", response.status);
  }
  if (!response.ok) {
    const code = typeof body === "object" && body !== null && "code" in body
      ? String(body.code)
      : "PASSPORT_UNAVAILABLE";
    throw new PassportApiError(code, response.status);
  }
  return body as T;
}

function post<T>(path: string, body: Record<string, unknown> = {}) {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export const captainPassportClient = {
  async capabilities() {
    const result = await request<{ ok: true } & PassportCapabilities>("/capabilities");
    return result;
  },

  async session() {
    const result = await request<{ ok: true; profile: PassportProfile }>("/session");
    return result.profile;
  },

  async enrollPasskey() {
    const started = await post<{
      ok: true;
      ceremonyId: string;
      options: Record<string, unknown>;
    }>("/enrollment/start");
    const { createPasskey } = await import("./webauthn");
    const response = await createPasskey(started.options);
    return post<AuthenticatedResponse>("/enrollment/finish", {
      ceremonyId: started.ceremonyId,
      response,
      deviceLabel: browserDeviceLabel(),
    });
  },

  async signInWithPasskey() {
    const started = await post<{
      ok: true;
      ceremonyId: string;
      options: Record<string, unknown>;
    }>("/authentication/start");
    const { getPasskey } = await import("./webauthn");
    const response = await getPasskey(started.options);
    return post<AuthenticatedResponse>("/authentication/finish", {
      ceremonyId: started.ceremonyId,
      response,
      deviceLabel: browserDeviceLabel(),
    });
  },

  async addPasskey() {
    const started = await post<{
      ok: true;
      ceremonyId: string;
      options: Record<string, unknown>;
    }>("/passkeys/start");
    const { createPasskey } = await import("./webauthn");
    const response = await createPasskey(started.options);
    await post("/passkeys/finish", {
      ceremonyId: started.ceremonyId,
      response,
    });
    return this.session();
  },

  async sendEmailLink(email: string) {
    await post("/email/start", { email });
  },

  async completeEmailLink(token: string) {
    return post<AuthenticatedResponse>("/email/complete", {
      token,
      deviceLabel: browserDeviceLabel(),
    });
  },

  async recover(accountId: string, recoveryCode: string) {
    const result = await post<AuthenticatedResponse>("/recovery", {
      accountId,
      recoveryCode,
      deviceLabel: browserDeviceLabel(),
    });
    return result;
  },

  async sessions() {
    const result = await request<{ ok: true; sessions: PassportSessionView[] }>("/sessions");
    return result.sessions;
  },

  async revokeSession(sessionId: string) {
    await request(`/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
  },

  async logout() {
    await post("/logout");
  },
};

export function emailLinkTokenFromLocation() {
  const prefix = "#passport-email=";
  if (!window.location.hash.startsWith(prefix)) return undefined;
  try {
    return decodeURIComponent(window.location.hash.slice(prefix.length));
  } catch {
    return undefined;
  }
}

export function clearEmailLinkFromLocation() {
  if (!window.location.hash.startsWith("#passport-email=")) return;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}
