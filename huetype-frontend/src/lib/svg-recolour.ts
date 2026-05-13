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

  const fills: string[] = [];
  const seen = new Set<string>();
  const record = (val: string) => {
    const n = normaliseColour(val);
    if (n && !seen.has(n)) {
      seen.add(n);
      fills.push(n);
    }
  };

  for (const m of svg.matchAll(/fill\s*=\s*["']([^"']+)["']/gi)) record(m[1]);
  for (const m of svg.matchAll(/fill\s*:\s*([^;}\s]+)/gi)) record(m[1]);

  const mapping = new Map<string, string>();
  fills.slice(0, palette.length).forEach((src, i) => mapping.set(src, palette[i]));

  return svg
    .replace(/fill\s*=\s*(["'])([^"']+)\1/gi, (m, q, val) => {
      const n = normaliseColour(val);
      return n && mapping.has(n) ? `fill=${q}${mapping.get(n)}${q}` : m;
    })
    .replace(/fill\s*:\s*([^;}\s]+)/gi, (m, val) => {
      const n = normaliseColour(val);
      return n && mapping.has(n) ? `fill: ${mapping.get(n)}` : m;
    });
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
