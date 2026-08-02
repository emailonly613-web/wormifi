import { useEffect, useMemo, useRef } from "react";
import {
  captainMasteryProgress,
  captainOrderProgress,
  type CaptainLogState,
} from "../game/captainLog";
import {
  captainLevelProgress,
  type CaptainProgression,
} from "../game/captainProgression";

interface CaptainLogProps {
  log: CaptainLogState;
  progression: CaptainProgression;
  passportConnected: boolean;
  passportAvailable: boolean;
  onClose: () => void;
  onOpenPassport: () => void;
}

const SOURCE_LABELS = {
  live: "LIVE WATER",
  rush: "RUSH",
  endless: "ENDLESS",
  practice: "PRACTICE",
} as const;

function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function runTime(endedAtMs: number): string {
  if (!endedAtMs) return "RECENT";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(endedAtMs)).toUpperCase();
}

export function CaptainLog({
  log,
  progression,
  passportConnected,
  passportAvailable,
  onClose,
  onOpenPassport,
}: CaptainLogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const level = useMemo(() => captainLevelProgress(progression.xp), [progression.xp]);
  const orders = useMemo(() => captainOrderProgress(log), [log]);
  const masteries = useMemo(() => captainMasteryProgress(log), [log]);
  const earnedMasteries = masteries.filter((mastery) => mastery.earned).length;
  const clearedOrders = orders.filter((order) => order.complete).length;

  useEffect(() => {
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <section
      className="captain-log"
      data-testid="captain-log"
      role="dialog"
      aria-modal="true"
      aria-labelledby="captain-log-title"
    >
      <header className="captain-log__header">
        <div>
          <span>YOUR VOYAGES BECOME A RECORD</span>
          <h2 id="captain-log-title">CAPTAIN&apos;S LOG</h2>
          <p>Complete today&apos;s orders, earn permanent mastery marks, and build a story worth returning to.</p>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          className="captain-log__close"
          aria-label="Close Captain's Log"
          onClick={onClose}
        >×</button>
      </header>

      <section className="captain-log__command" aria-label="Captain level and lifetime record">
        <div className="captain-log__level-seal">
          <small>CAPTAIN</small>
          <strong>LV {level.level}</strong>
        </div>
        <div className="captain-log__level-track">
          <div>
            <b>{progression.xp.toLocaleString()} XP</b>
            <span>{level.maxed ? "MAXIMUM LEVEL" : `${level.xpForLevel - level.xpIntoLevel} XP TO LV ${level.level + 1}`}</span>
          </div>
          <i aria-label={`${level.percent}% toward the next captain level`}>
            <span style={{ width: `${level.percent}%` }} />
          </i>
        </div>
        <dl>
          <div><dt>RUNS</dt><dd data-testid="captain-log-runs">{compactNumber(log.totalRuns)}</dd></div>
          <div><dt>BEST</dt><dd>{compactNumber(log.bestScore)}</dd></div>
          <div><dt>CUTS</dt><dd>{compactNumber(log.totalKills)}</dd></div>
          <div><dt>MEDALS</dt><dd>{earnedMasteries}/{masteries.length}</dd></div>
        </dl>
      </section>

      <div className="captain-log__grid">
        <section className="captain-log__panel captain-log__orders" data-testid="captain-log-orders">
          <header>
            <div>
              <span>TODAY&apos;S COURSE</span>
              <h3>DAILY ORDERS</h3>
            </div>
            <strong>{clearedOrders}/{orders.length} CLEARED</strong>
          </header>
          <ol>
            {orders.map((order) => (
              <li key={order.id} data-complete={order.complete ? "true" : "false"}>
                <span className="captain-log__order-mark" aria-hidden="true">{order.complete ? "✓" : "◆"}</span>
                <span>
                  <b>{order.label}</b>
                  <small>{order.detail}</small>
                  <i><span style={{ width: `${order.percent}%` }} /></i>
                </span>
                <em>{Math.min(order.current, order.target).toLocaleString()}/{order.target.toLocaleString()}</em>
              </li>
            ))}
          </ol>
          <p>Orders refresh each UTC day. They are goals, not paid advantages.</p>
        </section>

        <section className="captain-log__panel captain-log__masteries" data-testid="captain-log-masteries">
          <header>
            <div>
              <span>PERMANENT MILESTONES</span>
              <h3>MASTERY CABINET</h3>
            </div>
            <strong>{earnedMasteries}/{masteries.length} EARNED</strong>
          </header>
          <ul>
            {masteries.map((mastery) => (
              <li key={mastery.id} data-earned={mastery.earned ? "true" : "false"}>
                <span aria-hidden="true">{mastery.earned ? "★" : "◇"}</span>
                <b>{mastery.label}</b>
                <small>{mastery.detail}</small>
                {!mastery.earned && <em>{Math.min(mastery.current, mastery.target)}/{mastery.target}</em>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="captain-log__panel captain-log__history" data-testid="captain-log-history">
        <header>
          <div>
            <span>{log.recentRuns.length > 0
              ? `LAST ${Math.min(8, log.recentRuns.length)} VOYAGES`
              : log.totalRuns > 0
                ? "NEW VOYAGES APPEAR HERE"
                : "NO VOYAGES YET"}</span>
            <h3>RECENT WAKE</h3>
          </div>
          {log.bestRank > 0 && <strong>BEST FINISH #{log.bestRank}</strong>}
        </header>
        {log.recentRuns.length > 0 ? (
          <ol>
            {log.recentRuns.map((run, index) => (
              <li key={`${run.endedAtMs}-${index}`}>
                <span><b>{SOURCE_LABELS[run.source]}</b><small>{runTime(run.endedAtMs)}</small></span>
                <span><small>SCORE</small><strong>{run.score.toLocaleString()}</strong></span>
                <span><small>RANK</small><strong>#{run.rank}</strong></span>
                <span><small>CUTS</small><strong>{run.kills}</strong></span>
                <span><small>PEAK</small><strong>{run.peakMass}</strong></span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="captain-log__empty">
            <strong>{log.totalRuns > 0 ? "NEW VOYAGE DETAILS START HERE" : "YOUR FIRST WAKE STARTS NOW"}</strong>
            <span>{log.totalRuns > 0
              ? "Earlier run and score totals were carried forward. Finish another run to add its exact details."
              : "Finish one run to place it in the log and earn your first mastery mark."}</span>
          </div>
        )}
      </section>

      <footer className="captain-log__save" data-testid="captain-log-save" data-connected={passportConnected ? "true" : "false"}>
        <span aria-hidden="true">{passportConnected ? "✓" : "⌁"}</span>
        <div>
          <b>{passportConnected ? "CAPTAIN PASSPORT CONNECTED" : "SAVED ON THIS BROWSER"}</b>
          <small>{passportConnected
            ? "Verified live XP can return across your connected devices."
            : "This early log can disappear if this browser's storage is cleared or you change devices."}</small>
        </div>
        {!passportConnected && passportAvailable && (
          <button type="button" data-testid="captain-log-passport" onClick={onOpenPassport}>
            OPTIONAL PASSPORT
          </button>
        )}
        <button type="button" className="captain-log__done" onClick={onClose}>BACK TO HARBOR</button>
      </footer>
    </section>
  );
}
