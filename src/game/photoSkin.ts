import {
  COSMETIC_THEME_CATALOG as PHOTO_SKIN_THEMES,
  DEFAULT_COSMETIC_THEME_ID,
  getCosmeticTheme,
  isCosmeticThemeId,
  type CosmeticThemeId,
} from "./cosmeticThemes";

export {
  PHOTO_SKIN_THEMES,
  DEFAULT_COSMETIC_THEME_ID,
  getCosmeticTheme,
  isCosmeticThemeId,
};
export {
  COSMETIC_THEME_CATALOG,
  isCosmeticTheme,
  type CosmeticTheme,
  type CosmeticThemeId,
} from "./cosmeticThemes";

export const PHOTO_SKIN_STORAGE_KEY = "wormifi:photo-skin:v1";
export const PHOTO_SKIN_STATE_VERSION = 1 as const;
export const PHOTO_SKIN_MIN_PHOTOS = 2;
export const PHOTO_SKIN_MAX_PHOTOS = 6;
export const PHOTO_SKIN_MAX_SOURCE_BYTES = 12 * 1024 * 1024;
export const PHOTO_SKIN_MAX_EDGE_PX = 768;
export const PHOTO_SKIN_MAX_DATA_URL_LENGTH = 2_000_000;
export const PHOTO_SKIN_ACCEPT = "image/jpeg,image/png,image/webp";

export const PHOTO_SKIN_PRIVACY_PROMISE = "PHOTOS NEVER UPLOAD OR LEAVE THIS DEVICE.";
export const PHOTO_SKIN_MULTIPLAYER_PROMISE =
  "Other players see only your authored Wormifi theme. Photos stay private until a separate moderated public-sharing contract is built and approved.";
export const PHOTO_SKIN_CONSENT_TEXT =
  "I have permission to use these photos and consent to processing and storing sanitized copies only in this browser on this device.";

export const PHOTO_SKIN_PRIVACY_CONTRACT = {
  processing: "on-device-only",
  storage: "local-browser-only",
  uploads: "never",
  multiplayerVisibility: "authored-theme-only",
  moderatedPublicSharingRequired: true,
} as const;

export type PhotoSkinThemeId = CosmeticThemeId;
export type SanitizedPhotoMimeType = "image/jpeg" | "image/png" | "image/webp";

export interface PhotoSkinFocalPoint {
  /** Normalized horizontal focus, from the left edge (0) to the right edge (1). */
  x: number;
  /** Normalized vertical focus, from the top edge (0) to the bottom edge (1). */
  y: number;
}

export interface PhotoSkinPhoto {
  id: string;
  /** Sanitized, re-encoded pixels. Original files and filenames are never persisted. */
  dataUrl: string;
  mimeType: SanitizedPhotoMimeType;
  width: number;
  height: number;
  byteSize: number;
  focalPoint: PhotoSkinFocalPoint;
  sanitized: true;
  addedAtMs: number;
}

export interface PhotoSkinState {
  version: typeof PHOTO_SKIN_STATE_VERSION;
  consented: boolean;
  enabled: boolean;
  themeId: PhotoSkinThemeId;
  photos: PhotoSkinPhoto[];
  privacy: typeof PHOTO_SKIN_PRIVACY_CONTRACT;
  updatedAtMs: number;
}

export interface PhotoSkinStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PhotoSkinReadResult {
  state: PhotoSkinState;
  error?: string;
}

export interface PhotoSkinRasterResult {
  blob: Blob;
  width: number;
  height: number;
}

export type PhotoSkinRasterizer = (
  file: File,
  options: { maximumEdgePx: number; quality: number },
) => Promise<PhotoSkinRasterResult>;

export interface PhotoSkinCoverCrop {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export interface PhotoSkinRenderPlan {
  theme: typeof PHOTO_SKIN_THEMES[number];
  localPhotosEnabled: boolean;
  localPhotos: readonly PhotoSkinPhoto[];
  /** This is the only multiplayer-safe cosmetic value until moderation exists. */
  multiplayerAppearance: {
    themeId: PhotoSkinThemeId;
    includesPhotos: false;
  };
}

const ALLOWED_PHOTO_MIME_TYPES = new Set<SanitizedPhotoMimeType>([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const DEFAULT_THEME_ID: PhotoSkinThemeId = DEFAULT_COSMETIC_THEME_ID;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0.5));
}

