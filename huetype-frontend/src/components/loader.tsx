"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = ["", "", "", ""];

const PALETTES: [number, number, number][][] = [
  // Original — warm
  [
    [30, 132, 73], [39, 174, 96], [169, 223, 191],
    [192, 57, 43], [230, 126, 34], [231, 76, 60],
    [241, 148, 138], [243, 156, 18], [253, 235, 208],
    [255, 107, 53], [255, 217, 61], [255, 245, 183],
  ],
  // Purple-pink
  [
    [60, 40, 100], [124, 106, 245], [200, 190, 255],
    [180, 50, 120], [255, 100, 200], [255, 200, 230],
    [200, 180, 255], [140, 120, 220], [220, 210, 255],
    [80, 60, 140], [180, 160, 240], [230, 220, 255],
  ],
  // Cyan-mint
  [
    [10, 80, 90], [20, 184, 166], [186, 255, 235],
    [0, 100, 130], [56, 189, 248], [186, 230, 255],
    [186, 230, 255], [16, 185, 200], [220, 250, 255],
    [20, 130, 150], [56, 220, 200], [220, 255, 250],
  ],
  // Sunset
  [
    [120, 30, 30], [231, 76, 60], [255, 200, 200],
    [180, 40, 80], [244, 114, 182], [255, 220, 230],
    [255, 230, 240], [251, 146, 60], [255, 235, 200],
    [120, 50, 30], [253, 186, 116], [255, 245, 220],
  ],
];

const FONT_FACE_CSS = `
@font-face {
  font-family: "HueTypeLoader";
  src: url("/huetype-demo.ttf") format("truetype");
  font-display: swap;
}
`;

type Size = "sm" | "md" | "lg";

const SIZE_PX: Record<Size, number> = {
  sm: 32,
  md: 56,
  lg: 88,
};

const GAP_PX: Record<Size, number> = {
  sm: 4,
  md: 8,
  lg: 14,
};

type Props = {
  /** Visual size of each glyph */
  size?: Size;
  /** Optional message shown under the loader */
  label?: string;
  /** Show full-screen overlay (covers parent with bg) */
  overlay?: boolean;
  /** After this many ms, swap in the long-wait message */
  longWaitMs?: number;
  /** Message to show after longWaitMs has elapsed */
  longWaitLabel?: string;
};

export default function Loader({
  size = "md",
  label,
  overlay = false,
  longWaitMs = 4000,
  longWaitLabel = "Waking up the server… this can take 30–40s on the free plan.",
}: Props) {
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [activeGlyph, setActiveGlyph] = useState(0);
  const [longWait, setLongWait] = useState(false);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Inject font-face once
  useEffect(() => {
    if (document.getElementById("ht-loader-font")) return;
    const el = document.createElement("style");
    el.id = "ht-loader-font";
    el.textContent = FONT_FACE_CSS;
    document.head.appendChild(el);
  }, []);

  // Cycle palette and glyph
  useEffect(() => {
    const palInt = setInterval(() => {
      setPaletteIdx((i) => (i + 1) % PALETTES.length);
    }, 900);
    const glyphInt = setInterval(() => {
      setActiveGlyph((g) => (g + 1) % GLYPHS.length);
    }, 350);
    return () => {
      clearInterval(palInt);
      clearInterval(glyphInt);
    };
  }, []);

  // Long-wait detection
  useEffect(() => {
    const t = setTimeout(() => setLongWait(true), longWaitMs);
    return () => clearTimeout(t);
  }, [longWaitMs]);

  // Inject dynamic palette overrides
  useEffect(() => {
    if (!styleRef.current) {
      const el = document.createElement("style");
      document.head.appendChild(el);
      styleRef.current = el;
    }
    const overrides = PALETTES[paletteIdx]
      .map((c, i) => `${i} rgb(${c[0]},${c[1]},${c[2]})`)
      .join(",");
    styleRef.current.textContent = `
      @font-palette-values --ht-loader {
        font-family: "HueTypeLoader";
        override-colors: ${overrides};
      }
      .ht-loader-glyph {
        font-family: "HueTypeLoader";
        font-palette: --ht-loader;
      }
    `;
  }, [paletteIdx]);

  const px = SIZE_PX[size];
  const gap = GAP_PX[size];

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
                fontSize: `${px}px`,
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
