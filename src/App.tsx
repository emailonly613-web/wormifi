import { useMemo, useState } from "react";
import { ArenaCanvas } from "./components/ArenaCanvas";
import { LiveArenaCanvas } from "./components/LiveArenaCanvas";
import { PwaStatus } from "./components/PwaStatus";
import {
  parseChallengePayload,
  type ChallengePayload,
} from "./game/replay";

export type GameMode = "rush" | "endless" | "practice";
type LaunchMode = GameMode | "live";

const guestNames = ["Nova", "Moxie", "Ziggy", "Pixel", "Comet", "Bubbles", "Dash", "Luna"];

function makeGuestName() {
  const name = guestNames[Math.floor(Math.random() * guestNames.length)];
  return `${name}${Math.floor(100 + Math.random() * 900)}`;
}

function readChallenge(): ChallengePayload | null {
  const token = new URLSearchParams(window.location.search).get("c");
  if (!token) return null;
  const parsed = parseChallengePayload(token);
  return parsed.ok ? parsed.value : null;
}

function modeForChallenge(challenge: ChallengePayload | null): GameMode {
  if (challenge?.mode === "rush") return "rush";
  if (challenge?.mode === "practice") return "practice";
  return challenge ? "endless" : "rush";
}

function rivalLabel(challenge: ChallengePayload) {
  return (challenge.target.playerId ?? "A RIVAL")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .toUpperCase();
}

export function App() {
  const initialName = useMemo(makeGuestName, []);
  const initialChallenge = useMemo(readChallenge, []);
  const [name, setName] = useState(initialName);
  const [mode, setMode] = useState<LaunchMode>(() => modeForChallenge(initialChallenge));
  const [challenge, setChallenge] = useState<ChallengePayload | null>(initialChallenge);
  const [playing, setPlaying] = useState(false);
  const [session, setSession] = useState(1);

  const start = (nextMode: LaunchMode = mode) => {
    setMode(nextMode);
    setSession((value) => value + 1);
    setPlaying(true);
  };

  return (
    <main className="app-shell">
      {playing && mode === "live" ? (
        <LiveArenaCanvas
          playerName={name || "Guest"}
          running={playing}
          session={session}
          onExit={() => {
            setPlaying(false);
            setMode("rush");
          }}
        />
      ) : (
        <ArenaCanvas
          playerName={name || "Guest"}
          mode={mode === "live" ? "rush" : mode}
          challenge={challenge}
          running={playing}
          session={session}
          onExit={() => setPlaying(false)}
          onRestart={() => start(mode === "live" ? "rush" : mode)}
        />
      )}

      {!playing && (
        <section className="launch-panel" aria-labelledby="wormifi-title">
          <div className="brand-lockup" aria-label="Wormifi">
            <span className="brand-orbit brand-orbit-a" />
            <span className="brand-orbit brand-orbit-b" />
            <h1 id="wormifi-title">WORMIFI</h1>
            <p>EVERY CHAIN HAS A STORY</p>
          </div>

          <div className="promise-card">
            <strong>Collect living sparks.</strong>
            <span>Grow your crew. Make rivals crash. Stay alive.</span>
          </div>

          {challenge && (
            <div className="incoming-challenge" data-testid="incoming-challenge">
              <small>{rivalLabel(challenge)} SENT A RIVALRY RUN</small>
              <strong>Beat {challenge.target.value.toLocaleString()} points</strong>
              <span>Same arena seed. One clean attempt.</span>
            </div>
          )}

          <label className="nickname-field">
            <span>YOUR ARENA NAME</span>
            <input
              value={name}
              maxLength={18}
              onChange={(event) => setName(event.target.value.replace(/[^a-z0-9 _-]/gi, ""))}
              aria-label="Your arena name"
            />
          </label>

          <div className="mode-tabs" role="radiogroup" aria-label="Game mode">
            <button className={mode === "rush" ? "active" : ""} onClick={() => {
              setMode("rush");
              setChallenge(null);
            }}>
              <b>90s RUSH</b><small>Fast score chase</small>
            </button>
            <button className={mode === "endless" ? "active" : ""} onClick={() => {
              setMode("endless");
              setChallenge(null);
            }}>
              <b>ENDLESS</b><small>Grow without limits</small>
            </button>
          </div>

          <button className="play-button" onClick={() => start(mode)}>
            <span>{challenge ? "ACCEPT CHALLENGE" : "PLAY NOW"}</span>
            <small>{challenge ? "Same seed · beat the target" : "Instant guest play"}</small>
          </button>

          <button className="practice-button" onClick={() => {
            setChallenge(null);
            start("practice");
          }}>
            PRACTICE WITH LABELED BOTS
          </button>

          <button className="live-lab-button" data-testid="live-lab-button" onClick={() => {
            setChallenge(null);
            start("live");
          }}>
            <b>ENTER MULTIPLAYER LAB</b>
            <small>Real server authority · humans counted separately from AI</small>
          </button>

          <div className="trust-row" aria-label="Game promises">
            <span>NO SIGN-UP</span>
            <span>NO AD BEFORE PLAY</span>
            <span>NO PAY-TO-WIN</span>
          </div>
        </section>
      )}

      <footer className="build-mark">WORMIFI.COM · ORIGINAL PREVIEW BUILD</footer>
      <PwaStatus />
    </main>
  );
}
