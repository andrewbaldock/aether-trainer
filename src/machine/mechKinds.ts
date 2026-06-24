import type { MechKind } from "../data/mechanics";

// Visual identity for each mechanism kind: a color, an icon glyph, and a badge
// shape. This is what breaks the visual homogeneity — a guard always reads as a
// gold diamond, a store as a purple square, a stream as a mint circle, etc.

export type BadgeShape = "pill" | "circle" | "square" | "diamond";

export type MechKindMeta = {
  /** Human label, shown as a small tag (doubles as the legend). */
  label: string;
  /** Accent color (hex). */
  color: string;
  /** Single-glyph icon rendered in the badge. */
  icon: string;
  /** Badge outline shape. */
  shape: BadgeShape;
};

export const MECH_KIND_META: Record<MechKind, MechKindMeta> = {
  endpoint: { label: "Endpoint", color: "#5fb0e0", icon: "⇄", shape: "pill" },
  transform: { label: "Transform", color: "#7fd4e0", icon: "ƒ", shape: "pill" },
  stream: { label: "Stream", color: "#5fe3a1", icon: "≋", shape: "circle" },
  store: { label: "Store", color: "#b08fe0", icon: "▦", shape: "square" },
  model: { label: "Model", color: "#e06f6f", icon: "✦", shape: "circle" },
  guard: { label: "Guard", color: "#f2c94c", icon: "!", shape: "diamond" },
  config: { label: "Config", color: "#e0a14f", icon: "⚙", shape: "square" },
};
