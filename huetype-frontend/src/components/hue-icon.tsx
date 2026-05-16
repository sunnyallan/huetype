"use client";

import { useColrSupport } from "@/lib/use-colr-support";

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
  illustration: "",
  triTone:      "",
  goArrow:      "",
  upload:       "",
  duoTone:      "",
  edit:         "",
  download:     "",
  add:          "",
  remove:       "",
  newType:      "",
  close:        "",
  swap:         "",
} as const;

export type HueGlyph = keyof typeof HUE;

/** All 12 glyph chars in document order — handy for cycling. */
export const HUE_ALL: string[] = Array.from({ length: 12 }, (_, i) =>
  String.fromCodePoint(0xe001 + i),
);

/** Named palettes defined in globals.css. Use these to recolour an icon
 *  to suit its background — `default` keeps the font's baked-in colours.
 *  On Safari/iOS the SBIX font carries fixed colours, so palette overrides
 *  have no visual effect — glyphs always render with their baked-in palette. */
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
  // Side effect: triggers SBIX font load on Safari/iOS so the same glyph
  // chars become visible. We don't branch on the return value — the font
  // swap is transparent to the rendered output.
  useColrSupport();

  const ch = glyph in HUE ? HUE[glyph as HueGlyph] : (glyph as string);

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
