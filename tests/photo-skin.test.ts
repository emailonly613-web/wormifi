import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SkinStudio } from "../src/components/SkinStudio";
import {
  PHOTO_SKIN_MAX_PHOTOS,
  PHOTO_SKIN_MULTIPLAYER_PROMISE,
  PHOTO_SKIN_PRIVACY_CONTRACT,
  PHOTO_SKIN_PRIVACY_PROMISE,
  PHOTO_SKIN_STORAGE_KEY,
  addPhotoSkinPhotos,
  calculatePhotoSkinCoverCrop,
  clearPhotoSkinPhotos,
  createDefaultPhotoSkinState,
  createPhotoSkinRenderPlan,
  importPhotoSkinFile,
  isPhotoSkinReady,
  normalizePhotoSkinState,
  photoForBodyIndex,
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
  sniffPhotoMimeType,
  validatePhotoFile,
  validatePhotoSelection,
  writePhotoSkinState,
  type PhotoSkinPhoto,
  type PhotoSkinStorage,
} from "../src/game/photoSkin";

function fileFromBytes(name: string, type: string, bytes: number[]): File {
  const blob = new Blob([Uint8Array.from(bytes)], { type });
  Object.defineProperties(blob, {
    name: { value: name },
    lastModified: { value: 0 },
  });
  return blob as File;
}

function jpegFile(name = "family.jpg"): File {
  return fileFromBytes(name, "image/jpeg", [0xff, 0xd8, 0xff, 0xdb, 1, 2, 3, 4]);
}

function photo(id: string, x = 0.5, y = 0.5): PhotoSkinPhoto {
  return {
    id,
    dataUrl: "data:image/webp;base64,AA==",
    mimeType: "image/webp",
    width: 400,
    height: 300,
    byteSize: 1,
    focalPoint: { x, y },
    sanitized: true,
    addedAtMs: 100,
  };
}

function memoryStorage(initial?: string): PhotoSkinStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(PHOTO_SKIN_STORAGE_KEY, initial);
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); },
  };
}

