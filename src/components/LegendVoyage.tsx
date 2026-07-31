import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { captainLevelProgress, type CaptainProgression } from "../game/captainProgression";
import { getCosmeticTheme } from "../game/cosmeticThemes";
import {
  LEGEND_VOYAGE,
  LEGEND_VOYAGE_REWARDS,
  LEGEND_VOYAGE_THEME_IDS,
} from "../game/legendVoyage";
import { drawContinuousPirateWorm } from "../game/treasureRender";

interface LegendVoyageProps {
  progression: CaptainProgression;
  onClose: () => void;
  onOpenSkinStudio: () => void;
}

function drawWake(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
  themeId: string,
  accent: string,
) {
  const tailX = width * 0.18;
  const centerY = height * 0.56;
  context.save();
  context.globalCompositeOperation = "lighter";
  for (let index = 0; index < 14; index += 1) {
    const cycle = ((now * 0.00018 + index / 14) % 1 + 1) % 1;
    const x = tailX - cycle * width * 0.18;
    const wave = Math.sin(index * 1.7 + now * 0.002) * height * 0.055;
    const radius = 2 + (1 - cycle) * 5;
    context.globalAlpha = (1 - cycle) * 0.72;
    context.fillStyle = themeId === "phoenix-wake" && index % 3 === 0 ? "#ffd36a" : accent;
    context.shadowColor = context.fillStyle;
    context.shadowBlur = 12;
    context.beginPath();
    if (themeId === "leviathan-scale") {
      context.arc(x, centerY + wave, radius, 0, Math.PI * 2);
      context.strokeStyle = context.fillStyle;
      context.lineWidth = 1.5;
      context.stroke();
    } else {
      context.arc(x, centerY + wave, radius, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();
}

export function LegendVoyage({ progression, onClose, onOpenSkinStudio }: LegendVoyageProps) {
  const [selectedThemeId, setSelectedThemeId] = useState<string>(LEGEND_VOYAGE_THEME_IDS[0]);
  const [interestRecorded, setInterestRecorded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
    [],
  );
  const level = captainLevelProgress(progression.xp);
  const selectedTheme = getCosmeticTheme(selectedThemeId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let frame = 0;
    let active = true;

    const paint = (frameNow: number) => {
      if (!active) return;
      const width = Math.max(360, Math.round(canvas.clientWidth || 760));
      const height = Math.max(190, Math.round(canvas.clientHeight || 270));
      const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const backingWidth = Math.round(width * scale);
      const backingHeight = Math.round(height * scale);
      if (canvas.width !== backingWidth) canvas.width = backingWidth;
      if (canvas.height !== backingHeight) canvas.height = backingHeight;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(scale, 0, 0, scale, 0, 0);

      const sea = context.createRadialGradient(width * 0.62, height * 0.42, 10, width * 0.58, height * 0.5, width * 0.75);
      sea.addColorStop(0, "#164d5a");
      sea.addColorStop(0.46, "#092b42");
      sea.addColorStop(1, "#04111f");
      context.fillStyle = sea;
      context.fillRect(0, 0, width, height);

      context.save();
      context.globalAlpha = 0.12;
      context.strokeStyle = selectedTheme.palette[0];
      context.lineWidth = 1;
      for (let ring = 0; ring < 5; ring += 1) {
        context.beginPath();
        context.arc(width * 0.7, height * 0.52, 55 + ring * 36, 0, Math.PI * 2);
        context.stroke();
      }
      context.restore();

      const movingNow = reducedMotion ? 0 : frameNow;
      drawWake(context, width, height, movingNow, selectedTheme.id, selectedTheme.palette[0]);
      const bodyRadius = Math.max(23, Math.min(35, height * 0.13));
      const phase = movingNow * 0.00115;
      const points = Array.from({ length: 11 }, (_, index) => {
        const progress = index / 10;
        return {
          x: width * (0.88 - progress * 0.7),
          y: height * 0.54 + Math.sin(progress * Math.PI * 1.72 + phase) * height * 0.15,
        };
      });
      drawContinuousPirateWorm(context, {
        points,
        headRadius: bodyRadius * 1.18,
        bodyRadius,
        palette: selectedTheme.palette,
        direction: { x: 1, y: 0 },
        shielded: false,
        identity: 41 + LEGEND_VOYAGE_THEME_IDS.indexOf(selectedTheme.id as typeof LEGEND_VOYAGE_THEME_IDS[number]),
        now: movingNow,
        pattern: selectedTheme.pattern,
        materialMotion: reducedMotion ? 0 : 1,
        materialGlow: true,
      });

      if (!reducedMotion) frame = requestAnimationFrame(paint);
    };

    paint(0);
    return () => {
      active = false;
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reducedMotion, selectedTheme]);

  return (
    <section
      className="legend-voyage"
      data-testid="legend-voyage"
      data-purchasable="false"
      aria-labelledby="legend-voyage-title"
    >
      <header className="legend-voyage__header">
        <div>
          <span>PERMANENT COSMETIC PROGRESSION · RESEARCH PREVIEW</span>
          <h2 id="legend-voyage-title">{LEGEND_VOYAGE.label}</h2>
          <p>Payment never levels you up. It makes every earned Captain Level more rewarding.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close Legend Voyage">×</button>
      </header>

      <div className="legend-voyage__no-sale" role="status">
        <strong>NOT FOR SALE YET</strong>
        <span>{LEGEND_VOYAGE.priceResearchLabel} one-time price research · no checkout · no card · no email collected</span>
      </div>

      <section className="legend-voyage__captain" aria-label={`Captain Level ${level.level}`}>
        <div>
          <small>YOUR BROWSER-PREVIEW PROGRESS</small>
          <strong>CAPTAIN LEVEL {level.level}</strong>
          <span>{progression.completedRuns} completed run{progression.completedRuns === 1 ? "" : "s"} · {progression.xp.toLocaleString()} XP</span>
        </div>
        <div className="legend-voyage__level-meter">
          <span style={{ width: `${level.percent}%` }} />
        </div>
        <small>{level.maxed ? "VOYAGE LEVEL MAXED" : `${level.xpIntoLevel} / ${level.xpForLevel} XP TO LEVEL ${level.level + 1}`}</small>
      </section>

      <div className="legend-voyage__showcase">
        <div className="legend-voyage__canvas-shell">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`${selectedTheme.label} animated body, face, and wake preview`}
          />
          <div>
            <small>LIVE TRY-ON · NO EQUIP OR PURCHASE</small>
            <strong>{selectedTheme.label}</strong>
            <span>{selectedTheme.description}</span>
          </div>
        </div>
        <div className="legend-voyage__themes" role="radiogroup" aria-label="Legend identity preview">
          {LEGEND_VOYAGE_THEME_IDS.map((themeId) => {
            const theme = getCosmeticTheme(themeId);
            const selected = theme.id === selectedTheme.id;
            return (
              <button
                key={theme.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={selected ? "selected" : ""}
                data-testid={`legend-theme-${theme.id}`}
                data-legend-theme={theme.id}
                onClick={() => setSelectedThemeId(theme.id)}
                style={{ "--legend-accent": theme.palette[0] } as CSSProperties}
              >
                <span aria-hidden="true">{theme.palette.map((color) => <i key={color} style={{ background: color }} />)}</span>
                <b>{theme.label}</b>
                <small>ANIMATED BODY · LIVING FACE · SIGNATURE WAKE</small>
              </button>
            );
          })}
        </div>
      </div>

      <section className="legend-voyage__value" aria-label="Proposed permanent value">
        <div><strong>3</strong><span>COMPLETE LEGEND IDENTITIES</span></div>
        <div><strong>3</strong><span>RARE WAKE EFFECTS</span></div>
        <div><strong>2</strong><span>ARRIVAL + TRIUMPH FLOURISHES</span></div>
        <div><strong>1</strong><span>VOYAGE MASTER NAMEPLATE</span></div>
      </section>

      <ol className="legend-voyage__route" aria-label="Legend Voyage reward route">
        {LEGEND_VOYAGE_REWARDS.map((reward) => (
          <li key={reward.level} className={level.level >= reward.level ? "reached" : "future"}>
            <span>LV {reward.level}</span>
            <div><strong>{reward.label}</strong><small>{reward.detail}</small></div>
            <em>{level.level >= reward.level ? "LEVEL REACHED" : "EARN THROUGH PLAY"}</em>
          </li>
        ))}
      </ol>

      <footer className="legend-voyage__footer">
        <button type="button" onClick={onOpenSkinStudio}>OPEN FREE SKIN STUDIO</button>
        <button
          type="button"
          className="legend-voyage__interest"
          data-testid="legend-voyage-interest"
          disabled={interestRecorded}
          onClick={() => setInterestRecorded(true)}
        >
          {interestRecorded ? "INTEREST NOTED · NO PAYMENT COLLECTED" : `I'D CONSIDER ${LEGEND_VOYAGE.priceResearchLabel} · RESEARCH ONLY`}
        </button>
        <p>Every existing free theme stays free. No purchased XP, skips, multipliers, zoom, size, speed, collision power, loot-box odds, or expiration.</p>
      </footer>
    </section>
  );
}
