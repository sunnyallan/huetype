"use client";

/**
 * Shared COLR v1 browser-support detection.
 *
 * WHY NOT CSS.supports('font-palette', 'normal'):
 * Safari 15.4+ returns true for that property but still doesn't render
 * COLRv1 glyphs — they come out blank/invisible. We have to UA-sniff
 * Safari / iOS until WebKit ships full COLRv1 support.
 *
 * Track: https://bugs.webkit.org/show_bug.cgi?id=242154
 *
 * Used by: HueIcon (glyph fallbacks), Loader (CSS spinner fallback).
 * Remove the UA check and switch back to CSS.supports once resolved.
 */

import { useEffect, useState } from "react";

// Module-level cache — computed once per page load for the whole app
let _result: boolean | null = null;

export function detectColrSupport(): boolean {
  if (typeof window === "undefined") return true; // SSR: assume supported

  const ua = navigator.userAgent;

  // iOS always uses WebKit regardless of which browser the user chose
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // macOS Safari — Chrome, Edge, Firefox all include "Safari" in their UA
  // so we have to exclude them explicitly
  const isSafari =
    /Safari/.test(ua) &&
    !/Chrome|Chromium|CriOS|FxiOS|EdgA|OPR/.test(ua);

  if (isIOS || isSafari) return false;

  return typeof CSS !== "undefined" && CSS.supports("font-palette", "normal");
}

/**
 * Returns true if the current browser renders COLRv1 colour fonts.
 * Defaults to true on SSR; correct value is set after first mount.
 *
 * Since the detection result is constant for a given browser session,
 * a module-level cache means the UA check runs only once regardless of
 * how many HueIcon / Loader instances are on screen.
 */
export function useColrSupport(): boolean {
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (_result === null) _result = detectColrSupport();
    setSupported(_result);
  }, []);

  return supported;
}
