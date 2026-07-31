import type { IncomingMessage, ServerResponse } from "node:http";

import { CaptainPassportService, PassportError } from "./service";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "./types";

const DEFAULT_BASE_PATH = "/passport/v1";
const DEFAULT_COOKIE_NAME = "wormifi_passport";
const MAX_BODY_BYTES = 16 * 1024;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

interface JsonObject {
  [key: string]: unknown;
}

export interface PassportHttpApiOptions {
  service: CaptainPassportService;
  allowedOrigins: readonly string[];
  emailEnabled?: boolean;
  basePath?: string;
  cookieName?: string;
  secureCookies?: boolean;
  trustProxy?: boolean;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(body: JsonObject, key: string, maximum = 4_096) {
  const value = body[key];
  return typeof value === "string" && value.length <= maximum ? value : undefined;
}

function cookieValue(header: string | undefined, name: string) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function deviceLabel(request: IncomingMessage, supplied: unknown) {
  if (typeof supplied === "string" && supplied.trim()) return supplied;
  const userAgent = request.headers["user-agent"];
  return typeof userAgent === "string" ? userAgent.slice(0, 60) : "Browser";
}

export class PassportHttpApi {
  readonly #service: CaptainPassportService;
  readonly #allowedOrigins: ReadonlySet<string>;
  readonly #emailEnabled: boolean;
  readonly #basePath: string;
  readonly #cookieName: string;
  readonly #secureCookies: boolean;
  readonly #trustProxy: boolean;

