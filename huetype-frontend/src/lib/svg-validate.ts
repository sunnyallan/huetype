/**
 * Client-side SVG validator. Mirrors backend rules so we can reject bad uploads
 * instantly without a round-trip.
 *
 * Validates:
 *   - File is well-formed XML
 *   - Root element is <svg>
 *   - 1:1 aspect ratio (viewBox or width/height)
 *   - For duo/tri-tone projects: unique fill count matches required slots
 */

import type { FontType } from "./api";

// Tokens that aren't actually colours and shouldn't count toward layer count
const NON_COLOURS = new Set([
  "none",
  "transparent",
  "currentcolor",
  "inherit",
  "initial",
  "unset",
]);

export type ValidateResult =
  | { ok: true }
  | { ok: false; error: string };

export async function validateSvgFile(
  file: File,
  fontType: FontType,
): Promise<ValidateResult> {
  if (!file.name.toLowerCase().endsWith(".svg")) {
    return { ok: false, error: `${file.name}: only .svg files are accepted.` };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: `${file.name} is larger than 2 MB.` };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: `${file.name}: could not read file.` };
  }

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(text, "image/svg+xml");
  } catch {
    return { ok: false, error: `${file.name}: not a valid SVG.` };
  }

  // DOMParser reports XML errors via a <parsererror> child
  if (doc.querySelector("parsererror")) {
    return {
      ok: false,
      error: `${file.name}: not valid XML — could not parse.`,
    };
  }

  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg") {
    return {
      ok: false,
      error: `${file.name}: root element is not <svg>.`,
    };
  }

  // ── Aspect ratio (1:1) ────────────────────────────────────────────────
  const aspect = readAspectRatio(root);
  if (aspect === null) {
    return {
      ok: false,
      error: `${file.name}: SVG must declare a viewBox or width/height.`,
    };
  }
  if (Math.abs(aspect.ratio - 1) > 0.01) {
    return {
      ok: false,
      error: `${file.name}: must be 1:1 square. This one is ${formatNum(
        aspect.w,
      )}×${formatNum(aspect.h)} (${aspect.ratio.toFixed(2)}:1). Resize the artboard before uploading.`,
    };
  }

  // ── Fill count vs font type ────────────────────────────────────────────
  const colourCount = countUniqueFills(text);
  const shapeCount = countShapeElements(doc);

  if (colourCount === 0) {
    return {
      ok: false,
      error: `${file.name}: no solid fill colours found. Add fill='#…' to each shape.`,
    };
  }

  // Reject gradients/patterns (we can't recolour them)
  if (/fill\s*=\s*["']url\(/i.test(text)) {
    return {
      ok: false,
      error: `${file.name}: uses gradient or pattern fills which Hue Type can't process. Use solid fills only.`,
    };
  }

  if (fontType === "duo" && colourCount > 2) {
    return {
      ok: false,
      error: `${file.name}: duo-tone allows up to 2 distinct fill colours. This SVG uses ${colourCount} (${shapeCount} shapes).`,
    };
  }
  if (fontType === "tri" && colourCount > 3) {
    return {
      ok: false,
      error: `${file.name}: tri-tone allows up to 3 distinct fill colours. This SVG uses ${colourCount} (${shapeCount} shapes).`,
    };
  }

  return { ok: true };
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

function countShapeElements(doc: Document): number {
  let count = 0;
  const all = doc.documentElement?.getElementsByTagName("*");
  if (!all) return 0;
  for (let i = 0; i < all.length; i++) {
    if (SHAPE_TAGS.has(all[i].nodeName.toLowerCase())) count++;
  }
  return count;
}

function readAspectRatio(
  svg: Element,
): { w: number; h: number; ratio: number } | null {
  const viewBox =
    svg.getAttribute("viewBox") || svg.getAttribute("viewbox") || "";
  const parts = viewBox.replace(/,/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 4) {
    const w = Number(parts[2]);
    const h = Number(parts[3]);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return { w, h, ratio: w / h };
    }
  }

  const wAttr = svg.getAttribute("width") || "";
  const hAttr = svg.getAttribute("height") || "";
  const w = parseFloat(wAttr);
  const h = parseFloat(hAttr);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return { w, h, ratio: w / h };
  }

  return null;
}

function countUniqueFills(text: string): number {
  const fills = new Set<string>();

  // fill="..." attribute (permissive — filter inside normalise)
  const attrRe = /fill\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(text))) {
    const v = normalise(m[1]);
    if (v) fills.add(v);
  }

  // fill: <value> (inline style, <style> blocks, etc.)
  const styleRe = /fill\s*:\s*([^;}\s"']+)/gi;
  while ((m = styleRe.exec(text))) {
    const v = normalise(m[1]);
    if (v) fills.add(v);
  }

  return fills.size;
}

function normalise(value: string): string | null {
  const v = value.trim().toLowerCase().replace(/[;,]$/g, "");
  if (!v || NON_COLOURS.has(v)) return null;
  if (v.startsWith("url(") || v.startsWith("var(")) return null;
  if (v.startsWith("#") && v.length === 4) {
    return "#" + v.slice(1).split("").map((c) => c + c).join("");
  }
  return v;
}

function formatNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}
