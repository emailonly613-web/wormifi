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
  selectPhotoSkinTheme,
  setPhotoSkinConsent,
  setPhotoSkinEnabled,
  setPhotoSkinFocalPoint,
  validatePhotoSelection,
  writePhotoSkinState,
  type PhotoSkinState,
  type PhotoSkinStorage,
} from "../game/photoSkin";
import { drawPhotoSkinCanvas } from "../game/photoSkinCanvas";
import { drawContinuousPirateWorm } from "../game/treasureRender";

export interface SkinStudioProps {
  /** Used once on mount. Omit it to load the private local-browser state. */
  initialState?: PhotoSkinState;
  storage?: PhotoSkinStorage;
  onStateChange?: (state: PhotoSkinState) => void;
  onClose?: () => void;
  className?: string;
}

export function SkinStudio({
  initialState,
  storage,
  onStateChange,
  onClose,
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
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    let active = true;
    const renderPlan = createPhotoSkinRenderPlan(state);

    const paintPreview = (decodedImages: ReadonlyMap<string, CanvasImageSource>) => {
      if (!active) return;
      const width = Math.max(320, Math.round(canvas.clientWidth || 720));
      const height = Math.max(150, Math.round(canvas.clientHeight || 190));
      const scale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
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
      const points = Array.from({ length: 10 }, (_, index) => {
        const progress = index / 9;
        return {
          x: width * (0.84 - progress * 0.68),
          y: height * 0.53 + Math.sin(progress * Math.PI * 1.72) * height * 0.16,
        };
      });
      drawContinuousPirateWorm(context, {
        points,
        headRadius,
        bodyRadius,
        palette: renderPlan.theme.palette,
        direction: { x: 1, y: 0 },
        shielded: false,
        identity: 26,
        now: 0,
      });
      drawPhotoSkinCanvas(context, {
        points: points.slice(1),
        bodyRadius,
        direction: { x: -1, y: 0 },
        decodedImages,
        renderPlan,
      });
    };

    paintPreview(new Map());
    void Promise.all(renderPlan.localPhotos.map(async (photo) => {
      try {
        return [photo.id, await previewImageCacheRef.current.get(photo)] as const;
      } catch {
        return undefined;
      }
    })).then((entries) => {
      const decodedImages = new Map(
        entries.filter((entry): entry is readonly [string, HTMLImageElement] => entry !== undefined),
      );
      paintPreview(decodedImages);
    });

    return () => {
      active = false;
    };
  }, [state]);

  const commit = (next: PhotoSkinState, nextStatus: string) => {
    setState(next);
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
          <span className="skin-studio-kicker">PRIVATE COSMETIC WORKSHOP</span>
          <h2 id={titleId}>PHOTO SKIN STUDIO</h2>
        </div>
        {onClose && (
          <button type="button" className="skin-studio-close" onClick={onClose} aria-label="Close Photo Skin Studio">
            ×
          </button>
        )}
      </header>

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

      <fieldset className="skin-studio-themes">
        <legend>AUTHORED THEME OTHER PLAYERS CAN SEE</legend>
        <div>
          {PHOTO_SKIN_THEMES.map((theme) => (
            <label key={theme.id} className={state.themeId === theme.id ? "selected" : ""}>
              <input
                type="radio"
                name={`${titleId}-theme`}
                value={theme.id}
                checked={state.themeId === theme.id}
                onChange={() => commit(selectPhotoSkinTheme(state, theme.id), `${theme.label} selected for public play.`)}
              />
              <span className="skin-theme-swatches" aria-hidden="true">
                {theme.palette.map((color) => <i key={color} style={{ backgroundColor: color }} />)}
              </span>
              <strong>{theme.label}</strong>
              <small>{theme.description}</small>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="skin-studio-worm-preview" data-testid="skin-studio-worm-preview">
        <div>
          <strong>CONTINUOUS WORM PREVIEW</strong>
          <span>{getPreviewLabel(state)}</span>
        </div>
        <canvas
          ref={previewCanvasRef}
          role="img"
          aria-label={`${PHOTO_SKIN_THEMES.find((theme) => theme.id === state.themeId)?.label ?? "Wormifi"} continuous worm skin preview`}
        >
          Continuous Wormifi skin preview.
        </canvas>
        <small>Photos flow as overlapping body bands. They never change the worm's collision size or leave this device.</small>
      </div>

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
  if (state.enabled && isPhotoSkinReady(state)) return `${state.photos.length} PRIVATE PHOTO BANDS ACTIVE`;
  return "AUTHORED THEME ONLY";
}
