"use client";

import { useState } from "react";

/**
 * Hue Type wordmark. Prefers `/public/logo.png` if present; falls back
 * to a built-in SVG placeholder so dev doesn't 404 before the real
 * asset is dropped in.
 */
export function Logo({
  size = 64,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const [src, setSrc] = useState("/logo.png");

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Hue Type"
      width={size}
      height={size}
      onError={() => {
        if (src !== "/logo.svg") setSrc("/logo.svg");
      }}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
