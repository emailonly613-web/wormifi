import { useEffect, useMemo, useRef, useState } from "react";

import type { CaptainProgression } from "../game/captainProgression";
import {
  captainPassportClient,
  clearEmailLinkFromLocation,
  emailLinkTokenFromLocation,
  PassportApiError,
  type PassportCapabilities,
  type PassportProfile,
  type PassportSessionView,
} from "../passport/client";
import { passkeysSupported } from "../passport/webauthn";

type PassportView = "home" | "email" | "recovery" | "sessions";

interface CaptainPassportProps {
  open: boolean;
  localProgression: CaptainProgression;
  profile: PassportProfile | null;
  onProfileChange: (profile: PassportProfile | null) => void;
  onClose: () => void;
}

function errorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "The passkey prompt was cancelled. Your guest game is unchanged.";
  }
  if (error instanceof PassportApiError) {
    switch (error.code) {
      case "EMAIL_UNAVAILABLE":
        return "Email delivery is not connected in this local beta yet. Use a passkey or keep playing as a guest.";
      case "INVALID_EMAIL":
        return "Enter a complete email address.";
      case "RATE_LIMITED":
        return "Too many attempts. Wait fifteen minutes and try again.";
      case "AUTHENTICATION_FAILED":
        return "That sign-in or recovery link is invalid, expired, or already used.";
      case "INVALID_SESSION":
        return "This session has ended. Sign in again or continue as a guest.";
      default:
        return "Captain Passport is unavailable right now. Guest play still works.";
    }
  }
  if (error instanceof Error && error.message === "PASSKEY_UNSUPPORTED") {
    return "This browser cannot use passkeys. Email-link sign-in or guest play remains available.";
  }
  return "Captain Passport is unavailable right now. Guest play still works.";
}

function shortAccountId(accountId: string) {
  return accountId.slice(0, 8).toUpperCase();
}

