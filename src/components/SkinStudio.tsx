import { useEffect, useId, useRef, useState } from "react";
import {
  PHOTO_SKIN_ACCEPT,
  PHOTO_SKIN_CONSENT_TEXT,
  PHOTO_SKIN_MAX_PHOTOS,
  PHOTO_SKIN_MIN_PHOTOS,
  PHOTO_SKIN_MULTIPLAYER_PROMISE,
  PHOTO_SKIN_PRIVACY_PROMISE,
  PHOTO_SKIN_THEMES,
  PhotoSkinImageCache,
  addPhotoSkinPhotos,
  clearPhotoSkinPhotos,
  createPhotoSkinRenderPlan,
  importPhotoSkinFile,
  isPhotoSkinReady,
  normalizePhotoSkinState,
  readPhotoSkinState,
  removePhotoSkinPhoto,
  reorderPhotoSkinPhoto,
  selectCaptainExpressionStyle,
  selectCaptainEyeStyle,
  selectCaptainFaceMode,
  selectCompletePhotoSkinStyle,
  selectPhotoSkinFace,
  selectPhotoSkinTheme,
  setPhotoSkinConsent,
  setPhotoSkinEnabled,
  setPhotoSkinFocalPoint,
  validatePhotoSelection,
  writePhotoSkinState,
  type PhotoSkinState,
  type PhotoSkinStorage,
} from "../game/photoSkin";
import {
  CAPTAIN_EXPRESSION_STYLES,
  CAPTAIN_EYE_STYLES,
  type CaptainExpressionStyle,
  type CaptainEyeStyle,
} from "../game/captainFeatures";
import { drawPhotoSkinCanvas } from "../game/photoSkinCanvas";
import { drawContinuousPirateWorm } from "../game/treasureRender";
import { cinematicHeadSource } from "../game/cinematicHeads";
import {
  MATERIAL_MOTION_LEVELS,
  readRenderPreferences,
  writeRenderPreferences,
  type MaterialMotionLevel,
  type RenderPreferences,
} from "../game/renderPreferences";
import {
  cosmeticThemeHeadHue,
  getCosmeticTheme,
  isPremiumCosmeticThemeId,
  type CosmeticThemeTier,
} from "../game/cosmeticThemes";
import {
  FOUNDER_PACK,
  canEquipTheme,
  isFounderPackUnlocked,
} from "../game/premiumSkins";
import {
  DEFAULT_WORMATE_PARENT_SKIN_ID,
  WORMATE_PARENT_REVISION,
  WORMATE_PARENT_SKINS,
  WORMATE_PARENT_WEARABLE_CATALOGS,
  getWormateParentSkin,
  wormateParentAppearanceFromThemeId,
  wormateParentSkinIdFromThemeId,
  wormateParentSkinLabel,
  wormateParentThemeIdWithSkin,
  wormateParentThemeIdWithWearable,
  wormateParentWearableLabel,
  type WormateParentOutfit,
  type WormateParentSkinId,
  type WormateParentWearable,
  type WormateParentWearableKind,
} from "../game/wormateParentCatalog";
import {
  drawWormateParentWorm,
  preloadWormateParentVisuals,
} from "../game/wormateParentRender";
import {
  ARENA_VISUAL_THEME_CATALOG,
  PICKUP_THEME_CATALOG,
  WORLD_COSMETIC_BUNDLES,
  equipWorldCosmeticBundle,
  normalizeWorldCosmetics,
  readWorldCosmetics,
  selectArenaVisualTheme,
  selectPickupTheme,
  writeWorldCosmetics,
  type WorldCosmeticState,
} from "../game/worldCosmetics";
import { getBoundaryGuardianSpec } from "../game/boundaryGuardians";

const MOTION_LEVEL_COPY: Record<MaterialMotionLevel, { label: string; detail: string }> = {
  full: { label: "FULL", detail: "Materials flow at full speed." },
  subtle: { label: "SUBTLE", detail: "Slower, quieter movement." },
  off: { label: "OFF", detail: "Still materials, zero motion." },
};

const TIER_BADGES: Record<CosmeticThemeTier, string | null> = {
  standard: null,
  rare: "RARE",
  legend: "LEGEND",
};

const PREVIEW_MOTION_SCALE: Record<MaterialMotionLevel, number> = {
  full: 1,
  subtle: 0.45,
  off: 0,
};

const EYE_STYLE_COPY: Record<CaptainEyeStyle, { label: string; mark: string }> = {
  round: { label: "BRIGHT ROUND", mark: "● ●" },
  lookout: { label: "LOOKOUT", mark: "◉ ◉" },
  sleepy: { label: "COOL LIDS", mark: "⌒ ⌒" },
  jewel: { label: "JEWEL EYES", mark: "◆ ◆" },
};

const EXPRESSION_STYLE_COPY: Record<CaptainExpressionStyle, { label: string; mark: string }> = {
  grin: { label: "GRIN", mark: "◡" },
  determined: { label: "DETERMINED", mark: "›" },
  surprised: { label: "SURPRISED", mark: "○" },
  none: { label: "NO MOUTH", mark: "—" },
};

export interface SkinStudioProps {
  /** Used once on mount. Omit it to load the private local-browser state. */
  initialState?: PhotoSkinState;
  storage?: PhotoSkinStorage;
  onStateChange?: (state: PhotoSkinState) => void;
  onClose?: () => void;
  onOpenLegendVoyage?: () => void;
  initialWorldCosmetics?: WorldCosmeticState;
  onWorldCosmeticsChange?: (state: WorldCosmeticState) => void;
  className?: string;
}

type CustomizationMode = "body" | "face" | "complete" | "world";

