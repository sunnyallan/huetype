"use client";

import { useEffect } from "react";
import { detectColrSupport, ensureSbixFontLoaded } from "@/lib/use-colr-support";

/**
 * Mounted once at the root of the app. On Safari/iOS, kicks off the SBIX
 * HueType font load immediately so glyphs are ready by the time anything
 * renders — instead of waiting for the first <HueIcon> to mount.
 *
 * Renders nothing.
 */
export default function SafariFontInit() {
  useEffect(() => {
    if (!detectColrSupport()) {
      ensureSbixFontLoaded();
    }
  }, []);
  return null;
}
