"use client";

import { useEffect } from "react";

/**
 * iOS Safari only computes `:active` styles on an element (needed for our
 * ComicButton tap feedback — scale/shadow/translate on `:active`) if
 * *something* on the page is listening for touch events. Without this,
 * buttons look and feel completely unresponsive on iPhone even though the
 * tap's action does fire — see docs/ARCHITECTURE.md "Known iOS quirks".
 * A single empty listener anywhere in the tree is enough to unlock it
 * page-wide, so this component renders nothing and just registers one.
 */
export function IOSActiveFix() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);

  return null;
}
