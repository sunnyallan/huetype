"use client";

import { useEffect, useRef, useState } from "react";
import { useColrSupport } from "@/lib/use-colr-support";

// Four visually rich glyphs from hue-type.ttf
// illustration (E001) · triTone (E002) · duoTone (E005) · newType (E00A)
const GLYPHS = [0xe001, 0xe002, 0xe005, 0xe00a].map((cp) =>
  String.fromCodePoint(cp),
);

// 3-slot CPAL palettes — slot 0 / 1 / 2
// HueType default: purple #7c6af5 · lime #e2ec5b · pink #ff6b9d
const PALETTES: [number, number, number][][] = [
  // Brand vivid
  [[124, 106, 245], [226, 236, 91], [255, 107, 157]],
  // Warm sunset
  [[220, 80, 50], [243, 186, 18], [255, 160, 190]],
  // Cyan-mint
  [[20, 160, 166], [160, 240, 210], [56, 189, 248]],
  // Earth-lime
  [[40, 110, 70], [184, 230, 100], [120, 200, 130]],
];

type Size = "sm" | "md" | "lg";

// Reduced glyph sizes (user request)
const SIZE_PX: Record<Size, number> = {
  sm: 20,
  md: 36,
  lg: 56,
};

const GAP_PX: Record<Size, number> = {
  sm: 4,
  md: 6,
  lg: 10,
};

type Props = {
  size?: Size;
  label?: string;
  overlay?: boolean;
  longWaitMs?: number;
  longWaitLabel?: string;
};

export default function Loader({
  size = "md",
  label,
  overlay = false,
  longWaitMs = 4000,
  longWaitLabel = "Waking up the server… this can take 30–40s on the free plan.",
}: Props) {
  const colrSupported = useColrSupport();
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [activeGlyph, setActiveGlyph] = useState(0);
  const [longWait, setLongWait] = useState(false);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Cycle palette and active glyph
  useEffect(() => {
    const palInt = setInterval(
      () => setPaletteIdx((i) => (i + 1) % PALETTES.length),
      900,
    );
    const glyphInt = setInterval(
      () => setActiveGlyph((g) => (g + 1) % GLYPHS.length),
      350,
    );
    return () => {
      clearInterval(palInt);
      clearInterval(glyphInt);
    };
  }, []);

  // Long-wait label
  useEffect(() => {
    const t = setTimeout(() => setLongWait(true), longWaitMs);
    return () => clearTimeout(t);
  }, [longWaitMs]);

  // Inject / update dynamic @font-palette-values for HueType (3 slots)
  useEffect(() => {
    if (!styleRef.current) {
      const el = document.createElement("style");
      document.head.appendChild(el);
      styleRef.current = el;
    }
    const overrides = PALETTES[paletteIdx]
      .map((c, i) => `${i} rgb(${c[0]},${c[1]},${c[2]})`)
      .join(", ");
    styleRef.current.textContent = `
      @font-palette-values --ht-loader {
        font-family: "HueType";
        override-colors: ${overrides};
      }
      .ht-loader-glyph {
        font-family: "HueType";
        font-palette: --ht-loader;
      }
    `;
  }, [paletteIdx]);

  const px = SIZE_PX[size];
  const gap = GAP_PX[size];

  // Note: colrSupported is read so the hook triggers the Safari SBIX font load,
  // but we render the same glyph markup regardless — the SBIX font carries the
  // same 12 glyphs at the same codepoints, just as bitmaps instead of vectors.
  void colrSupported;

  const inner = (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center" style={{ gap }}>
        {GLYPHS.map((g, i) => {
          const active = i === activeGlyph;
          return (
            <span
              key={i}
              className="ht-loader-glyph block transition-all duration-300"
              style={{
                fontSize: px,
                lineHeight: 1,
                opacity: active ? 1 : 0.18,
                transform: active ? "scale(1.0)" : "scale(0.78)",
              }}
            >
              {g}
            </span>
          );
        })}
      </div>
      {(label || longWait) && (
        <p className="text-xs text-text-secondary max-w-xs text-center leading-relaxed">
          {longWait ? longWaitLabel : label}
        </p>
      )}
    </div>
  );

  if (!overlay) return inner;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
      {inner}
    </div>
  );
}