function nowMs(): number {
  return Date.now();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isThemeId(value: unknown): value is PhotoSkinThemeId {
  return isCosmeticThemeId(value);
}

function isSanitizedMimeType(value: unknown): value is SanitizedPhotoMimeType {
  return typeof value === "string" && ALLOWED_PHOTO_MIME_TYPES.has(value as SanitizedPhotoMimeType);
}

function expectedDataUrlPrefix(mimeType: SanitizedPhotoMimeType): string {
  return `data:${mimeType};base64,`;
}

function normalizeStoredPhoto(value: unknown): PhotoSkinPhoto | undefined {
  if (!isRecord(value)) return undefined;
  if (
    typeof value.id !== "string" || value.id.length < 1 || value.id.length > 96 ||
    typeof value.dataUrl !== "string" || value.dataUrl.length > PHOTO_SKIN_MAX_DATA_URL_LENGTH ||
    !isSanitizedMimeType(value.mimeType) ||
    !value.dataUrl.startsWith(expectedDataUrlPrefix(value.mimeType)) ||
    typeof value.width !== "number" || !Number.isInteger(value.width) || value.width < 1 || value.width > PHOTO_SKIN_MAX_EDGE_PX ||
    typeof value.height !== "number" || !Number.isInteger(value.height) || value.height < 1 || value.height > PHOTO_SKIN_MAX_EDGE_PX ||
    typeof value.byteSize !== "number" || !Number.isInteger(value.byteSize) || value.byteSize < 1 ||
    value.sanitized !== true ||
    typeof value.addedAtMs !== "number" || !Number.isFinite(value.addedAtMs) ||
    !isRecord(value.focalPoint) ||
    typeof value.focalPoint.x !== "number" || typeof value.focalPoint.y !== "number"
  ) return undefined;

  return {
    id: value.id,
    dataUrl: value.dataUrl,
    mimeType: value.mimeType,
    width: value.width,
    height: value.height,
    byteSize: value.byteSize,
    focalPoint: {
      x: clamp01(value.focalPoint.x),
      y: clamp01(value.focalPoint.y),
    },
    sanitized: true,
    addedAtMs: value.addedAtMs,
  };
}

function browserStorage(): PhotoSkinStorage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function privacyContract(): typeof PHOTO_SKIN_PRIVACY_CONTRACT {
  return { ...PHOTO_SKIN_PRIVACY_CONTRACT };
}

export function createDefaultPhotoSkinState(timestamp = nowMs()): PhotoSkinState {
  return {
    version: PHOTO_SKIN_STATE_VERSION,
    consented: false,
    enabled: false,
    themeId: DEFAULT_THEME_ID,
    photos: [],
    privacy: privacyContract(),
    updatedAtMs: timestamp,
  };
}

export function normalizePhotoSkinState(value: unknown, timestamp = nowMs()): PhotoSkinState {
  if (!isRecord(value) || value.version !== PHOTO_SKIN_STATE_VERSION) {
    return createDefaultPhotoSkinState(timestamp);
  }

  const consented = value.consented === true;
  const seenIds = new Set<string>();
  const photos = consented && Array.isArray(value.photos)
    ? value.photos
      .map(normalizeStoredPhoto)
      .filter((photo): photo is PhotoSkinPhoto => {
        if (!photo || seenIds.has(photo.id)) return false;
        seenIds.add(photo.id);
        return true;
      })
      .slice(0, PHOTO_SKIN_MAX_PHOTOS)
    : [];
  const enabled = consented && photos.length >= PHOTO_SKIN_MIN_PHOTOS && value.enabled === true;

  return {
    version: PHOTO_SKIN_STATE_VERSION,
    consented,
    enabled,
    themeId: isThemeId(value.themeId) ? value.themeId : DEFAULT_THEME_ID,
    photos,
    privacy: privacyContract(),
    updatedAtMs: typeof value.updatedAtMs === "number" && Number.isFinite(value.updatedAtMs)
      ? value.updatedAtMs
      : timestamp,
  };
}

export function readPhotoSkinState(storage: PhotoSkinStorage | undefined = browserStorage()): PhotoSkinReadResult {
  if (!storage) {
    return {
      state: createDefaultPhotoSkinState(),
      error: "Local browser storage is unavailable. Photo Skin changes cannot persist on this device.",
    };
  }
  try {
    const raw = storage.getItem(PHOTO_SKIN_STORAGE_KEY);
    if (!raw) return { state: createDefaultPhotoSkinState() };
    return { state: normalizePhotoSkinState(JSON.parse(raw)) };
  } catch {
    return {
      state: createDefaultPhotoSkinState(),
      error: "The saved Photo Skin could not be read. No photo data was loaded.",
    };
  }
}

export function writePhotoSkinState(
  state: PhotoSkinState,
  storage: PhotoSkinStorage | undefined = browserStorage(),
): void {
  if (!storage) throw new Error("Local browser storage is unavailable.");
  const normalized = normalizePhotoSkinState(state, state.updatedAtMs);
  storage.setItem(PHOTO_SKIN_STORAGE_KEY, JSON.stringify(normalized));
}

export function removeStoredPhotoSkin(storage: PhotoSkinStorage | undefined = browserStorage()): void {
  if (!storage) throw new Error("Local browser storage is unavailable.");
  storage.removeItem(PHOTO_SKIN_STORAGE_KEY);
}

export function isPhotoSkinReady(state: PhotoSkinState): boolean {
  return state.consented &&
    state.photos.length >= PHOTO_SKIN_MIN_PHOTOS &&
    state.photos.length <= PHOTO_SKIN_MAX_PHOTOS;
}

export function setPhotoSkinConsent(
  state: PhotoSkinState,
  consented: boolean,
  timestamp = nowMs(),
): PhotoSkinState {
  if (!consented) {
    return {
      ...state,
      consented: false,
      enabled: false,
      photos: [],
      privacy: privacyContract(),
      updatedAtMs: timestamp,
    };
  }
  return {
    ...state,
    consented: true,
    privacy: privacyContract(),
    updatedAtMs: timestamp,
  };
}

export function setPhotoSkinEnabled(
  state: PhotoSkinState,
  enabled: boolean,
  timestamp = nowMs(),
): PhotoSkinState {
  return {
    ...state,
    enabled: enabled && isPhotoSkinReady(state),
    updatedAtMs: timestamp,
  };
}

export function selectPhotoSkinTheme(
  state: PhotoSkinState,
  themeId: PhotoSkinThemeId,
  timestamp = nowMs(),
): PhotoSkinState {
  return {
    ...state,
    themeId: isThemeId(themeId) ? themeId : DEFAULT_THEME_ID,
    updatedAtMs: timestamp,
  };
}

export function addPhotoSkinPhotos(
  state: PhotoSkinState,
  photos: readonly PhotoSkinPhoto[],
  timestamp = nowMs(),
): PhotoSkinState {
  if (!state.consented) throw new Error("Photo consent is required before adding photos.");
  if (state.photos.length + photos.length > PHOTO_SKIN_MAX_PHOTOS) {
    throw new Error(`Photo Skin supports at most ${PHOTO_SKIN_MAX_PHOTOS} photos.`);
  }
  if (photos.some((photo) => normalizeStoredPhoto(photo) === undefined)) {
    throw new Error("Only sanitized Photo Skin images can be stored.");
  }
  const existingIds = new Set(state.photos.map((photo) => photo.id));
  if (photos.some((photo) => {
    if (existingIds.has(photo.id)) return true;
    existingIds.add(photo.id);
    return false;
  })) {
    throw new Error("A Photo Skin image cannot be added twice.");
  }
  return {
    ...state,
    photos: [...state.photos, ...photos],
    updatedAtMs: timestamp,
  };
}

export function removePhotoSkinPhoto(
  state: PhotoSkinState,
  photoId: string,
  timestamp = nowMs(),
): PhotoSkinState {
  const photos = state.photos.filter((photo) => photo.id !== photoId);
  return {
    ...state,
    photos,
    enabled: state.enabled && photos.length >= PHOTO_SKIN_MIN_PHOTOS,
    updatedAtMs: timestamp,
  };
}

export function clearPhotoSkinPhotos(state: PhotoSkinState, timestamp = nowMs()): PhotoSkinState {
  return {
    ...state,
    photos: [],
    enabled: false,
    updatedAtMs: timestamp,
  };
}

export function reorderPhotoSkinPhoto(
  state: PhotoSkinState,
  photoId: string,
  direction: -1 | 1,
  timestamp = nowMs(),
): PhotoSkinState {
  const currentIndex = state.photos.findIndex((photo) => photo.id === photoId);
  const nextIndex = currentIndex + direction;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= state.photos.length) return state;
  const photos = [...state.photos];
  [photos[currentIndex], photos[nextIndex]] = [photos[nextIndex], photos[currentIndex]];
  return { ...state, photos, updatedAtMs: timestamp };
}

