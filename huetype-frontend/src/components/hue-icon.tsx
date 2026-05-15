"use client";

import { useEffect, useState } from "react";

/**
 * Hue Type icon font — used for in-app iconography.
 *
 * The font has 12 glyphs at U+E001…U+E00C. Codepoints are mapped to
 * semantic names below so call-sites read clearly.
 *
 * Glyph reference (rendered from /public/hue-type.ttf):
 *   E001  overlapping circles  →  illustration / palette
 *   E002  pie chart            →  tri-tone
 *   E003  diagonal arrow       →  external / go
 *   E004  cloud + up-arrow     →  upload
 *   E005  half-moon            →  duo-tone
 *   E006  pencil               →  edit
 *   E007  file + down-arrow    →  download
 *   E008  plus circle          →  add / new
 *   E009  tag X                →  remove
 *   E00A  Aa in frame          →  typography / new-type
 *   E00B  X circle             →  error / close
 *   E00C  swap arrows          →  swap / refresh
 */
export const HUE = {
  illustration: "",
  triTone:      "",
  goArrow:      "",
  upload:       "",
  duoTone:      "",
  edit:         "",
  download:     "",
  add:          "",
  remove:       "",
  newType:      "",
  close:        "",
  swap:         "",
} as const;

export type HueGlyph = keyof typeof HUE;

/** All 12 glyph chars in document order — handy for cycling. */
export const HUE_ALL: string[] = Array.from({ length: 12 }, (_, i) =>
  String.fromCodePoint(0xe001 + i),
);

/** Named palettes defined in globals.css. Use these to recolour an icon
 *  to suit its background — `default` keeps the font's baked-in colours. */
export type HuePalette =
  | "default"
  | "ink"
  | "grey-two"
  | "ink-lime"
  | "light-lime"
  | "mint"
  | "ref"
  | "ref-inv"
  | "duo"
  | "arrow"
  | "brand"
  | "icon"
  | "close-hover"
  | "edit-hover";

/**
 * Simple text/symbol fallbacks rendered when the browser doesn't support
 * COLR/font-palette (Safari / iOS as of 2026).
 * These keep the UI functional — buttons remain visible and labelled.
 */
const GLYPH_FALLBACK: Record<HueGlyph, string> = {
  illustration: "◉",
  triTone:      "◔",
  goArrow:      "↗",
  upload:       "↑",
  duoTone:      "◑",
  edit:         "✏",
  download:     "↓",
  add:          "+",
  remove:       "✕",
  newType:      "Aa",
  close:        "✕",
  swap:         "⇄",
};

/**
 * Detect whether the browser supports `font-palette`.
 * Returns `true` on SSR (so the server renders the real glyph).
 * On the client, if Safari/iOS returns false, HueIcon swaps to the
 * text fallback after first mount — the glyph was invisible anyway.
 */
function usePaletteSupport(): boolean {
  const [supported, setSupported] = useState(true); // SSR default: assume yes
  useEffect(() => {
    setSupported(
      typeof CSS !== "undefined" && CSS.supports("font-palette", "normal"),
    );
  }, []);
  return supported;
}

export function HueIcon({
  glyph,
  size = 16,
  palette = "default",
  className = "",
  style,
}: {
  glyph: HueGlyph | string;
  size?: number;
  palette?: HuePalette;
  className?: string;
  style?: React.CSSProperties;
}) {
  const paletteSupported = usePaletteSupport();
  const ch = glyph in HUE ? HUE[glyph as HueGlyph] : (glyph as string);

  // ── Safari / iOS fallback ─────────────────────────────────────────────
  // COLR/CPAL v1 fonts don't render in Safari. Since the codepoints are in
  // the Private Use Area there's no OS fallback character either — the glyph
  // is simply invisible. Show a plain Unicode symbol instead so buttons and
  // labels remain visible and usable.
  if (!paletteSupported) {
    const fb =
      glyph in GLYPH_FALLBACK
        ? GLYPH_FALLBACK[glyph as HueGlyph]
        : (glyph as string);
    return (
      <span
        aria-hidden
        className={className}
        style={{
          fontSize: size,
          lineHeight: 1,
          display: "inline-block",
          ...style,
        }}
      >
        {fb}
      </span>
    );
  }

  // ── Normal COLR render ────────────────────────────────────────────────
  return (
    <span
      aria-hidden
      className={className}
      style={
        {
          fontFamily: "HueType",
          fontPalette: `--ht-${palette}`,
          fontSize: size,
          lineHeight: 1,
          display: "inline-block",
          ...style,
        } as React.CSSProperties
      }
    >
      {ch}
    </span>
  );
}
