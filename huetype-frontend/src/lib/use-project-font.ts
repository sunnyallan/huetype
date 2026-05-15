"use client";

import { useEffect, useState } from "react";
import { api, type Glyph } from "@/lib/api";

type RGB = [number, number, number];

export type ProjectFont = {
  fontFamily: string;
  glyphs: Glyph[];
  paletteVariants: string[]; // CSS palette names (--name) including default
};

// In-memory cache so each card only fetches once per session
const fontCache = new Map<string, Promise<ProjectFont | null>>();

export function useProjectFont(
  projectId: string,
): { font: ProjectFont | null; loading: boolean } {
  const [font, setFont] = useState<ProjectFont | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    let promise = fontCache.get(projectId);
    if (!promise) {
      promise = loadProjectFont(projectId);
      fontCache.set(projectId, promise);
    }
    promise.then((f) => {
      if (!cancelled) {
        setFont(f);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return { font, loading };
}

async function loadProjectFont(projectId: string): Promise<ProjectFont | null> {
  try {
    const detail = await api.getProject(projectId);
    if (!detail.latest_job || detail.latest_job.status !== "complete") {
      return null;
    }
    if (!detail.glyphs?.length) return null;

    const { url } = await api.getDownloadUrl(
      projectId,
      detail.latest_job.id,
      "ttf",
    );
    const res = await fetch(url);
    const buf = await res.arrayBuffer();

    const palette = extractPalette(buf);
    if (palette.length === 0) return null;

    const family = `htproj-${projectId.slice(0, 8)}`;
    const styleId = `style-${family}`;

    // Use the FontFace API so the promise only resolves once the font
    // bytes are fully parsed and ready to render — no swap flash.
    // document.fonts.add() persists across client-side navigations so
    // returning to the dashboard also shows the correct preview instantly.
    //
    // NOTE: document.fonts.check() is unreliable for unknown families
    // (returns true via fallback), so iterate document.fonts to check
    // whether a face with this family is already registered.
    let alreadyLoaded = false;
    document.fonts.forEach((f) => {
      if (f.family === family && f.status === "loaded") alreadyLoaded = true;
    });
    if (!alreadyLoaded) {
      // Pass the ArrayBuffer directly — avoids blob URL roundtrip and
      // ensures the FontFace owns the bytes.
      const face = new FontFace(family, buf);
      await face.load();
      document.fonts.add(face);
    }

    // Build 4 hue-rotated palette variants and inject as CSS palette rules
    const variants: { name: string; colors: RGB[] }[] = [
      { name: `--${family}-p0`, colors: palette },
      { name: `--${family}-p1`, colors: palette.map((c) => rotateHue(c, 90)) },
      { name: `--${family}-p2`, colors: palette.map((c) => rotateHue(c, 180)) },
      { name: `--${family}-p3`, colors: palette.map((c) => rotateHue(c, 270)) },
    ];

    injectPaletteStyle(styleId, family, variants);

    return {
      fontFamily: family,
      glyphs: detail.glyphs,
      paletteVariants: variants.map((v) => v.name),
    };
  } catch {
    return null;
  }
}

/** Inject only @font-palette-values rules (idempotent via styleId). */
function injectPaletteStyle(
  styleId: string,
  family: string,
  variants: { name: string; colors: RGB[] }[],
) {
  if (document.getElementById(styleId)) return;

  const el = document.createElement("style");
  el.id = styleId;
  el.textContent = variants
    .map((v) => {
      const overrides = v.colors
        .map((c, i) => `${i} rgb(${c[0]},${c[1]},${c[2]})`)
        .join(", ");
      return `@font-palette-values ${v.name} { font-family: "${family}"; override-colors: ${overrides}; }`;
    })
    .join("\n");
  document.head.appendChild(el);
}

// ── CPAL palette extraction (mirrors font-preview.tsx) ───────────────────
function extractPalette(buf: ArrayBuffer): RGB[] {
  try {
    const view = new DataView(buf);
    const numTables = view.getUint16(4);
    let cpalOffset = -1;
    for (let i = 0; i < numTables; i++) {
      const off = 12 + i * 16;
      const tag = String.fromCharCode(
        view.getUint8(off),
        view.getUint8(off + 1),
        view.getUint8(off + 2),
        view.getUint8(off + 3),
      );
      if (tag === "CPAL") {
        cpalOffset = view.getUint32(off + 8);
        break;
      }
    }
    if (cpalOffset < 0) return [];
    const numPaletteEntries = view.getUint16(cpalOffset + 2);
    const colorRecordsArrayOffset = view.getUint32(cpalOffset + 8);
    const colors: RGB[] = [];
    for (let i = 0; i < numPaletteEntries; i++) {
      const o = cpalOffset + colorRecordsArrayOffset + i * 4;
      const b = view.getUint8(o);
      const g = view.getUint8(o + 1);
      const r = view.getUint8(o + 2);
      colors.push([r, g, b]);
    }
    return colors;
  } catch {
    return [];
  }
}

// ── Hue rotation in HSL space ────────────────────────────────────────────
function rotateHue([r, g, b]: RGB, degrees: number): RGB {
  const [h, s, l] = rgbToHsl(r, g, b);
  const newH = (h + degrees / 360 + 1) % 1;
  return hslToRgb(newH, s, l);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