export function setPhotoSkinFocalPoint(
  state: PhotoSkinState,
  photoId: string,
  focalPoint: PhotoSkinFocalPoint,
  timestamp = nowMs(),
): PhotoSkinState {
  let changed = false;
  const photos = state.photos.map((photo) => {
    if (photo.id !== photoId) return photo;
    changed = true;
    return {
      ...photo,
      focalPoint: { x: clamp01(focalPoint.x), y: clamp01(focalPoint.y) },
    };
  });
  return changed ? { ...state, photos, updatedAtMs: timestamp } : state;
}

export function validatePhotoSelection(existingCount: number, files: readonly File[]): string[] {
  const errors: string[] = [];
  if (files.length === 0) errors.push("Choose photos to continue.");
  if (existingCount === 0 && files.length > 0 && files.length < PHOTO_SKIN_MIN_PHOTOS) {
    errors.push(`Choose at least ${PHOTO_SKIN_MIN_PHOTOS} photos for a Photo Skin.`);
  }
  if (existingCount + files.length > PHOTO_SKIN_MAX_PHOTOS) {
    errors.push(`Photo Skin supports ${PHOTO_SKIN_MIN_PHOTOS}–${PHOTO_SKIN_MAX_PHOTOS} photos.`);
  }
  for (const file of files) errors.push(...validatePhotoFile(file));
  return errors;
}

