"use client";

import { useEffect, useState } from "react";
import { detectColrSupport } from "@/lib/use-colr-support";

/**
 * Pinned banner that appears on Safari / iOS only — warns users that
 * COLRv1 colour fonts aren't fully supported in WebKit yet, so they're
 * seeing a limited preview.
 *
 * Pairs with the .ht-no-colr <html> class (added by SafariFontInit) and
 * a globals.css rule that pushes <body> down by 36px so the banner
 * doesn't overlap sticky navbars.
 */
export default function SafariBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!detectColrSupport());
  }, []);

  if (!show) return null;

  return (
    <div className="ht-safari-banner" role="status" aria-live="polite">
      <strong>Best viewed on Chrome, Firefox or Edge</strong>
      <span className="hidden sm:inline">
        {" "}— Safari &amp; iOS render a limited preview of colour fonts.
      </span>
    </div>
  );
}