  constructor(options: PassportHttpApiOptions) {
    this.#service = options.service;
    this.#allowedOrigins = new Set(options.allowedOrigins.map((origin) => {
      const parsed = new URL(origin);
      if (parsed.origin !== origin || (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1")) {
        throw new Error(`Passport origin must be exact HTTPS or loopback: ${origin}`);
      }
      return origin;
    }));
    this.#emailEnabled = options.emailEnabled === true;
    this.#basePath = options.basePath ?? DEFAULT_BASE_PATH;
    this.#cookieName = options.cookieName ?? DEFAULT_COOKIE_NAME;
    this.#secureCookies = options.secureCookies ?? true;
    this.#trustProxy = options.trustProxy === true;
  }

  async handle(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    const url = new URL(request.url ?? "/", "http://passport.invalid");
    if (!url.pathname.startsWith(`${this.#basePath}/`) && url.pathname !== this.#basePath) {
      return false;
    }

    this.#securityHeaders(response);
    const origin = typeof request.headers.origin === "string" ? request.headers.origin : undefined;
    if (origin && this.#allowedOrigins.has(origin)) {
      response.setHeader("access-control-allow-origin", origin);
      response.setHeader("access-control-allow-credentials", "true");
      response.setHeader("vary", "Origin");
    }
    if (request.method === "OPTIONS") {
      if (!origin || !this.#allowedOrigins.has(origin)) {
        this.#json(response, 403, { ok: false, code: "ORIGIN_REJECTED" });
        return true;
      }
      response.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
      response.setHeader("access-control-allow-headers", "content-type");
      response.setHeader("access-control-max-age", "600");
      response.writeHead(204);
      response.end();
      return true;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      if (!origin || !this.#allowedOrigins.has(origin)) {
        this.#json(response, 403, { ok: false, code: "ORIGIN_REJECTED" });
        return true;
      }
    }

    const path = url.pathname.slice(this.#basePath.length) || "/";
    try {
      if (request.method === "GET" && path === "/capabilities") {
        this.#json(response, 200, {
          ok: true,
          guestPlayRequired: false,
          passkeys: true,
          emailLinks: this.#emailEnabled,
          passwords: false,
          payments: false,
        });
        return true;
      }
      if (request.method === "GET" && path === "/session") {
        const token = this.#requiredSessionToken(request);
        this.#json(response, 200, { ok: true, profile: this.#service.sessionProfile(token) });
        return true;
      }
      if (request.method === "GET" && path === "/sessions") {
        const token = this.#requiredSessionToken(request);
        this.#json(response, 200, { ok: true, sessions: this.#service.listSessions(token) });
        return true;
      }
      if (request.method === "GET" && path === "/log") {
        const token = this.#requiredSessionToken(request);
        this.#json(response, 200, { ok: true, events: this.#service.listCaptainLog(token) });
        return true;
      }
      if (request.method === "DELETE" && path.startsWith("/sessions/")) {
        const token = this.#requiredSessionToken(request);
        const sessionId = decodeURIComponent(path.slice("/sessions/".length));
        const currentSessionId = this.#sessionId(token);
        const revoked = this.#service.revokeSession(token, sessionId);
        if (revoked && currentSessionId === sessionId) this.#clearCookie(response);
        this.#json(response, 200, { ok: true, revoked });
        return true;
      }

      const body = await this.#readJson(request);
      if (request.method === "POST" && path === "/enrollment/start") {
        const started = await this.#service.startEnrollment();
        this.#json(response, 200, { ok: true, ...started });
        return true;
      }
      if (request.method === "POST" && path === "/enrollment/finish") {
        const ceremonyId = stringField(body, "ceremonyId", 256);
        if (!ceremonyId || !isObject(body.response)) return this.#badRequest(response);
        const finished = await this.#service.finishEnrollment({
          ceremonyId,
          response: body.response as unknown as RegistrationResponseJSON,
          deviceLabel: deviceLabel(request, body.deviceLabel),
        });
        this.#setCookie(response, finished.sessionToken);
        this.#json(response, 200, {
          ok: true,
          created: true,
          recoveryCode: finished.recoveryCode,
          profile: this.#service.sessionProfile(finished.sessionToken),
        });
        return true;
      }
      if (request.method === "POST" && path === "/authentication/start") {
        const started = await this.#service.startAuthentication();
        this.#json(response, 200, { ok: true, ...started });
        return true;
      }
      if (request.method === "POST" && path === "/authentication/finish") {
        const ceremonyId = stringField(body, "ceremonyId", 256);
        if (!ceremonyId || !isObject(body.response)) return this.#badRequest(response);
        const finished = await this.#service.finishAuthentication({
          ceremonyId,
          response: body.response as unknown as AuthenticationResponseJSON,
          deviceLabel: deviceLabel(request, body.deviceLabel),
        });
        this.#setCookie(response, finished.sessionToken);
        this.#json(response, 200, {
          ok: true,
          created: false,
          profile: this.#service.sessionProfile(finished.sessionToken),
        });
        return true;
      }
      if (request.method === "POST" && path === "/passkeys/start") {
        const token = this.#requiredSessionToken(request);
        const started = await this.#service.startPasskeyAddition(token);
        this.#json(response, 200, { ok: true, ...started });
        return true;
      }
      if (request.method === "POST" && path === "/passkeys/finish") {
        const token = this.#requiredSessionToken(request);
        const ceremonyId = stringField(body, "ceremonyId", 256);
        if (!ceremonyId || !isObject(body.response)) return this.#badRequest(response);
        const added = await this.#service.finishPasskeyAddition({
          ceremonyId,
          response: body.response as unknown as RegistrationResponseJSON,
          authToken: token,
        });
        this.#json(response, 200, { ok: true, ...added });
        return true;
      }
      if (request.method === "POST" && path === "/email/start") {
        if (!this.#emailEnabled) throw new PassportError("EMAIL_UNAVAILABLE");
        const email = stringField(body, "email", 254);
        if (!email) return this.#badRequest(response);
        const token = this.#sessionToken(request);
        try {
          await this.#service.startEmailAuthentication({
            email,
            ipKey: this.#ipKey(request),
            authToken: token,
          });
        } catch (error) {
          if (error instanceof PassportError && error.code === "AUTHENTICATION_FAILED") {
            // Same response and status as a delivered link. This protects
            // address/account association from an authenticated probing client.
            this.#json(response, 202, { ok: true, accepted: true });
            return true;
          }
          throw error;
        }
        this.#json(response, 202, { ok: true, accepted: true });
        return true;
      }
      if (request.method === "POST" && path === "/email/complete") {
        const token = stringField(body, "token", 512);
        if (!token) return this.#badRequest(response);
        const finished = this.#service.completeEmailAuthentication({
          token,
          deviceLabel: deviceLabel(request, body.deviceLabel),
        });
        this.#setCookie(response, finished.sessionToken);
        this.#json(response, 200, {
          ok: true,
          created: finished.created,
          recoveryCode: finished.recoveryCode,
          profile: this.#service.sessionProfile(finished.sessionToken),
        });
        return true;
      }
      if (request.method === "POST" && path === "/recovery") {
        const accountId = stringField(body, "accountId", 64);
        const recoveryCode = stringField(body, "recoveryCode", 128);
        if (!accountId || !recoveryCode) return this.#badRequest(response);
        const recovered = this.#service.recover({
          accountId,
          recoveryCode,
          ipKey: this.#ipKey(request),
          deviceLabel: deviceLabel(request, body.deviceLabel),
        });
        this.#setCookie(response, recovered.sessionToken);
        this.#json(response, 200, {
          ok: true,
          recoveryCode: recovered.recoveryCode,
          profile: this.#service.sessionProfile(recovered.sessionToken),
        });
        return true;
      }
      if (request.method === "POST" && path === "/logout") {
        const token = this.#requiredSessionToken(request);
        const sessionId = this.#service.authenticateSession(token).sessionId;
        this.#service.revokeSession(token, sessionId);
        this.#clearCookie(response);
        this.#json(response, 200, { ok: true });
        return true;
      }
      this.#json(response, 404, { ok: false, code: "NOT_FOUND" });
      return true;
    } catch (error) {
      this.#handleError(response, error);
      return true;
    }
  }

  authenticateRequest(request: IncomingMessage) {
    const token = this.#sessionToken(request);
    if (!token) return undefined;
    try {
      return this.#service.authenticateSession(token);
    } catch {
      return undefined;
    }
  }

  awardAuthoritativeLife(input: Parameters<CaptainPassportService["awardAuthoritativeLife"]>[0]) {
    return this.#service.awardAuthoritativeLife(input);
  }

  #sessionId(token: string) {
    return this.#service.authenticateSession(token).sessionId;
  }

  #sessionToken(request: IncomingMessage) {
    return cookieValue(request.headers.cookie, this.#cookieName);
  }

  #requiredSessionToken(request: IncomingMessage) {
    const token = this.#sessionToken(request);
    if (!token) throw new PassportError("INVALID_SESSION");
    return token;
  }

  #ipKey(request: IncomingMessage) {
    if (this.#trustProxy) {
      const forwarded = request.headers["x-forwarded-for"];
      const first = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
      if (first?.trim()) return first.trim().slice(0, 64);
    }
    return request.socket.remoteAddress?.slice(0, 64) ?? "unknown";
  }

  async #readJson(request: IncomingMessage): Promise<JsonObject> {
    const contentType = request.headers["content-type"]?.split(";")[0]?.trim();
    if (contentType !== "application/json") throw new HttpBodyError(415, "JSON_REQUIRED");
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.byteLength;
      if (size > MAX_BODY_BYTES) throw new HttpBodyError(413, "BODY_TOO_LARGE");
      chunks.push(buffer);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    } catch {
      throw new HttpBodyError(400, "BAD_JSON");
    }
    if (!isObject(parsed)) throw new HttpBodyError(400, "BAD_JSON");
    return parsed;
  }

  #setCookie(response: ServerResponse, token: string) {
    const parts = [
      `${this.#cookieName}=${encodeURIComponent(token)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    ];
    if (this.#secureCookies) parts.push("Secure");
    response.setHeader("set-cookie", parts.join("; "));
  }

  #clearCookie(response: ServerResponse) {
    const parts = [
      `${this.#cookieName}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0",
    ];
    if (this.#secureCookies) parts.push("Secure");
    response.setHeader("set-cookie", parts.join("; "));
  }

  #securityHeaders(response: ServerResponse) {
    response.setHeader("cache-control", "no-store");
    response.setHeader("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
    response.setHeader("referrer-policy", "no-referrer");
    response.setHeader("x-content-type-options", "nosniff");
  }

  #badRequest(response: ServerResponse): true {
    this.#json(response, 400, { ok: false, code: "BAD_REQUEST" });
    return true;
  }

  #handleError(response: ServerResponse, error: unknown) {
    if (error instanceof HttpBodyError) {
      this.#json(response, error.status, { ok: false, code: error.code });
      return;
    }
    if (error instanceof PassportError) {
      const status = error.code === "INVALID_SESSION"
        ? 401
        : error.code === "RATE_LIMITED"
          ? 429
          : error.code === "EMAIL_UNAVAILABLE"
            ? 503
            : 400;
      const code = error.code === "INVALID_CEREMONY" || error.code === "AUTHENTICATION_FAILED"
        ? "AUTHENTICATION_FAILED"
        : error.code;
      this.#json(response, status, { ok: false, code });
      return;
    }
    this.#json(response, 500, { ok: false, code: "INTERNAL_ERROR" });
  }

  #json(response: ServerResponse, status: number, body: JsonObject) {
    response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
    response.end(`${JSON.stringify(body)}\n`);
  }
}

class HttpBodyError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}