export function validatePhotoFile(file: Pick<File, "name" | "size" | "type">): string[] {
  const label = file.name || "This file";
  const mimeType = file.type.toLowerCase();
  const errors: string[] = [];
  if (!ALLOWED_PHOTO_MIME_TYPES.has(mimeType as SanitizedPhotoMimeType)) {
    errors.push(`${label} must be a JPEG, PNG, or WebP image.`);
  }
  if (file.size < 1) errors.push(`${label} is empty.`);
  if (file.size > PHOTO_SKIN_MAX_SOURCE_BYTES) {
    errors.push(`${label} is larger than ${PHOTO_SKIN_MAX_SOURCE_BYTES / 1024 / 1024} MB.`);
  }
  return errors;
}

export async function sniffPhotoMimeType(file: Blob): Promise<SanitizedPhotoMimeType | undefined> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= png.length && png.every((byte, index) => bytes[index] === byte)) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) return "image/webp";
  return undefined;
}

export async function importPhotoSkinFile(
  file: File,
  rasterize: PhotoSkinRasterizer = reencodePhotoInBrowser,
  timestamp = nowMs(),
): Promise<PhotoSkinPhoto> {
  const metadataErrors = validatePhotoFile(file);
  if (metadataErrors.length > 0) throw new Error(metadataErrors.join(" "));
  const detectedMimeType = await sniffPhotoMimeType(file);
  if (!detectedMimeType || detectedMimeType !== file.type.toLowerCase()) {
    throw new Error(`${file.name || "This file"} does not match its declared image type.`);
  }

  const raster = await rasterize(file, { maximumEdgePx: PHOTO_SKIN_MAX_EDGE_PX, quality: 0.84 });
  if (!isSanitizedMimeType(raster.blob.type)) {
    throw new Error("This browser could not create a safe JPEG, PNG, or WebP copy.");
  }
  if (
    !Number.isInteger(raster.width) || !Number.isInteger(raster.height) ||
    raster.width < 1 || raster.height < 1 ||
    raster.width > PHOTO_SKIN_MAX_EDGE_PX || raster.height > PHOTO_SKIN_MAX_EDGE_PX
  ) throw new Error("The sanitized photo dimensions are invalid.");

  const dataUrl = await blobToDataUrl(raster.blob);
  if (dataUrl.length > PHOTO_SKIN_MAX_DATA_URL_LENGTH) {
    throw new Error("The sanitized photo is still too large for private local storage.");
  }
  return {
    id: createPhotoSkinId(),
    dataUrl,
    mimeType: raster.blob.type,
    width: raster.width,
    height: raster.height,
    byteSize: raster.blob.size,
    focalPoint: { x: 0.5, y: 0.5 },
    sanitized: true,
    addedAtMs: timestamp,
  };
}

