export const CAPTAIN_FACE_MODES = ["captain", "features", "eyes-only"] as const;
export type CaptainFaceMode = typeof CAPTAIN_FACE_MODES[number];

export const CAPTAIN_EYE_STYLES = ["round", "lookout", "sleepy", "jewel"] as const;
export type CaptainEyeStyle = typeof CAPTAIN_EYE_STYLES[number];

export const CAPTAIN_EXPRESSION_STYLES = [
  "grin",
  "determined",
  "surprised",
  "none",
] as const;
export type CaptainExpressionStyle = typeof CAPTAIN_EXPRESSION_STYLES[number];

export const DEFAULT_CAPTAIN_FACE_MODE: CaptainFaceMode = "captain";
export const DEFAULT_CAPTAIN_EYE_STYLE: CaptainEyeStyle = "round";
export const DEFAULT_CAPTAIN_EXPRESSION_STYLE: CaptainExpressionStyle = "grin";

export function isCaptainFaceMode(value: unknown): value is CaptainFaceMode {
  return typeof value === "string" &&
    (CAPTAIN_FACE_MODES as readonly string[]).includes(value);
}

export function isCaptainEyeStyle(value: unknown): value is CaptainEyeStyle {
  return typeof value === "string" &&
    (CAPTAIN_EYE_STYLES as readonly string[]).includes(value);
}

export function isCaptainExpressionStyle(
  value: unknown,
): value is CaptainExpressionStyle {
  return typeof value === "string" &&
    (CAPTAIN_EXPRESSION_STYLES as readonly string[]).includes(value);
}
