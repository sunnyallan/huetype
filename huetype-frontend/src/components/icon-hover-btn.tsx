"use client";

import { useState } from "react";
import { HueIcon, type HueGlyph, type HuePalette } from "./hue-icon";

interface IconHoverBtnProps {
  glyph: HueGlyph | string;
  size: number;
  restPalette: HuePalette;
  hoverPalette: HuePalette;
  onClick?: () => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * Icon button with opacity crossfade between two @font-palette-values.
 *
 * Two <HueIcon> elements are stacked absolutely inside a relative container.
 * On hover, the rest icon fades out and the hover icon fades in — 300ms
 * ease-in-out. This is the only reliable way to "animate" between two named
 * CSS font-palette values, since font-palette is not interpolatable.
 *
 * Rules (from CLAUDE.md):
 *   - Never set width/height on the outer <button> — only on the inner span.
 *   - Duration: 300ms ease-in-out.
 */
export default function IconHoverBtn({
  glyph,
  size,
  restPalette,
  hoverPalette,
  onClick,
  className = "",
  "aria-label": ariaLabel,
}: IconHoverBtnProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={ariaLabel}
      className={className}
    >
      <span
        className="ht-icon-stack"
        style={{
          position: "relative",
          display: "inline-flex",
          width: size,
          height: size,
          flexShrink: 0,
        }}
      >
        <HueIcon
          glyph={glyph}
          size={size}
          palette={restPalette}
          style={{
            position: "absolute",
            inset: 0,
            transition: "opacity 300ms ease-in-out",
            opacity: hovered ? 0 : 1,
          }}
        />
        <HueIcon
          glyph={glyph}
          size={size}
          palette={hoverPalette}
          style={{
            position: "absolute",
            inset: 0,
            transition: "opacity 300ms ease-in-out",
            opacity: hovered ? 1 : 0,
          }}
        />
      </span>
    </button>
  );
}
