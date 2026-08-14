"use client";

import { useEffect } from "react";

const EDGE_START_PX = 26;
const MIN_HORIZONTAL_DISTANCE_PX = 72;
const MAX_VERTICAL_DISTANCE_PX = 58;

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true'], [data-no-swipe-back='true']"
    )
  );
}

/**
 * Web fallback for devices/WebViews that do not hand an edge gesture to the
 * Android back dispatcher. Android native back remains the primary path.
 */
export default function MobileSwipeBack() {
  useEffect(() => {
    let native = false;
    let activePointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let triggered = false;

    void import("@capacitor/core")
      .then(({ Capacitor }) => {
        native = Capacitor.isNativePlatform();
      })
      .catch(() => {
        native = false;
      });

    const onPointerDown = (event: PointerEvent) => {
      if (!native || event.pointerType === "mouse") return;
      if (event.clientX > EDGE_START_PX || isInteractiveTarget(event.target)) return;

      activePointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      triggered = false;
    };

    const reset = () => {
      activePointerId = null;
      triggered = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId || triggered) return;

      const deltaX = event.clientX - startX;
      const deltaY = Math.abs(event.clientY - startY);

      if (deltaY > MAX_VERTICAL_DISTANCE_PX && deltaY > deltaX) {
        reset();
        return;
      }

      if (
        deltaX >= MIN_HORIZONTAL_DISTANCE_PX &&
        deltaY <= MAX_VERTICAL_DISTANCE_PX &&
        window.history.length > 1
      ) {
        triggered = true;
        window.history.back();
      }
    };

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", reset, { passive: true });
    window.addEventListener("pointercancel", reset, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", reset);
      window.removeEventListener("pointercancel", reset);
    };
  }, []);

  return null;
}
