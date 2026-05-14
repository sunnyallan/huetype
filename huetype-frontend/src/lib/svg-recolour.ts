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

  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (doc.querySelector("parsererror")) return svg;

  const root = doc.documentElement;
  if (!root) return svg;

  const canvas = findCanvas(root);
  const units = collectLayerUnits(canvas);
  if (units.length === 0) return svg;

  if (units.length <= palette.length) {
    // Each <g> or standalone shape gets its own palette slot
    units.forEach((shapes, i) => {
      const colour = palette[i % palette.length];
      shapes.forEach((el) => forceFill(el, colour));
    });
    return new XMLSerializer().serializeToString(doc);
  }

  // More units than palette slots → group by source colour
  return recolourSvgByColour(svg, palette);
}

function findCanvas(el: Element): Element {
  // Skip Figma-style single-child wrapper groups
  while (true) {
    const children = Array.from(el.children).filter((c) => {
      const t = c.nodeName.toLowerCase();
      return SHAPE_TAGS.has(t) || t === "g";
    });
    if (children.length === 1 && children[0].nodeName.toLowerCase() === "g") {
      el = children[0];
      continue;
    }
    return el;
  }
}

function collectLayerUnits(canvas: Element): Element[][] {
  const units: Element[][] = [];
  for (const child of Array.from(canvas.children)) {
    const tag = child.nodeName.toLowerCase();
    if (tag === "g") {
      const inside: Element[] = [];
      const all = child.getElementsByTagName("*");
      for (let i = 0; i < all.length; i++) {
        if (SHAPE_TAGS.has(all[i].nodeName.toLowerCase())) {
          inside.push(all[i]);
        }
      }
      if (inside.length > 0) units.push(inside);
    } else if (SHAPE_TAGS.has(tag)) {
      units.push([child]);
    }
  }
  return units;
}

function forceFill(el: Element, colour: string): void {
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

function recolourSvgByColour(svg: string, palette: string[]): string {
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
