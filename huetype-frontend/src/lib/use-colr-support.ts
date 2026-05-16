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
 * HOW THE SAFARI SWAP WORKS:
 * On Safari/iOS we load the SBIX TTF under a SEPARATE font-family name
 * ("HueTypeSafari") rather than overloading the same "HueType" family.
 * Then we flip the `--ht-font` CSS variable so every consumer (HueIcon,
 * Loader, landing-page SVG) starts using "HueTypeSafari" instead.
 *
 * Why not reuse the "HueType" family name? Because the CSS-declared
 * @font-face for /hue-type.ttf (COLR) is still registered. Safari sees
 * both faces, picks the COLR one (first-declared wins for face-matching),
 * tries to render PUA glyphs from it, and produces invisible output.
 * Symptom: icons render briefly while SBIX is the only face, then vanish
 * once the COLR @font-face finishes loading and takes over.
 *
 * Using a separate family name eliminates the conflict entirely.
 */

import { useEffect, useState } from "react";

const SBIX_FONT_URL = "/hue-type-safari.ttf";
const SBIX_FAMILY = "HueTypeSafari";

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
 * Load the SBIX font under "HueTypeSafari" and flip --ht-font to it.
 * Idempotent — safe to call from multiple components on first mount.
 */
export async function ensureSbixFontLoaded(): Promise<void> {
  if (typeof window === "undefined") return;
  if (_sbixLoadStarted) return;
  _sbixLoadStarted = true;

  try {
    const face = new FontFace(SBIX_FAMILY, `url(${SBIX_FONT_URL})`, {
      display: "block",
    });
    const loaded = await face.load();
    document.fonts.add(loaded);

    // Flip the CSS variable. Every consumer of var(--ht-font, "HueType")
    // immediately switches to the SBIX face. The original "HueType" face
    // remains registered but no element references it anymore, so its
    // invisible-on-Safari glyphs never render.
    document.documentElement.style.setProperty(
      "--ht-font",
      `"${SBIX_FAMILY}"`,
    );
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
