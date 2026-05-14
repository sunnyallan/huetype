/**
 * Client-side SVG recolour. Mirrors the backend algorithm so duo/tri-tone
 * previews look the same before and after the font is built.
 *
 *   1. Find unique fill colours in document order (attribute + style)
 *   2. Map source[i] → palette[i]
 *   3. Rewrite fills, leaving the rest of the SVG untouched
 */

export function recolourSvg(svg: string, palette: string[]): string {
  if (palette.length === 0) return svg;
  // Use per-shape assignment to match the backend recolour for duo/tri-tone
  return recolourSvgByShape(svg, palette);
}

const SHAPE_TAGS = new Set([
  "path",
  "rect",
  "circle",
  "ellipse",
  "polygon",
  "polyline",
  "line",
]);

/**
 * Per-shape recolour. Every fillable shape gets its own palette slot
 * (shape i → palette[i % palette.length]), independent of source colour.
 * Mirrors the backend's recolor_svg_by_shape behaviour.
 */
export function recolourSvgByShape(svg: string, palette: string[]): string {
  if (palette.length === 0) return svg;

  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (doc.querySelector("parsererror")) return svg;

  const all = doc.getElementsByTagName("*");
  let idx = 0;
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (!SHAPE_TAGS.has(el.nodeName.toLowerCase())) continue;
    const colour = palette[idx % palette.length];
    idx += 1;

    // Strip any conflicting fill from inline style so the attribute wins
    const style = el.getAttribute("style");
    if (style) {
      const cleaned = style
        .replace(/fill\s*:\s*[^;]+;?/gi, "")
        .trim()
        .replace(/;+$/, "");
      if (cleaned) el.setAttribute("style", cleaned);
      else el.removeAttribute("style");
    }
    el.setAttribute("fill", colour);
    el.removeAttribute("class");
  }

  return new XMLSerializer().serializeToString(doc);
}

const NON_COLOURS = new Set([
  "none",
  "transparent",
  "currentcolor",
  "inherit",
  "initial",
  "unset",
]);

export function normaliseColour(value: string): string | null {
  const v = value.trim().toLowerCase().replace(/[;,]$/g, "");
  if (!v || NON_COLOURS.has(v)) return null;
  if (v.startsWith("url(") || v.startsWith("var(")) return null;
  if (v.startsWith("#") && v.length === 4) {
    return "#" + v.slice(1).split("").map((c) => c + c).join("");
  }
  return v;
}

/**
 * Build a data: URL from an SVG string for use in <img src>.
 */
export function svgToDataUrl(svg: string): string {
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
