export type ControlScheme = "drag-anywhere" | "left-helm" | "right-helm";

export const CONTROL_SCHEME_STORAGE_KEY = "wormifi:control-scheme:v1";

export const CONTROL_SCHEME_OPTIONS: ReadonlyArray<{
  id: ControlScheme;
  label: string;
  detail: string;
}> = Object.freeze([
  { id: "drag-anywhere", label: "DRAG", detail: "Helm follows thumb" },
  { id: "left-helm", label: "LEFT HELM", detail: "Fixed left control" },
  { id: "right-helm", label: "RIGHT HELM", detail: "Fixed right control" },
]);

export function isControlScheme(value: unknown): value is ControlScheme {
  return value === "drag-anywhere" || value === "left-helm" || value === "right-helm";
}

export function readControlScheme(
  storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage,
): ControlScheme {
  try {
    const value = storage?.getItem(CONTROL_SCHEME_STORAGE_KEY);
    return isControlScheme(value) ? value : "drag-anywhere";
  } catch {
    return "drag-anywhere";
  }
}

export function writeControlScheme(
  scheme: ControlScheme,
  storage: Pick<Storage, "setItem"> | undefined = globalThis.localStorage,
) {
  try {
    storage?.setItem(CONTROL_SCHEME_STORAGE_KEY, scheme);
  } catch {
    // Storage may be unavailable in private or embedded browsing contexts.
  }
}

export function fixedHelmAnchor(
  width: number,
  height: number,
  scheme: ControlScheme,
): { x: number; y: number } | undefined {
  if (scheme === "drag-anywhere") return undefined;
  const edge = Math.min(92, Math.max(68, width * 0.2));
  return {
    x: Math.round(scheme === "left-helm" ? edge : width - edge),
    y: Math.round(height - Math.min(128, Math.max(96, height * 0.15))),
  };
}

export function touchStartsHelm(
  touch: { x: number; y: number },
  anchor: { x: number; y: number } | undefined,
  activationRadius = 96,
) {
  if (!anchor) return true;
  return Math.hypot(touch.x - anchor.x, touch.y - anchor.y) <= activationRadius;
}