export async function reencodePhotoInBrowser(
  file: File,
  options: { maximumEdgePx: number; quality: number },
): Promise<PhotoSkinRasterResult> {
  if (typeof document === "undefined") throw new Error("Photo processing requires a browser.");
  const decoded = await decodePhoto(file);
  try {
    const scale = Math.min(1, options.maximumEdgePx / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("This browser cannot prepare a private photo copy.");
    context.drawImage(decoded.source, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, "image/webp", options.quality);
    return { blob, width, height };
  } finally {
    decoded.release();
  }
}

async function decodePhoto(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through to an HTMLImageElement for browsers with partial bitmap support.
    }
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new Image();
      candidate.decoding = "async";
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error("The selected photo could not be decoded."));
      candidate.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: SanitizedPhotoMimeType, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("The browser could not re-encode this photo."));
      else resolve(blob);
    }, mimeType, quality);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader === "undefined") {
    return blob.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]);
      return `data:${blob.type};base64,${btoa(binary)}`;
    });
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("The sanitized photo could not be stored."));
    reader.onerror = () => reject(new Error("The sanitized photo could not be stored."));
    reader.readAsDataURL(blob);
  });
}

function createPhotoSkinId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `local-photo-${crypto.randomUUID()}`;
  }
  return `local-photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getPhotoSkinTheme(themeId: PhotoSkinThemeId) {
  return getCosmeticTheme(themeId);
}

export function createPhotoSkinRenderPlan(state: PhotoSkinState): PhotoSkinRenderPlan {
  const localPhotosEnabled = state.enabled && isPhotoSkinReady(state);
  return {
    theme: getPhotoSkinTheme(state.themeId),
    localPhotosEnabled,
    localPhotos: localPhotosEnabled ? state.photos : [],
    multiplayerAppearance: {
      themeId: state.themeId,
      includesPhotos: false,
    },
  };
}

export function photoForBodyIndex(state: PhotoSkinState, bodyIndex: number): PhotoSkinPhoto | undefined {
  const plan = createPhotoSkinRenderPlan(state);
  if (!plan.localPhotosEnabled || plan.localPhotos.length === 0) return undefined;
  const normalizedIndex = ((Math.trunc(bodyIndex) % plan.localPhotos.length) + plan.localPhotos.length) % plan.localPhotos.length;
  return plan.localPhotos[normalizedIndex];
}

export function calculatePhotoSkinCoverCrop(
  photo: Pick<PhotoSkinPhoto, "focalPoint">,
  sourceWidth: number,
  sourceHeight: number,
  destinationAspectRatio = 1,
): PhotoSkinCoverCrop {
  if (
    !Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 || sourceHeight <= 0 ||
    !Number.isFinite(destinationAspectRatio) || destinationAspectRatio <= 0
  ) throw new Error("Photo crop dimensions must be positive finite numbers.");

  const sourceAspect = sourceWidth / sourceHeight;
  const sw = sourceAspect > destinationAspectRatio ? sourceHeight * destinationAspectRatio : sourceWidth;
  const sh = sourceAspect > destinationAspectRatio ? sourceHeight : sourceWidth / destinationAspectRatio;
  const maximumX = sourceWidth - sw;
  const maximumY = sourceHeight - sh;
  return {
    sx: maximumX * clamp01(photo.focalPoint.x),
    sy: maximumY * clamp01(photo.focalPoint.y),
    sw,
    sh,
  };
}

interface CachedPhotoImage {
  dataUrl: string;
  promise: Promise<HTMLImageElement>;
}

/** Local data-URL cache for a later canvas renderer. It never performs a network request. */
export class PhotoSkinImageCache {
  private readonly images = new Map<string, CachedPhotoImage>();

  get(photo: PhotoSkinPhoto): Promise<HTMLImageElement> {
    const cached = this.images.get(photo.id);
    if (cached?.dataUrl === photo.dataUrl) return cached.promise;
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      if (typeof Image === "undefined") {
        reject(new Error("Photo Skin images can only be decoded in a browser."));
        return;
      }
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("A sanitized Photo Skin image could not be decoded."));
      image.src = photo.dataUrl;
    });
    this.images.set(photo.id, { dataUrl: photo.dataUrl, promise });
    return promise;
  }

  warm(state: PhotoSkinState): Promise<HTMLImageElement[]> {
    return Promise.all(createPhotoSkinRenderPlan(state).localPhotos.map((photo) => this.get(photo)));
  }

  delete(photoId: string): void {
    this.images.delete(photoId);
  }

  clear(): void {
    this.images.clear();
  }
}
