"use client";

/**
 * Hue Type wordmark — the lime "ht" with black outline.
 * Asset lives at /public/logo.svg.
 */
export function Logo({
  size = 64,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.svg"
      alt="Hue Type"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
