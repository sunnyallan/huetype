"use client";

/**
 * Shared COLR v1 browser-support detection + Safari/iOS font swap.
 *
 * WHY NOT CSS.supports('font-palette', 'normal'):
 * Safari 15.4+ returns true for that property but still doesn't render
 * COLRv1 glyphs — they come out blank/invisible. We have to UA-sniff
 * Safari / iOS until WebKit ships full COLRv1 support.
 *
 * Track: https://bugs.webkit.org/show_bug.cgi?id=242154
 *
 * On Safari/iOS we hot-swap the "HueType" font to a SBIX (bitmap colour)
 * version at /hue-type-safari.ttf. SBIX is rendered natively by WebKit,
 * so glyphs render correctly with their baked-in colours. Note: SBIX is
 * a fixed-colour format — font-palette overrides have no visual effect
 * on Safari, but the glyphs themselves remain visible and on-brand.
 */

import { useEffect, useState } from "react";

const SBIX_FONT_URL = "/hue-type-safari.ttf";
const FONT_FAMILY = "HueType";

// Module-level caches — computed once per page load for the whole app
let _result: boolean | null = null;
let _sbixLoadStarted = false;

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
 * Load the SBIX-flavoured HueType font and register it under the same
 * "HueType" family name. The browser will prefer this face for PUA
 * glyphs since the COLR face renders nothing on WebKit.
 */
export async function ensureSbixFontLoaded(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_sbixLoadStarted) return;
  _sbixLoadStarted = true;

  // Skip if a HueType face has already been registered via FontFace API
  let alreadyLoaded = false;
  document.fonts.forEach((f) => {
    // Detect by checking if any HueType face is sourced from the SBIX URL.
    // FontFaceSet doesn't expose src, so we tag our face with a non-standard
    // display value as a marker — simpler: just guard with the module flag.
    if (f.family === FONT_FAMILY && f.status === "loaded") alreadyLoaded = true;
  });
  if (alreadyLoaded) {
    // Even if a HueType face is loaded, on Safari we still want the SBIX one —
    // the COLR face is "loaded" but visually empty for PUA glyphs.
  }

  try {
    const face = new FontFace(FONT_FAMILY, `url(${SBIX_FONT_URL})`, {
      display: "block",
    });
    const loaded = await face.load();
    document.fonts.add(loaded);
  } catch {
    // Safari font swap failed — glyphs will be invisible. UI must still
    // be usable via accompanying text labels (aria-label / sibling spans).
  }
}

/**
 * Returns true if the current browser renders COLRv1 colour fonts.
 * Defaults to true on SSR; correct value is set after first mount.
 *
 * Side effect: on Safari/iOS, also triggers a one-time load of the SBIX
 * HueType font so PUA glyphs render correctly.
 */
export function useColrSupport(): boolean {
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (_result === null) _result = detectColrSupport();
    setSupported(_result);
    if (!_result) {
      // Safari/iOS — load the SBIX font so glyphs become visible
      ensureSbixFontLoaded();
    }
  }, []);

  return supported;
}