describe("privacy-first Photo Skin state", () => {
  it("defaults to no consent, no photos, no upload, and authored-theme-only multiplayer", () => {
    const state = createDefaultPhotoSkinState(10);
    expect(state).toMatchObject({
      version: 1,
      consented: false,
      enabled: false,
      photos: [],
      privacy: PHOTO_SKIN_PRIVACY_CONTRACT,
      updatedAtMs: 10,
    });
    expect(PHOTO_SKIN_PRIVACY_PROMISE).toContain("NEVER UPLOAD OR LEAVE THIS DEVICE");
    expect(PHOTO_SKIN_MULTIPLAYER_PROMISE).toContain("selected public cosmetic ID");
    // A new captain is seeded a body from the full parent catalog rather than
    // always the plainest one, so assert the contract instead of a literal id:
    // the broadcast cosmetic is exactly the body the captain is wearing, it is
    // a real parent theme, and it resolves to a parent skin.
    expect(state.themeId).toMatch(/^wormate-parent-\d+$/u);
    expect(createPhotoSkinRenderPlan(state).multiplayerAppearance).toEqual({
      themeId: state.themeId,
      includesPhotos: false,
    });
    expect(typeof createPhotoSkinRenderPlan(state).parentSkinId).toBe("number");
    expect(state.faceThemeId).toBe("wormate-parent-32");
    expect(createPhotoSkinRenderPlan(state).faceTheme.id).toBe("tideglass-corsair");
  });

  it("separates body-only, face-only, and complete identity selections", () => {
    const original = createDefaultPhotoSkinState(1);
    const bodyOnly = selectPhotoSkinTheme(original, "gumball-ocean", 2);
    expect(bodyOnly).toMatchObject({
      themeId: "gumball-ocean",
      faceThemeId: "wormate-parent-32",
    });

    const faceOnly = selectPhotoSkinFace(bodyOnly, "gumball-berry", 3);
    expect(faceOnly).toMatchObject({
      themeId: "gumball-ocean",
      faceThemeId: "gumball-berry",
    });
    expect(createPhotoSkinRenderPlan(faceOnly)).toMatchObject({
      theme: { id: "gumball-ocean", palette: ["#27d7f5", "#2374ff", "#7657ff", "#72f1c7", "#e8ffff"] },
      faceTheme: { id: "gumball-berry", headHue: 320 },
    });

    expect(selectCompletePhotoSkinStyle(faceOnly, "prism-plume", 4)).toMatchObject({
      themeId: "prism-plume",
      faceThemeId: "prism-plume",
      updatedAtMs: 4,
    });
  });

  it("migrates a legacy saved theme into the matching face without losing photos", () => {
    const legacy = { ...createDefaultPhotoSkinState(1), themeId: "ruby-raider" } as Record<string, unknown>;
    delete legacy.faceThemeId;
    expect(normalizePhotoSkinState(legacy, 2)).toMatchObject({
      themeId: "ruby-raider",
      faceThemeId: "ruby-raider",
    });
  });

  it("persists modular face modes while repairing unknown legacy feature values", () => {
    let state = createDefaultPhotoSkinState(1);
    state = selectCaptainFaceMode(state, "features", 2);
    state = selectCaptainEyeStyle(state, "jewel", 3);
    state = selectCaptainExpressionStyle(state, "determined", 4);
    expect(state).toMatchObject({
      faceMode: "features",
      eyeStyle: "jewel",
      expressionStyle: "determined",
      updatedAtMs: 4,
    });
    expect(createPhotoSkinRenderPlan(state)).toMatchObject({
      faceMode: "features",
      eyeStyle: "jewel",
      expressionStyle: "determined",
      multiplayerAppearance: { includesPhotos: false },
    });

    expect(normalizePhotoSkinState({
      ...state,
      faceMode: "unknown-face",
      eyeStyle: "unknown-eyes",
      expressionStyle: "unknown-expression",
    }, 5)).toMatchObject({
      faceMode: "captain",
      eyeStyle: "round",
      expressionStyle: "grin",
    });
  });

  it("requires consent and two sanitized photos before enabling", () => {
    const original = createDefaultPhotoSkinState(1);
    expect(() => addPhotoSkinPhotos(original, [photo("one")], 2)).toThrow(/consent/i);

    let state = setPhotoSkinConsent(original, true, 3);
    state = addPhotoSkinPhotos(state, [photo("one")], 4);
    expect(isPhotoSkinReady(state)).toBe(false);
    expect(setPhotoSkinEnabled(state, true, 5).enabled).toBe(false);

    state = addPhotoSkinPhotos(state, [photo("two")], 6);
    expect(isPhotoSkinReady(state)).toBe(true);
    state = setPhotoSkinEnabled(state, true, 7);
    expect(state.enabled).toBe(true);
    expect(createPhotoSkinRenderPlan(state)).toMatchObject({
      localPhotosEnabled: true,
      multiplayerAppearance: { includesPhotos: false },
    });
  });

  it("withdraws consent by deleting photos and disabling the private skin", () => {
    let state = setPhotoSkinConsent(createDefaultPhotoSkinState(), true);
    state = addPhotoSkinPhotos(state, [photo("one"), photo("two")]);
    state = setPhotoSkinEnabled(state, true);
    state = setPhotoSkinConsent(state, false, 50);
    expect(state).toMatchObject({ consented: false, enabled: false, photos: [], updatedAtMs: 50 });
  });

  it("reorders, removes, clears, and clamps focal points without exposing filenames", () => {
    let state = setPhotoSkinConsent(createDefaultPhotoSkinState(), true);
    state = addPhotoSkinPhotos(state, [photo("one"), photo("two"), photo("three")]);
    state = reorderPhotoSkinPhoto(state, "three", -1, 20);
    expect(state.photos.map((entry) => entry.id)).toEqual(["one", "three", "two"]);

    state = setPhotoSkinFocalPoint(state, "three", { x: 4, y: -2 }, 21);
    expect(state.photos[1].focalPoint).toEqual({ x: 1, y: 0 });
    state = removePhotoSkinPhoto(state, "one", 22);
    expect(state.photos.map((entry) => entry.id)).toEqual(["three", "two"]);
    state = clearPhotoSkinPhotos(state, 23);
    expect(state.photos).toEqual([]);
    expect(state.enabled).toBe(false);
  });

  it("caps imports at six and validates a first selection as 2–6 supported images", () => {
    expect(validatePhotoSelection(0, [jpegFile()])).toContain("Choose at least 2 photos for a Photo Skin.");
    expect(validatePhotoSelection(5, [jpegFile("a.jpg"), jpegFile("b.jpg")])).toContain(
      "Photo Skin supports 2–6 photos.",
    );
    expect(validatePhotoFile(fileFromBytes("notes.txt", "text/plain", [1, 2]))).toContain(
      "notes.txt must be a JPEG, PNG, or WebP image.",
    );

    let state = setPhotoSkinConsent(createDefaultPhotoSkinState(), true);
    state = addPhotoSkinPhotos(state, Array.from({ length: PHOTO_SKIN_MAX_PHOTOS }, (_, index) => photo(`p${index}`)));
    expect(() => addPhotoSkinPhotos(state, [photo("overflow")])).toThrow(/at most 6/i);
  });

  it("sniffs JPEG, PNG, and WebP signatures instead of trusting extensions", async () => {
    const png = fileFromBytes("portrait.png", "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const webp = fileFromBytes("portrait.webp", "image/webp", [
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(await sniffPhotoMimeType(jpegFile())).toBe("image/jpeg");
    expect(await sniffPhotoMimeType(png)).toBe("image/png");
    expect(await sniffPhotoMimeType(webp)).toBe("image/webp");
    expect(await sniffPhotoMimeType(fileFromBytes("fake.jpg", "image/jpeg", [1, 2, 3]))).toBeUndefined();
  });

  it("imports only a re-encoded raster and drops original filename metadata", async () => {
    const rasterize = vi.fn(async () => ({
      blob: new Blob([Uint8Array.from([9, 8, 7])], { type: "image/webp" }),
      width: 640,
      height: 480,
    }));
    const imported = await importPhotoSkinFile(jpegFile("private-family-name.jpg"), rasterize, 500);
    expect(rasterize).toHaveBeenCalledOnce();
    expect(imported).toMatchObject({
      mimeType: "image/webp",
      width: 640,
      height: 480,
      sanitized: true,
      focalPoint: { x: 0.5, y: 0.5 },
      addedAtMs: 500,
    });
    expect(imported.dataUrl).toMatch(/^data:image\/webp;base64,/u);
    expect(JSON.stringify(imported)).not.toContain("private-family-name.jpg");
  });

  it("rejects a declared type that does not match the actual bytes", async () => {
    const disguisedPng = fileFromBytes(
      "disguised.jpg",
      "image/jpeg",
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    );
    await expect(importPhotoSkinFile(disguisedPng, vi.fn())).rejects.toThrow(/does not match/i);
  });

  it("round-trips only normalized local state and repairs a hostile privacy object", () => {
    const storage = memoryStorage();
    let state = setPhotoSkinConsent(createDefaultPhotoSkinState(1), true, 2);
    state = addPhotoSkinPhotos(state, [photo("one"), photo("two")], 3);
    state = selectPhotoSkinTheme(state, "coral-signal", 4);
    writePhotoSkinState(state, storage);
    const saved = storage.values.get(PHOTO_SKIN_STORAGE_KEY);
    expect(saved).toBeTruthy();

    const parsed = JSON.parse(saved ?? "{}") as Record<string, unknown>;
    parsed.privacy = { uploads: "sometimes", multiplayerVisibility: "all-photos" };
    storage.values.set(PHOTO_SKIN_STORAGE_KEY, JSON.stringify(parsed));
    const loaded = readPhotoSkinState(storage);
    expect(loaded.error).toBeUndefined();
    expect(loaded.state.privacy).toEqual(PHOTO_SKIN_PRIVACY_CONTRACT);
    expect(loaded.state.themeId).toBe("coral-signal");
    expect(loaded.state.photos).toHaveLength(2);
  });

  it("fails closed when stored JSON is unreadable or consent is absent", () => {
    expect(readPhotoSkinState(memoryStorage("not-json"))).toMatchObject({
      state: { consented: false, enabled: false, photos: [] },
      error: expect.stringContaining("could not be read"),
    });
    const normalized = normalizePhotoSkinState({
      ...createDefaultPhotoSkinState(),
      consented: false,
      enabled: true,
      photos: [photo("should-disappear")],
      privacy: { uploads: "always" },
    });
    expect(normalized).toMatchObject({ consented: false, enabled: false, photos: [] });
  });

  it("provides deterministic focal cover crops and cycling render helpers", () => {
    expect(calculatePhotoSkinCoverCrop(photo("wide", 1, 0.5), 800, 400, 1)).toEqual({
      sx: 400,
      sy: 0,
      sw: 400,
      sh: 400,
    });
    expect(calculatePhotoSkinCoverCrop(photo("tall", 0.5, 1), 400, 800, 1)).toEqual({
      sx: 0,
      sy: 400,
      sw: 400,
      sh: 400,
    });

    let state = setPhotoSkinConsent(createDefaultPhotoSkinState(), true);
    state = addPhotoSkinPhotos(state, [photo("one"), photo("two")]);
    state = setPhotoSkinEnabled(state, true);
    expect(photoForBodyIndex(state, 0)?.id).toBe("one");
    expect(photoForBodyIndex(state, 3)?.id).toBe("two");
    expect(photoForBodyIndex(state, -1)?.id).toBe("two");
  });

  it("renders explicit privacy, consent, status, file-type, and authored-theme semantics", () => {
    const markup = renderToStaticMarkup(createElement(SkinStudio, {
      initialState: createDefaultPhotoSkinState(1),
    }));
    expect(markup).toContain("CAPTAIN CUSTOMIZER");
    expect(markup).toContain("BODY SKIN ONLY");
    expect(markup).toContain("FACE ONLY");
    expect(markup).toContain("COMPLETE STYLES");
    // The parent company's catalogue is a source of bodies, not a brand we put
    // in front of players, and the copy has to read to a nine-year-old.
    expect(markup).toContain("BODY LIBRARY");
    expect(markup).toContain("190 BODIES TO PICK FROM");
    expect(markup).not.toMatch(/Wormate/iu);
    expect(markup).not.toMatch(/exact parent/iu);
    expect(markup).not.toMatch(/PARENT LIBRARY|AUTHORIZED BODY SKINS/u);
    expect(markup).toContain("WORMIFI ORIGINALS · EXTRA COLLECTION");
    expect(markup).toContain("PHOTOS NEVER UPLOAD OR LEAVE THIS DEVICE");
    expect(markup).toContain("Other players see only your selected public cosmetic ID");
    expect(markup).toContain("EXPLICIT PHOTO CONSENT");
    expect(markup).toContain('accept="image/jpeg,image/png,image/webp"');
    expect(markup).toContain("multiple");
    expect(markup).toContain('role="status"');
    expect(markup).toContain('data-photo-sharing="authored-theme-only"');
    expect(markup).toContain("TIDEGLASS CORSAIR");
    expect(markup).toContain("SUNKEN CROWN");
    expect(markup).toContain("CORAL SIGNAL");
  });
});