function timeLabel(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

export function CaptainPassport({
  open,
  localProgression,
  profile,
  onProfileChange,
  onClose,
}: CaptainPassportProps) {
  const [view, setView] = useState<PassportView>("home");
  const [capabilities, setCapabilities] = useState<PassportCapabilities | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [accountId, setAccountId] = useState("");
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");
  const [newRecoveryCode, setNewRecoveryCode] = useState("");
  const [sessions, setSessions] = useState<PassportSessionView[]>([]);
  const emailTokenHandled = useRef<string | null>(null);
  const canUsePasskeys = useMemo(passkeysSupported, []);

  useEffect(() => {
    let active = true;
    void captainPassportClient.capabilities()
      .then((result) => {
        if (!active) return;
        setCapabilities(result);
        setAvailable(true);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    void captainPassportClient.session()
      .then((sessionProfile) => {
        if (!active) return;
        setAvailable(true);
        onProfileChange(sessionProfile);
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof PassportApiError && error.code === "INVALID_SESSION") {
          onProfileChange(null);
        }
      });
    return () => {
      active = false;
    };
  }, [onProfileChange]);

  useEffect(() => {
    const completeEmailLinkFromLocation = () => {
      const token = emailLinkTokenFromLocation();
      if (!token || emailTokenHandled.current === token) return;
      emailTokenHandled.current = token;
      setBusy(true);
      setMessage("Verifying your secure email link…");
      void captainPassportClient.completeEmailLink(token)
        .then((result) => {
          clearEmailLinkFromLocation();
          onProfileChange(result.profile);
          setNewRecoveryCode(result.recoveryCode ?? "");
          setAvailable(true);
          setMessage(result.created
            ? "Captain Passport created. Live-room progress will now save to this account."
            : "Welcome back. Your saved Captain Passport is connected.");
          setView("home");
        })
        .catch((error) => {
          clearEmailLinkFromLocation();
          setMessage(errorMessage(error));
        })
        .finally(() => setBusy(false));
    };

    completeEmailLinkFromLocation();
    window.addEventListener("hashchange", completeEmailLinkFromLocation);
    return () => window.removeEventListener("hashchange", completeEmailLinkFromLocation);
  }, [onProfileChange]);

  useEffect(() => {
    if (!open) {
      setView("home");
      setMessage("");
    }
  }, [open]);

  if (!open) return null;

  const completeAuthentication = (
    operation: () => Promise<{
      profile: PassportProfile;
      recoveryCode?: string;
      created?: boolean;
    }>,
    success: string,
  ) => {
    setBusy(true);
    setMessage("");
    void operation()
      .then((result) => {
        onProfileChange(result.profile);
        setNewRecoveryCode(result.recoveryCode ?? "");
        setAvailable(true);
        setView("home");
        setMessage(success);
      })
      .catch((error) => setMessage(errorMessage(error)))
      .finally(() => setBusy(false));
  };

  const loadSessions = () => {
    setBusy(true);
    setMessage("");
    void captainPassportClient.sessions()
      .then((result) => {
        setSessions(result);
        setView("sessions");
      })
      .catch((error) => setMessage(errorMessage(error)))
      .finally(() => setBusy(false));
  };

  return (
    <section
      className="passport-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="passport-title"
      data-testid="captain-passport"
    >
      <div className="passport-panel">
        <header className="passport-header">
          <div>
            <small>OPTIONAL · PASSWORDLESS · NO PAYMENT</small>
            <h2 id="passport-title">{profile ? "CAPTAIN PASSPORT" : "SAVE YOUR CAPTAIN"}</h2>
            <p>{profile
              ? "Your verified live-room progress can return on another device."
              : "Play stays instant. Save only after your Captain is worth keeping."}</p>
          </div>
          {!newRecoveryCode && (
            <button type="button" aria-label="Close Captain Passport" onClick={onClose}>×</button>
          )}
        </header>

        <div className="passport-trust-row" aria-label="Captain Passport promises">
          <span>NO SIGN-UP TO PLAY</span>
          <span>NO PASSWORD</span>
          <span>NO MARKETING OPT-IN</span>
          <span>NO PAY-TO-WIN</span>
        </div>

        {newRecoveryCode ? (
          <section className="passport-recovery-reveal" data-testid="passport-recovery-reveal">
            <small>SHOWS ONCE</small>
            <h3>SAVE YOUR RECOVERY CODE</h3>
            <p>If every passkey and email route is lost, this code is the final way back. Wormifi stores only its hash.</p>
            <code>{newRecoveryCode}</code>
            <button
              type="button"
              onClick={() => {
                setNewRecoveryCode("");
                onClose();
              }}
            >
              I SAVED IT
            </button>
          </section>
        ) : profile ? (
          <>
            <section className="passport-saved-card" data-testid="passport-saved-profile">
              <div>
                <small>PASSPORT {shortAccountId(profile.accountId)}</small>
                <strong>{profile.progression.xp.toLocaleString()} VERIFIED XP</strong>
                <span>{profile.progression.completedRuns.toLocaleString()} saved live run{profile.progression.completedRuns === 1 ? "" : "s"}</span>
              </div>
              <b>CONNECTED</b>
            </section>
            <p className="passport-boundary-note">
              Only server-authored live-room results enter verified XP. Existing browser preview XP stays on this device and is never promoted into trusted progress.
            </p>
            <section className="passport-entitlements" data-testid="passport-entitlements">
              <div>
                <small>CAPTAIN LOG · COSMETICS ONLY</small>
                <strong>{profile.entitlements.some((entitlement) => entitlement.active)
                  ? "OWNERSHIP RESTORED"
                  : "NO PAID ITEMS"}</strong>
              </div>
              <span>{profile.entitlements.some((entitlement) => entitlement.active)
                ? profile.entitlements
                  .filter((entitlement) => entitlement.active)
                  .map((entitlement) =>
                    entitlement.productId === "captain-club-monthly-v1"
                      ? `Captain Club${entitlement.cancelAtPeriodEnd ? " · ends at paid-through date" : ""}`
                      : "Legend Voyage · owned permanently"
                  )
                  .join(" · ")
                : "The append-only entitlement ledger is empty. Browser links and redirects cannot unlock anything."}</span>
            </section>
            {view === "sessions" ? (
              <section className="passport-session-list">
                <div className="passport-section-heading">
                  <h3>ACTIVE DEVICES</h3>
                  <button type="button" onClick={() => setView("home")}>BACK</button>
                </div>
                {sessions.map((session) => (
                  <article key={session.sessionId} data-current={session.current ? "true" : "false"}>
                    <div>
                      <b>{session.deviceLabel}</b>
                      <span>{session.current ? "This device" : `Last used ${timeLabel(session.lastUsedAtMs)}`}</span>
                    </div>
                    {session.revokedAtMs === null ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setBusy(true);
                          void captainPassportClient.revokeSession(session.sessionId)
                            .then(() => {
                              if (session.current) {
                                onProfileChange(null);
                                onClose();
                                return;
                              }
                              setSessions((current) => current.map((entry) =>
                                entry.sessionId === session.sessionId
                                  ? { ...entry, revokedAtMs: Date.now() }
                                  : entry
                              ));
                            })
                            .catch((error) => setMessage(errorMessage(error)))
                            .finally(() => setBusy(false));
                        }}
                      >
                        REVOKE
                      </button>
                    ) : <em>REVOKED</em>}
                  </article>
                ))}
              </section>
            ) : view === "email" ? (
              <EmailLinkForm
                email={email}
                setEmail={setEmail}
                busy={busy}
                onBack={() => setView("home")}
                onSubmit={() => {
                  setBusy(true);
                  setMessage("");
                  void captainPassportClient.sendEmailLink(email)
                    .then(() => setMessage("If the address can be used, a one-time sign-in link is on its way."))
                    .catch((error) => setMessage(errorMessage(error)))
                    .finally(() => setBusy(false));
                }}
              />
            ) : (
              <div className="passport-actions">
                <button
                  type="button"
                  disabled={busy || !canUsePasskeys}
                  data-testid="passport-add-passkey"
                  onClick={() => {
                    setBusy(true);
                    setMessage("");
                    void captainPassportClient.addPasskey()
                      .then((nextProfile) => {
                        onProfileChange(nextProfile);
                        setMessage("A new passkey is now attached to this Captain Passport.");
                      })
                      .catch((error) => setMessage(errorMessage(error)))
                      .finally(() => setBusy(false));
                  }}
                >
                  <b>ADD A PASSKEY</b>
                  <span>{profile.passkeyCount > 0 ? `${profile.passkeyCount} already connected` : "Best cross-device protection"}</span>
                </button>
                <button
                  type="button"
                  disabled={busy || capabilities?.emailLinks === false}
                  data-testid="passport-add-email"
                  onClick={() => setView("email")}
                >
                  <b>ADD EMAIL-LINK SIGN-IN</b>
                  <span>Optional · never automatic marketing</span>
                </button>
                <button type="button" disabled={busy} onClick={loadSessions}>
                  <b>MANAGE DEVICES</b>
                  <span>See and revoke active sessions</span>
                </button>
                <button
                  type="button"
                  className="passport-secondary-action"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void captainPassportClient.logout()
                      .then(() => {
                        onProfileChange(null);
                        onClose();
                      })
                      .catch((error) => setMessage(errorMessage(error)))
                      .finally(() => setBusy(false));
                  }}
                >
                  SIGN OUT
                </button>
              </div>
            )}
          </>
        ) : view === "email" ? (
          <EmailLinkForm
            email={email}
            setEmail={setEmail}
            busy={busy}
            onBack={() => setView("home")}
            onSubmit={() => {
              setBusy(true);
              setMessage("");
              void captainPassportClient.sendEmailLink(email)
                .then(() => setMessage("If the address can be used, a one-time sign-in link is on its way."))
                .catch((error) => setMessage(errorMessage(error)))
                .finally(() => setBusy(false));
            }}
          />
        ) : view === "recovery" ? (
          <form
            className="passport-form"
            onSubmit={(event) => {
              event.preventDefault();
              completeAuthentication(
                () => captainPassportClient.recover(accountId, recoveryCodeInput),
                "Recovery complete. Old sessions and passkeys were revoked.",
              );
            }}
          >
            <label>
              <span>PASSPORT ID</span>
              <input value={accountId} onChange={(event) => setAccountId(event.target.value.trim())} autoComplete="username" required />
            </label>
            <label>
              <span>RECOVERY CODE</span>
              <input value={recoveryCodeInput} onChange={(event) => setRecoveryCodeInput(event.target.value)} autoComplete="off" required />
            </label>
            <div>
              <button type="submit" disabled={busy}>RECOVER PASSPORT</button>
              <button type="button" onClick={() => setView("home")}>BACK</button>
            </div>
          </form>
        ) : (
          <>
            <section className="passport-device-preview">
              <small>THIS DEVICE CURRENTLY HAS</small>
              <strong>{localProgression.xp.toLocaleString()} PREVIEW XP</strong>
              <span>{localProgression.completedRuns.toLocaleString()} completed run{localProgression.completedRuns === 1 ? "" : "s"}</span>
            </section>
            <p className="passport-boundary-note">
              Saving starts a trusted Passport for future server-authored live runs. Editable device preview XP is not imported as verified XP.
            </p>
            <div className="passport-actions">
              <button
                type="button"
                disabled={busy || !canUsePasskeys || available === false}
                data-testid="passport-create-passkey"
                onClick={() => completeAuthentication(
                  () => captainPassportClient.enrollPasskey(),
                  "Captain Passport created. Future live-room progress can now return on another device.",
                )}
              >
                <b>CREATE WITH A PASSKEY</b>
                <span>Fastest · no email or password</span>
              </button>
              <button
                type="button"
                disabled={busy || !canUsePasskeys || available === false}
                data-testid="passport-signin-passkey"
                onClick={() => completeAuthentication(
                  () => captainPassportClient.signInWithPasskey(),
                  "Welcome back. Your saved Captain Passport is connected.",
                )}
              >
                <b>SIGN IN WITH A PASSKEY</b>
                <span>Return to an existing Captain</span>
              </button>
              <button
                type="button"
                disabled={busy || capabilities?.emailLinks === false || available === false}
                data-testid="passport-email-option"
                onClick={() => setView("email")}
              >
                <b>CONTINUE WITH EMAIL</b>
                <span>One-time secure link · no password</span>
              </button>
              <button type="button" disabled={busy || available === false} onClick={() => setView("recovery")}>
                <b>USE A RECOVERY CODE</b>
                <span>Lost every sign-in method</span>
              </button>
              <button type="button" className="passport-secondary-action" onClick={onClose}>
                NOT NOW · KEEP PLAYING
              </button>
            </div>
          </>
        )}

        {available === false && (
          <p className="passport-offline-note">
            The account service is not connected in this build. Nothing blocks guest play and no data was sent.
          </p>
        )}
        {busy && <p className="passport-status" role="status">SECURELY WORKING…</p>}
        {message && <p className="passport-status" role="status">{message}</p>}
      </div>
    </section>
  );
}

function EmailLinkForm({
  email,
  setEmail,
  busy,
  onSubmit,
  onBack,
}: {
  email: string;
  setEmail: (value: string) => void;
  busy: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <form
      className="passport-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label>
        <span>EMAIL FOR SIGN-IN ONLY</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          inputMode="email"
          required
          autoFocus
        />
      </label>
      <p>No password. No newsletter. The address is converted to a keyed lookup digest after the link request.</p>
      <div>
        <button type="submit" disabled={busy}>SEND SECURE LINK</button>
        <button type="button" onClick={onBack}>BACK</button>
      </div>
    </form>
  );
}