export function SkinStudio({
  initialState,
  storage,
  onStateChange,
  onClose,
  onOpenLegendVoyage,
  initialWorldCosmetics,
  onWorldCosmeticsChange,
  className = "",
}: SkinStudioProps) {
  const titleId = useId();
  const privacyId = useId();
  const consentId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewImageCacheRef = useRef(new PhotoSkinImageCache());
  const loadedRef = useRef<ReturnType<typeof readPhotoSkinState> | null>(null);
  if (!loadedRef.current) {
    loadedRef.current = initialState
      ? { state: normalizePhotoSkinState(initialState, initialState.updatedAtMs) }
      : readPhotoSkinState(storage);
  }

  const [state, setState] = useState<PhotoSkinState>(loadedRef.current.state);
  const [worldCosmetics, setWorldCosmetics] = useState<WorldCosmeticState>(() =>
    initialWorldCosmetics
      ? normalizeWorldCosmetics(initialWorldCosmetics, initialWorldCosmetics.updatedAtMs)
      : readWorldCosmetics()
  );
  const [renderPrefs, setRenderPrefs] = useState<RenderPreferences>(() => readRenderPreferences());
  const [founderUnlocked] = useState(() => isFounderPackUnlocked());
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  const [customizationMode, setCustomizationMode] = useState<CustomizationMode>("body");
  // Historic test grants remain usable, but the public Skin Studio no longer
  // exposes any checkout or query-string purchase preview.
  const founderStoreVisible = founderUnlocked;
  const reducedMotionRef = useRef(
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false),
  );
  const [status, setStatus] = useState(
    state.photos.length > 0
      ? `${state.photos.length} sanitized local photo${state.photos.length === 1 ? "" : "s"} ready.`
      : "Choose 2–6 photos after granting consent.",
  );
  const [error, setError] = useState(loadedRef.current.error ?? "");
  const [storageStatus, setStorageStatus] = useState(loadedRef.current.error ? "NOT SAVED" : "LOCAL-ONLY STORAGE READY");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    onStateChange?.(state);
    try {
      writePhotoSkinState(state, storage);
      setStorageStatus("SAVED ONLY IN THIS BROWSER");
    } catch (storageError) {
      setStorageStatus("LOCAL STORAGE UNAVAILABLE");
      setError(storageError instanceof Error ? storageError.message : "Photo Skin could not be saved locally.");
    }
  }, [onStateChange, state, storage]);

  useEffect(() => {
    onWorldCosmeticsChange?.(worldCosmetics);
    try {
      writeWorldCosmetics(worldCosmetics);
    } catch {
      setStorageStatus("WORLD STYLE COULD NOT BE SAVED");
    }
  }, [onWorldCosmeticsChange, worldCosmetics]);

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    let active = true;
    let frameHandle = 0;
    const renderPlan = createPhotoSkinRenderPlan(state);
    // A "try before you unlock" preview repaints the worm in a premium theme
    // without ever writing it into the persisted state.
    const previewTheme = previewThemeId ? getCosmeticTheme(previewThemeId) : renderPlan.theme;
    const previewFaceTheme = previewThemeId ? getCosmeticTheme(previewThemeId) : renderPlan.faceTheme;
    // Reduced motion wins over every studio control, exactly as in the arena.
    const motionScale = reducedMotionRef.current ? 0 : PREVIEW_MOTION_SCALE[renderPrefs.materialMotion];
    let decoded: ReadonlyMap<string, CanvasImageSource> = new Map();

    const paintPreview = (now: number) => {
      if (!active) return;
      const width = Math.max(320, Math.round(canvas.clientWidth || 720));
      const height = Math.max(150, Math.round(canvas.clientHeight || 190));
      const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const backingWidth = Math.round(width * scale);
      const backingHeight = Math.round(height * scale);
      if (canvas.width !== backingWidth) canvas.width = backingWidth;
      if (canvas.height !== backingHeight) canvas.height = backingHeight;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(scale, 0, 0, scale, 0, 0);

      const background = context.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, "#071b31");
      background.addColorStop(0.55, "#0c3446");
      background.addColorStop(1, "#061321");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
      context.strokeStyle = "rgba(244,199,91,.12)";
      context.lineWidth = 1;
      for (let line = -height; line < width + height; line += 54) {
        context.beginPath();
        context.moveTo(line, height);
        context.lineTo(line + height, 0);
        context.stroke();
      }

      const bodyRadius = Math.max(20, Math.min(31, height * 0.155));
      const headRadius = bodyRadius * 1.18;
      // The preview worm swims: the same sine spine as before with a slow
      // traveling phase, frozen when motion is off or reduced.
      const swim = now * 0.0011 * motionScale;
      const points = Array.from({ length: 10 }, (_, index) => {
        const progress = index / 9;
        return {
          x: width * (0.84 - progress * 0.68),
          y: height * 0.53 + Math.sin(progress * Math.PI * 1.72 + swim) * height * 0.16,
        };
      });
      drawContinuousPirateWorm(context, {
        points,
        headRadius,
        bodyRadius,
        palette: previewTheme.palette,
        direction: { x: 1, y: 0 },
        shielded: false,
        identity: 26,
        now: now * motionScale,
        pattern: previewTheme.pattern,
        materialMotion: motionScale,
        materialGlow: renderPrefs.materialGlow,
        cinematicHead: true,
        cinematicHeadPattern: previewFaceTheme.pattern,
        cinematicHeadPalette: previewFaceTheme.palette,
        cinematicHeadHue: cosmeticThemeHeadHue(previewFaceTheme),
        faceMode: previewThemeId ? "captain" : renderPlan.faceMode,
        eyeStyle: renderPlan.eyeStyle,
        expressionStyle: renderPlan.expressionStyle,
        parentSkinId: previewThemeId ? undefined : renderPlan.parentSkinId,
        parentOutfit: previewThemeId ? undefined : renderPlan.parentOutfit,
      });
      drawPhotoSkinCanvas(context, {
        points: points.slice(1),
        bodyRadius,
        direction: { x: -1, y: 0 },
        decodedImages: decoded,
        renderPlan,
      });
    };

    paintPreview(0);
    void preloadWormateParentVisuals().then(() => {
      if (active) paintPreview(0);
    });
    void Promise.all(renderPlan.localPhotos.map(async (photo) => {
      try {
        return [photo.id, await previewImageCacheRef.current.get(photo)] as const;
      } catch {
        return undefined;
      }
    })).then((entries) => {
      decoded = new Map(
        entries.filter((entry): entry is readonly [string, HTMLImageElement] => entry !== undefined),
      );
      paintPreview(0);
    });

    if (motionScale > 0 && typeof requestAnimationFrame === "function") {
      const tick = (frameNow: number) => {
        if (!active) return;
        paintPreview(frameNow);
        frameHandle = requestAnimationFrame(tick);
      };
      frameHandle = requestAnimationFrame(tick);
    }

    return () => {
      active = false;
      if (frameHandle) cancelAnimationFrame(frameHandle);
    };
  }, [previewThemeId, renderPrefs, state]);

  const commit = (next: PhotoSkinState, nextStatus: string) => {
    setState(next);
    setStatus(nextStatus);
    setError("");
  };

  const commitWorldCosmetics = (next: WorldCosmeticState, nextStatus: string) => {
    setWorldCosmetics(next);
    setStatus(nextStatus);
    setError("");
  };

  const handleConsent = (consented: boolean) => {
    const next = setPhotoSkinConsent(state, consented);
    commit(
      next,
      consented
        ? "Consent saved. Select 2–6 photos to create a private local preview."
        : "Consent withdrawn. Every locally stored Photo Skin image was deleted.",
    );
    if (!consented && fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFiles = async (files: File[]) => {
    const validationErrors = state.consented
      ? validatePhotoSelection(state.photos.length, files)
      : ["Grant photo consent before choosing files."];
    if (validationErrors.length > 0) {
      setError(validationErrors.join(" "));
      setStatus("No files were added.");
      return;
    }

    setProcessing(true);
    setError("");
    setStatus(`Sanitizing ${files.length} photo${files.length === 1 ? "" : "s"} on this device…`);
    try {
      const sanitized = [];
      for (let index = 0; index < files.length; index += 1) {
        setStatus(`Sanitizing photo ${index + 1} of ${files.length} on this device…`);
        sanitized.push(await importPhotoSkinFile(files[index]));
      }
      const next = addPhotoSkinPhotos(state, sanitized);
      commit(
        next,
        `${next.photos.length} sanitized photo${next.photos.length === 1 ? "" : "s"} saved locally. Original files were not stored.`,
      );
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : "The selected photos could not be sanitized.");
      setStatus("No files were added.");
    } finally {
      setProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const ready = isPhotoSkinReady(state);

  return (
    <section
      className={`skin-studio ${className}`.trim()}
      aria-labelledby={titleId}
      aria-describedby={privacyId}
      data-testid="skin-studio"
      data-photo-count={state.photos.length}
      data-photo-enabled={state.enabled ? "true" : "false"}
      data-photo-sharing="authored-theme-only"
    >
      <header className="skin-studio-header">
        <div>
          <span className="skin-studio-kicker">FOUR LAYERS · ONE COMPLETE CAPTAIN WORLD</span>
          <h2 id={titleId}>CAPTAIN CUSTOMIZER</h2>
          <p>Build the body, face, complete identity, then theme the food, treasure, and arena around it.</p>
        </div>
        <div className="skin-studio-header-actions">
          {onOpenLegendVoyage && (
            <button type="button" className="skin-studio-voyage-link" onClick={onOpenLegendVoyage}>
              <strong>SEE LEGEND VOYAGE</strong>
              <small>STORY + 3 CINEMATIC LEGENDS</small>
            </button>
          )}
          {onClose && (
            <button type="button" className="skin-studio-close" onClick={onClose} aria-label="Close Captain Customizer">
              ×
            </button>
          )}
        </div>
      </header>

      <div className="skin-studio-modes" role="tablist" aria-label="Customization category">
        {([
          ["body", "1", "BODY SKIN ONLY", "Face stays exactly the same."],
          ["face", "2", "FACE ONLY", "Body skin stays exactly the same."],
          ["complete", "3", "COMPLETE STYLES", "Matched face + skin made together."],
          ["world", "4", "WORLD THEMES", "Food, treasure + arena skin."],
        ] as const).map(([mode, number, label, detail]) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={customizationMode === mode}
            className={customizationMode === mode ? "selected" : ""}
            data-testid={`customizer-mode-${mode}`}
            onClick={() => {
              setPreviewThemeId(null);
              setCustomizationMode(mode);
              setStatus(`${label.toLowerCase()} selected.`);
            }}
          >
            <span>{number}</span>
            <strong>{label}</strong>
            <small>{detail}</small>
          </button>
        ))}
      </div>

      {customizationMode === "world" && (
        <fieldset className="skin-studio-world" data-testid="world-theme-studio">
          <legend>WORLD STYLE · VISUAL ONLY · AUTHORITATIVE BOARD RULES NEVER CHANGE</legend>
          <div className="skin-world-depth-meter" aria-label="World customization depth">
            <span><strong>3</strong> food/treasure fields</span>
            <span><strong>4</strong> arena + living moat skins</span>
            <span><strong>4</strong> coordinated world sets</span>
            <span><strong>0</strong> gameplay advantages</span>
          </div>
          <section className="skin-world-bundles" aria-labelledby={`${titleId}-world-bundles`}>
            <header>
              <small>ONE-CLICK COORDINATED SETS</small>
              <h3 id={`${titleId}-world-bundles`}>THEMED WORLDS</h3>
            </header>
            <div>
              {WORLD_COSMETIC_BUNDLES.map((bundle) => {
                const selected = worldCosmetics.pickupThemeId === bundle.pickupThemeId &&
                  worldCosmetics.arenaThemeId === bundle.arenaThemeId;
                return (
                  <button
                    type="button"
                    key={bundle.id}
                    aria-pressed={selected}
                    data-testid={`world-bundle-${bundle.id}`}
                    onClick={() => commitWorldCosmetics(
                      equipWorldCosmeticBundle(worldCosmetics, bundle),
                      `${bundle.label} complete world equipped. Gameplay rules did not change.`,
                    )}
                  >
                    <span className={`skin-world-bundle-art world-${bundle.arenaThemeId}`} aria-hidden="true">
                      <i>{PICKUP_THEME_CATALOG.find((theme) => theme.id === bundle.pickupThemeId)?.mark}</i>
                    </span>
                    <strong>{bundle.label}</strong>
                    <small>{bundle.description}</small>
                    <b>{selected ? "EQUIPPED" : "EQUIP COMPLETE SET"}</b>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="skin-world-layer" aria-labelledby={`${titleId}-pickup-layer`}>
            <header><small>INDEPENDENT LAYER</small><h3 id={`${titleId}-pickup-layer`}>FOOD &amp; TREASURE FIELD</h3></header>
            <div>
              {PICKUP_THEME_CATALOG.map((theme) => (
                <label key={theme.id} className={worldCosmetics.pickupThemeId === theme.id ? "selected" : ""}>
                  <input
                    type="radio"
                    name={`${titleId}-pickup-theme`}
                    value={theme.id}
                    checked={worldCosmetics.pickupThemeId === theme.id}
                    onChange={() => commitWorldCosmetics(
                      selectPickupTheme(worldCosmetics, theme.id),
                      `${theme.label} pickup field selected.`,
                    )}
                  />
                  <span aria-hidden="true">{theme.mark}</span>
                  <strong>{theme.label}</strong>
                  <small>{theme.description}</small>
                </label>
              ))}
            </div>
          </section>

          <section className="skin-world-layer" aria-labelledby={`${titleId}-arena-layer`}>
            <header><small>INDEPENDENT LAYER</small><h3 id={`${titleId}-arena-layer`}>ARENA + LIVING MOAT SKIN</h3></header>
            <div>
              {ARENA_VISUAL_THEME_CATALOG.map((theme) => (
                <label key={theme.id} className={worldCosmetics.arenaThemeId === theme.id ? "selected" : ""}>
                  <input
                    type="radio"
                    name={`${titleId}-arena-theme`}
                    value={theme.id}
                    checked={worldCosmetics.arenaThemeId === theme.id}
                    onChange={() => commitWorldCosmetics(
                      selectArenaVisualTheme(worldCosmetics, theme.id),
                      `${theme.label} arena skin selected. Board geometry and rules did not change.`,
                    )}
                  />
                  <span className="skin-world-palette" aria-hidden="true">
                    {theme.colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
                  </span>
                  <strong>{theme.label}</strong>
                  <small>{theme.description}</small>
                  <b>{getBoundaryGuardianSpec(theme.id).label}</b>
                </label>
              ))}
            </div>
          </section>
        </fieldset>
      )}

      {customizationMode === "body" && <fieldset className="skin-studio-themes" data-testid="body-skin-catalog">
        <legend>BODY SKIN ONLY · PARENT COLLECTION FIRST</legend>
        <ParentSkinCarousel
          state={state}
          onSelect={(skinId) => {
            setPreviewThemeId(null);
            const skin = getWormateParentSkin(skinId);
            commit(
              selectPhotoSkinTheme(state, wormateParentThemeIdWithSkin(state.themeId, skin.id)),
              `${wormateParentSkinLabel(skin)} parent body selected.`,
            );
          }}
        />
        <h3 className="skin-studio-originals-heading">WORMIFI ORIGINALS · EXTRA COLLECTION</h3>
        <div>
          {PHOTO_SKIN_THEMES.filter((theme) => !isPremiumCosmeticThemeId(theme.id)).map((theme) => (
            <label key={theme.id} className={state.themeId === theme.id ? "selected" : ""}>
              <input
                type="radio"
                name={`${titleId}-theme`}
                value={theme.id}
                checked={state.themeId === theme.id}
                onChange={() => {
                  setPreviewThemeId(null);
                  commit(selectPhotoSkinTheme(state, theme.id), `${theme.label} body selected. Your face did not change.`);
                }}
              />
              <span className="skin-theme-swatches" aria-hidden="true">
                {theme.palette.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
              </span>
              <strong>
                {theme.label}
                {TIER_BADGES[theme.tier] && (
                  <em className={`skin-theme-tier tier-${theme.tier}`} data-testid="skin-theme-tier">
                    {TIER_BADGES[theme.tier]}
                  </em>
                )}
              </strong>
              <small>{theme.description} Face stays {getCosmeticTheme(state.faceThemeId).label}.</small>
            </label>
          ))}
        </div>
      </fieldset>}

      {customizationMode === "face" && <fieldset className="skin-studio-themes skin-studio-faces" data-testid="face-only-catalog">
        <legend>FACE + HEAD WEAR · PARENT COLLECTION FIRST</legend>
        <ParentWearableStudio
          state={state}
          onSelect={(kind, wearable) => {
            setPreviewThemeId(null);
            commit(
              selectPhotoSkinTheme(
                state,
                wormateParentThemeIdWithWearable(state.themeId, kind, wearable.id),
              ),
              `${wormateParentWearableLabel(kind, wearable)} equipped for public play.`,
            );
          }}
        />
        <h3 className="skin-studio-originals-heading">WORMIFI ORIGINAL FACES · EXTRA COLLECTION</h3>
        <div className="captain-feature-modes" role="group" aria-label="Face construction mode">
          {([
            ["captain", "COMPLETE CAPTAIN", "An art-directed face."],
            ["features", "FEATURE MIX", "Choose eyes + expression."],
            ["eyes-only", "EYES ONLY", "Minimal. No complete face."],
          ] as const).map(([faceMode, label, detail]) => (
            <button
              key={faceMode}
              type="button"
              className={state.faceMode === faceMode ? "selected" : ""}
              aria-pressed={state.faceMode === faceMode}
              data-testid={`captain-face-mode-${faceMode}`}
              onClick={() => {
                commit(
                  selectCaptainFaceMode(state, faceMode),
                  `${label.toLowerCase()} selected. Your body skin did not change.`,
                );
              }}
            >
              <strong>{label}</strong>
              <small>{detail}</small>
            </button>
          ))}
        </div>
        {state.faceMode === "captain" && <div>
          {PHOTO_SKIN_THEMES.filter((theme) => !isPremiumCosmeticThemeId(theme.id)).map((theme) => (
            <label key={theme.id} className={state.faceThemeId === theme.id ? "selected" : ""}>
              <input
                type="radio"
                name={`${titleId}-face`}
                value={theme.id}
                checked={state.faceThemeId === theme.id}
                onChange={() => {
                  setPreviewThemeId(null);
                  commit(selectPhotoSkinFace(state, theme.id), `${theme.label} face selected. Your body skin did not change.`);
                }}
              />
              <span className="skin-face-cutout" aria-hidden="true">
                <img
                  src={cinematicHeadSource(theme.pattern)}
                  alt=""
                  draggable={false}
                  style={{ filter: `hue-rotate(${cosmeticThemeHeadHue(theme)}deg)` }}
                />
              </span>
              <strong>{theme.label}</strong>
              <small>FACE ONLY · body remains {bodySkinLabel(state.themeId)}</small>
            </label>
          ))}
        </div>}
        {state.faceMode !== "captain" && (
          <div className="captain-feature-builder" data-testid="captain-feature-builder">
            <fieldset>
              <legend>EYES</legend>
              <div>
                {CAPTAIN_EYE_STYLES.map((eyeStyle) => (
                  <label key={eyeStyle} className={state.eyeStyle === eyeStyle ? "selected" : ""}>
                    <input
                      type="radio"
                      name={`${titleId}-eye-style`}
                      value={eyeStyle}
                      checked={state.eyeStyle === eyeStyle}
                      onChange={() => commit(
                        selectCaptainEyeStyle(state, eyeStyle),
                        `${EYE_STYLE_COPY[eyeStyle].label.toLowerCase()} equipped.`,
                      )}
                    />
                    <span aria-hidden="true">{EYE_STYLE_COPY[eyeStyle].mark}</span>
                    <strong>{EYE_STYLE_COPY[eyeStyle].label}</strong>
                  </label>
                ))}
              </div>
            </fieldset>
            {state.faceMode === "features" && (
              <fieldset>
                <legend>EXPRESSION</legend>
                <div>
                  {CAPTAIN_EXPRESSION_STYLES.map((expressionStyle) => (
                    <label
                      key={expressionStyle}
                      className={state.expressionStyle === expressionStyle ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name={`${titleId}-expression-style`}
                        value={expressionStyle}
                        checked={state.expressionStyle === expressionStyle}
                        onChange={() => commit(
                          selectCaptainExpressionStyle(state, expressionStyle),
                          `${EXPRESSION_STYLE_COPY[expressionStyle].label.toLowerCase()} equipped.`,
                        )}
                      />
                      <span aria-hidden="true">{EXPRESSION_STYLE_COPY[expressionStyle].mark}</span>
                      <strong>{EXPRESSION_STYLE_COPY[expressionStyle].label}</strong>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <small className="captain-feature-boundary">
              WORMIFI ORIGINAL FACE FEATURES STAY ON THIS DEVICE · PARENT OUTFITS ABOVE ARE PUBLIC
            </small>
          </div>
        )}
        {state.faceMode === "captain" && onOpenLegendVoyage && (
          <button type="button" className="skin-studio-legend-card" onClick={onOpenLegendVoyage}>
            <strong>+ 3 LEGEND FACES</strong>
            <span>KRAKEN · PHOENIX · LEVIATHAN</span>
            <small>Open the playable story and preview all three.</small>
          </button>
        )}
      </fieldset>}

      {customizationMode === "complete" && <fieldset className="skin-studio-themes skin-studio-complete" data-testid="complete-style-catalog">
        <legend>COMPLETE STYLES · MATCHED FACE + BODY</legend>
        <div>
          {PHOTO_SKIN_THEMES.filter((theme) => !isPremiumCosmeticThemeId(theme.id)).map((theme) => {
            const selected = state.themeId === theme.id && state.faceThemeId === theme.id;
            return (
              <label key={theme.id} className={selected ? "selected" : ""}>
                <input
                  type="radio"
                  name={`${titleId}-complete`}
                  value={theme.id}
                  checked={selected}
                  onChange={() => {
                    setPreviewThemeId(null);
                    commit(selectCompletePhotoSkinStyle(state, theme.id), `${theme.label} complete style equipped — matched face and body.`);
                  }}
                />
                <span className="skin-face-cutout" aria-hidden="true">
                  <img
                    src={cinematicHeadSource(theme.pattern)}
                    alt=""
                    draggable={false}
                    style={{ filter: `hue-rotate(${cosmeticThemeHeadHue(theme)}deg)` }}
                  />
                </span>
                <span className="skin-theme-swatches" aria-hidden="true">
                  {theme.palette.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
                </span>
                <strong>{theme.label}</strong>
                <small>COMPLETE IDENTITY · face and material authored together</small>
              </label>
            );
          })}
        </div>
        {onOpenLegendVoyage && (
          <button type="button" className="skin-studio-legend-card" onClick={onOpenLegendVoyage}>
            <strong>ENTER LEGEND VOYAGE</strong>
            <span>3 COMPLETE LEGEND IDENTITIES + REWARD STORY</span>
            <small>See Kraken, Phoenix, and Leviathan in the progression route. Not for sale yet.</small>
          </button>
        )}
      </fieldset>}

      {customizationMode === "complete" && founderStoreVisible && (
        <fieldset
          className="skin-studio-founder"
          data-testid="skin-studio-founder"
          data-founder-unlocked={founderUnlocked ? "true" : "false"}
        >
          <legend>{FOUNDER_PACK.label} · THREE COMPLETE LEGEND IDENTITIES</legend>
          <div className="skin-founder-themes">
            {FOUNDER_PACK.themeIds.map((themeId) => {
              const theme = getCosmeticTheme(themeId);
              const equippable = founderUnlocked && canEquipTheme(theme.id);
              return (
                <label
                  key={theme.id}
                  className={state.themeId === theme.id && state.faceThemeId === theme.id ? "selected" : previewThemeId === theme.id ? "previewing" : ""}
                >
                  <input
                    type="radio"
                    name={`${titleId}-theme`}
                    value={theme.id}
                    checked={state.themeId === theme.id && state.faceThemeId === theme.id}
                    disabled={!equippable}
                    onChange={() => {
                      if (!canEquipTheme(theme.id)) return;
                      setPreviewThemeId(null);
                      commit(selectCompletePhotoSkinStyle(state, theme.id), `${theme.label} complete identity equipped for public play.`);
                    }}
                  />
                  <span className="skin-theme-swatches" aria-hidden="true">
                    {theme.palette.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
                  </span>
                  <strong>
                    {theme.label}
                    <em className="skin-theme-tier tier-legend">LEGEND</em>
                  </strong>
                  <small>{theme.description}</small>
                  {!founderUnlocked && (
                    <button
                      type="button"
                      className="skin-founder-preview"
                      data-testid={`founder-preview-${theme.id}`}
                      onClick={() => {
                        setPreviewThemeId(previewThemeId === theme.id ? null : theme.id);
                        setStatus(previewThemeId === theme.id
                          ? "Preview closed."
                          : `${theme.label} preview — your equipped theme is unchanged.`);
                      }}
                    >
                      {previewThemeId === theme.id ? "CLOSE PREVIEW" : "PREVIEW"}
                    </button>
                  )}
                </label>
              );
            })}
          </div>
          <small className="skin-founder-owned">HISTORIC TEST GRANT ACTIVE ON THIS DEVICE · pick any legend above.</small>
        </fieldset>
      )}

      <fieldset className="skin-studio-motion" data-testid="skin-studio-motion">
        <legend>MATERIAL MOTION &amp; GLOW · THIS DEVICE</legend>
        <div className="skin-motion-levels" role="radiogroup" aria-label="Material motion level">
          {MATERIAL_MOTION_LEVELS.map((level) => (
            <label key={level} className={renderPrefs.materialMotion === level ? "selected" : ""}>
              <input
                type="radio"
                name={`${titleId}-material-motion`}
                value={level}
                checked={renderPrefs.materialMotion === level}
                onChange={() => {
                  const next = writeRenderPreferences({ ...renderPrefs, materialMotion: level });
                  setRenderPrefs(next);
                  setStatus(`Material motion set to ${MOTION_LEVEL_COPY[level].label.toLowerCase()}.`);
                }}
              />
              <strong>{MOTION_LEVEL_COPY[level].label}</strong>
              <small>{MOTION_LEVEL_COPY[level].detail}</small>
            </label>
          ))}
        </div>
        <label className="skin-motion-glow">
          <input
            type="checkbox"
            checked={renderPrefs.materialGlow}
            onChange={(event) => {
              const next = writeRenderPreferences({
                ...renderPrefs,
                materialGlow: event.currentTarget.checked,
              });
              setRenderPrefs(next);
              setStatus(next.materialGlow ? "Material glow enabled." : "Material glow disabled.");
            }}
          />
          <span>
            <strong>LANTERN GLOW</strong>
            Soft bloom on the material's brightest pass. Turn off on older devices.
          </span>
        </label>
        <small>Graphics settings for this device only. Other captains still see your theme's material, painted at their own settings.</small>
      </fieldset>

      <div className="skin-studio-worm-preview" data-testid="skin-studio-worm-preview">
        <div>
          <strong>YOUR FACE + BODY PREVIEW</strong>
          <span>{getPreviewLabel(state)}</span>
        </div>
        <canvas
          ref={previewCanvasRef}
          role="img"
          aria-label={`${getCosmeticTheme(state.faceThemeId).label} face with ${bodySkinLabel(state.themeId)} body preview`}
        >
          Continuous Wormifi skin preview.
        </canvas>
        <small>The face and body are independent. Optional private photos affect body bands only.</small>
      </div>

      <div className="skin-studio-photo-heading">
        <strong>OPTIONAL · PRIVATE PHOTO BODY OVERLAY</strong>
        <span>This does not change your selected cinematic face.</span>
      </div>

      <div className="skin-studio-privacy" id={privacyId}>
        <strong>{PHOTO_SKIN_PRIVACY_PROMISE}</strong>
        <span>{PHOTO_SKIN_MULTIPLAYER_PROMISE}</span>
        <small>{storageStatus}</small>
      </div>

      <label className="skin-studio-consent" htmlFor={consentId}>
        <input
          id={consentId}
          type="checkbox"
          checked={state.consented}
          onChange={(event) => handleConsent(event.currentTarget.checked)}
        />
        <span>
          <strong>EXPLICIT PHOTO CONSENT</strong>
          {PHOTO_SKIN_CONSENT_TEXT}
          {state.consented && state.photos.length > 0 && <small>Unchecking immediately deletes every stored photo copy.</small>}
        </span>
      </label>

      <div className="skin-studio-import">
        <div>
          <strong>LOCAL PHOTO STRIP</strong>
          <span>{state.photos.length} / {PHOTO_SKIN_MAX_PHOTOS} · JPEG, PNG OR WEBP</span>
        </div>
        <label className={state.consented && !processing && state.photos.length < PHOTO_SKIN_MAX_PHOTOS ? "" : "disabled"}>
          <span>{processing ? "SANITIZING…" : state.photos.length > 0 ? "ADD PHOTOS" : "CHOOSE 2–6 PHOTOS"}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={PHOTO_SKIN_ACCEPT}
            multiple
            disabled={!state.consented || processing || state.photos.length >= PHOTO_SKIN_MAX_PHOTOS}
            aria-label="Choose two to six JPEG, PNG, or WebP photos"
            onChange={(event) => void handleFiles(Array.from(event.currentTarget.files ?? []))}
          />
        </label>
      </div>

      {state.photos.length > 0 && (
        <ol className="skin-photo-list" aria-label="Ordered private Photo Skin images">
          {state.photos.map((photo, index) => (
            <li key={photo.id} data-testid="skin-photo" data-photo-id={photo.id}>
              <div className="skin-photo-preview">
                <img
                  src={photo.dataUrl}
                  alt={`Private local photo ${index + 1} preview`}
                  draggable={false}
                  style={{ objectPosition: `${photo.focalPoint.x * 100}% ${photo.focalPoint.y * 100}%` }}
                />
                <span>{index + 1}</span>
              </div>
              <div className="skin-photo-controls">
                <strong>PHOTO {index + 1}</strong>
                <span>{photo.width}×{photo.height} sanitized pixels · {Math.max(1, Math.round(photo.byteSize / 1024))} KB</span>
                <label>
                  <span>FOCUS LEFT ↔ RIGHT · {Math.round(photo.focalPoint.x * 100)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(photo.focalPoint.x * 100)}
                    aria-label={`Photo ${index + 1} horizontal focal crop`}
                    onChange={(event) => commit(
                      setPhotoSkinFocalPoint(state, photo.id, {
                        x: Number(event.currentTarget.value) / 100,
                        y: photo.focalPoint.y,
                      }),
                      `Photo ${index + 1} focal crop updated.`,
                    )}
                  />
                </label>
                <label>
                  <span>FOCUS TOP ↕ BOTTOM · {Math.round(photo.focalPoint.y * 100)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(photo.focalPoint.y * 100)}
                    aria-label={`Photo ${index + 1} vertical focal crop`}
                    onChange={(event) => commit(
                      setPhotoSkinFocalPoint(state, photo.id, {
                        x: photo.focalPoint.x,
                        y: Number(event.currentTarget.value) / 100,
                      }),
                      `Photo ${index + 1} focal crop updated.`,
                    )}
                  />
                </label>
                <div>
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => commit(reorderPhotoSkinPhoto(state, photo.id, -1), `Photo ${index + 1} moved earlier.`)}
                    aria-label={`Move photo ${index + 1} earlier`}
                  >↑</button>
                  <button
                    type="button"
                    disabled={index === state.photos.length - 1}
                    onClick={() => commit(reorderPhotoSkinPhoto(state, photo.id, 1), `Photo ${index + 1} moved later.`)}
                    aria-label={`Move photo ${index + 1} later`}
                  >↓</button>
                  <button
                    type="button"
                    onClick={() => commit(
                      removePhotoSkinPhoto(state, photo.id),
                      state.photos.length - 1 < PHOTO_SKIN_MIN_PHOTOS
                        ? `Photo removed. Add another photo to enable the local Photo Skin.`
                        : "Photo removed from local storage.",
                    )}
                    aria-label={`Remove photo ${index + 1}`}
                  >REMOVE</button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="skin-studio-enable">
        <label className={!ready ? "disabled" : ""}>
          <input
            type="checkbox"
            checked={state.enabled}
            disabled={!ready}
            onChange={(event) => commit(
              setPhotoSkinEnabled(state, event.currentTarget.checked),
              event.currentTarget.checked
                ? "Private Photo Skin enabled on this device."
                : "Private Photo Skin paused. Your authored theme remains active.",
            )}
          />
          <span>
            <strong>USE PRIVATE PHOTOS ON THIS DEVICE</strong>
            {ready
              ? "Only your local renderer may consume the sanitized images."
              : `Add at least ${PHOTO_SKIN_MIN_PHOTOS} photos and grant consent to enable.`}
          </span>
        </label>
        <button
          type="button"
          className="skin-studio-clear"
          disabled={state.photos.length === 0}
          onClick={() => commit(clearPhotoSkinPhotos(state), "Every locally stored Photo Skin image was deleted.")}
        >CLEAR ALL PHOTOS</button>
      </div>

      <div className="skin-studio-messages">
        <p role="status" aria-live="polite">{status}</p>
        {error && <p className="skin-studio-error" role="alert">{error}</p>}
      </div>
    </section>
  );
}

function getPreviewLabel(state: PhotoSkinState): string {
  const body = bodySkinLabel(state.themeId);
  const face = getCosmeticTheme(state.faceThemeId).label;
  if (state.enabled && isPhotoSkinReady(state)) {
    return `${face} FACE · ${body} BODY · ${state.photos.length} PRIVATE BANDS`;
  }
  return `${face} FACE · ${body} BODY`;
}

function bodySkinLabel(themeId: PhotoSkinState["themeId"]): string {
  const parentSkinId = wormateParentSkinIdFromThemeId(themeId);
  return parentSkinId === undefined
    ? getCosmeticTheme(themeId).label
    : wormateParentSkinLabel(getWormateParentSkin(parentSkinId));
}

function ParentSkinCarousel({
  state,
  onSelect,
}: {
  state: PhotoSkinState;
  onSelect: (skinId: typeof WORMATE_PARENT_SKINS[number]["id"]) => void;
}) {
  const selectedId = wormateParentSkinIdFromThemeId(state.themeId) ??
    DEFAULT_WORMATE_PARENT_SKIN_ID;
  const currentIndex = Math.max(
    0,
    WORMATE_PARENT_SKINS.findIndex((skin) => skin.id === selectedId),
  );
  const current = WORMATE_PARENT_SKINS[currentIndex];
  const selectOffset = (offset: number) => {
    const nextIndex = (
      currentIndex + offset + WORMATE_PARENT_SKINS.length
    ) % WORMATE_PARENT_SKINS.length;
    onSelect(WORMATE_PARENT_SKINS[nextIndex].id);
  };

  return (
    <section
      className="skin-studio-parent-carousel"
      data-testid="parent-skin-catalog"
      data-parent-revision={WORMATE_PARENT_REVISION}
      data-parent-skin-count={WORMATE_PARENT_SKINS.length}
    >
      <header>
        <span>PARENT LIBRARY · EXACT REVISION {WORMATE_PARENT_REVISION}</span>
        <strong>{WORMATE_PARENT_SKINS.length} AUTHORIZED BODY SKINS</strong>
      </header>
      <div>
        <button
          type="button"
          aria-label="Previous parent body skin"
          data-testid="parent-skin-previous"
          onClick={() => selectOffset(-1)}
        >‹</button>
        <button
          type="button"
          className="skin-studio-parent-current"
          aria-pressed={wormateParentSkinIdFromThemeId(state.themeId) === current.id}
          data-testid="parent-skin-current"
          onClick={() => onSelect(current.id)}
        >
          <ParentSkinStrip skinId={current.id} />
          <small>{current.groupLabel.toUpperCase()}</small>
          <strong>{wormateParentSkinLabel(current)}</strong>
          <span>{currentIndex + 1} / {WORMATE_PARENT_SKINS.length}</span>
        </button>
        <button
          type="button"
          aria-label="Next parent body skin"
          data-testid="parent-skin-next"
          onClick={() => selectOffset(1)}
        >›</button>
      </div>
      <p>The exact parent atlas drives the arena body above. Wormifi originals stay available below as extras.</p>
    </section>
  );
}

const PARENT_WEARABLE_COPY: Record<
  WormateParentWearableKind,
  { label: string; detail: string }
> = {
  eyes: { label: "EYES", detail: "20 exact parent eye sets" },
  mouth: { label: "MOUTHS", detail: "94 exact parent expressions" },
  glasses: { label: "GLASSES", detail: "28 exact parent frames" },
  hat: { label: "HATS", detail: "119 exact parent headpieces" },
};

function selectedWearableId(
  outfit: Readonly<WormateParentOutfit>,
  kind: WormateParentWearableKind,
): number {
  if (kind === "eyes") return outfit.eyeId;
  if (kind === "mouth") return outfit.mouthId;
  if (kind === "glasses") return outfit.glassesId;
  return outfit.hatId;
}

function outfitWithWearable(
  outfit: Readonly<WormateParentOutfit>,
  kind: WormateParentWearableKind,
  wearableId: number,
): WormateParentOutfit {
  if (kind === "eyes") return { ...outfit, eyeId: wearableId as WormateParentOutfit["eyeId"] };
  if (kind === "mouth") return { ...outfit, mouthId: wearableId as WormateParentOutfit["mouthId"] };
  if (kind === "glasses") return { ...outfit, glassesId: wearableId as WormateParentOutfit["glassesId"] };
  return { ...outfit, hatId: wearableId as WormateParentOutfit["hatId"] };
}

function ParentWearableStudio({
  state,
  onSelect,
}: {
  state: PhotoSkinState;
  onSelect: (kind: WormateParentWearableKind, wearable: WormateParentWearable) => void;
}) {
  const [kind, setKind] = useState<WormateParentWearableKind>("eyes");
  const appearance = wormateParentAppearanceFromThemeId(state.themeId) ?? {
    skinId: DEFAULT_WORMATE_PARENT_SKIN_ID,
    outfit: {
      eyeId: 0,
      mouthId: 0,
      glassesId: 0,
      hatId: 0,
    } as WormateParentOutfit,
  };
  const catalog = WORMATE_PARENT_WEARABLE_CATALOGS[kind] as readonly WormateParentWearable[];
  const selectedId = selectedWearableId(appearance.outfit, kind);

  return (
    <section
      className="skin-studio-parent-wearables"
      data-testid="parent-wearable-catalog"
      data-parent-wearable-count={
        WORMATE_PARENT_WEARABLE_CATALOGS.eyes.length +
        WORMATE_PARENT_WEARABLE_CATALOGS.mouth.length +
        WORMATE_PARENT_WEARABLE_CATALOGS.glasses.length +
        WORMATE_PARENT_WEARABLE_CATALOGS.hat.length
      }
    >
      <header>
        <span>PARENT WEAR ATLAS · EXACT REVISION {WORMATE_PARENT_REVISION}</span>
        <strong>261 AUTHORIZED FACE + HEAD-WEAR CHOICES</strong>
      </header>
      <div className="skin-studio-parent-wearable-tabs" role="tablist" aria-label="Parent wearable category">
        {(Object.keys(PARENT_WEARABLE_COPY) as WormateParentWearableKind[]).map((candidate) => (
          <button
            key={candidate}
            type="button"
            role="tab"
            aria-selected={kind === candidate}
            className={kind === candidate ? "selected" : ""}
            data-testid={`parent-wearable-tab-${candidate}`}
            onClick={() => setKind(candidate)}
          >
            <strong>{PARENT_WEARABLE_COPY[candidate].label}</strong>
            <small>{PARENT_WEARABLE_COPY[candidate].detail}</small>
          </button>
        ))}
      </div>
      <div
        className="skin-studio-parent-wearable-grid"
        role="radiogroup"
        aria-label={`Exact parent ${PARENT_WEARABLE_COPY[kind].label.toLowerCase()}`}
        data-testid={`parent-wearable-grid-${kind}`}
      >
        {catalog.map((wearable) => {
          const selected = wearable.id === selectedId &&
            wormateParentSkinIdFromThemeId(state.themeId) !== undefined;
          return (
            <button
              key={wearable.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={wormateParentWearableLabel(kind, wearable)}
              className={selected ? "selected" : ""}
              data-parent-wearable-id={wearable.id}
              onClick={() => onSelect(kind, wearable)}
            >
              <ParentWearableThumbnail
                skinId={appearance.skinId}
                outfit={outfitWithWearable(appearance.outfit, kind, wearable.id)}
              />
              <small>{String(wearable.id).padStart(4, "0")}</small>
            </button>
          );
        })}
      </div>
      <p>Every choice above is rendered from the parent wear atlas and travels in the public cosmetic ID.</p>
    </section>
  );
}

function ParentWearableThumbnail({
  skinId,
  outfit,
}: {
  skinId: WormateParentSkinId;
  outfit: Readonly<WormateParentOutfit>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    const paint = async () => {
      const ready = await preloadWormateParentVisuals();
      if (!ready || cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.round(72 * ratio);
      canvas.height = Math.round(58 * ratio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, 72, 58);
      drawWormateParentWorm(context, {
        points: [{ x: 42, y: 29 }, { x: 20, y: 29 }],
        headRadius: 23,
        bodyRadius: 18,
        direction: { x: 1, y: 0 },
        skinId,
        outfit,
      });
    };
    void paint();
    return () => {
      cancelled = true;
    };
  }, [skinId, outfit.eyeId, outfit.mouthId, outfit.glassesId, outfit.hatId]);
  return <canvas ref={canvasRef} width="72" height="58" aria-hidden="true" />;
}

function ParentSkinStrip({ skinId }: { skinId: WormateParentSkinId }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const paint = async () => {
      const ready = await preloadWormateParentVisuals();
      if (!ready || cancelled || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const width = 164;
      const height = 54;
      const pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      drawWormateParentWorm(context, {
        points: Array.from({ length: 7 }, (_, index) => ({
          x: 137 - index * 22,
          y: 27,
        })),
        headRadius: 22,
        bodyRadius: 20,
        direction: { x: 1, y: 0 },
        skinId,
      });
    };
    void paint();
    return () => {
      cancelled = true;
    };
  }, [skinId]);

  return (
    <canvas
      ref={canvasRef}
      className="skin-studio-parent-strip"
      width="164"
      height="54"
      aria-hidden="true"
    />
  );
}
