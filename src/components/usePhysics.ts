"use client";

import { useEffect, useRef } from "react";
import { getWorld, type Body, type BodyOptions } from "@/lib/physics";

/**
 * Attaches an element to the physics world for as long as it is mounted.
 *
 * The returned ref goes on the element that should move. Options are captured
 * on mount; changing them later does not re-register the body, which is
 * deliberate — a body that re-registered mid-flight would lose its velocity.
 */
export function usePhysics<T extends HTMLElement = HTMLDivElement>(options: BodyOptions = {}) {
  const ref = useRef<T | null>(null);
  const bodyRef = useRef<Body | null>(null);
  // Keep the first options object; see note above.
  const optsRef = useRef(options);

  useEffect(() => {
    const el = ref.current;
    const world = getWorld();
    if (!el || !world) return;

    const body = world.add(el, optsRef.current);
    bodyRef.current = body;

    const onEnter = () => world.hover(body, true);
    const onLeave = () => world.hover(body, false);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);

    let onDown: ((e: PointerEvent) => void) | undefined;
    let onUp: ((e: PointerEvent) => void) | undefined;
    if (optsRef.current.draggable) {
      onDown = (e: PointerEvent) => {
        // Only primary button, and never steal a text selection.
        if (e.button !== 0) return;
        world.grab(body, e);
      };
      onUp = () => world.release(body);
      el.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    }

    // Photos change the element's size the moment they decode, which moves the
    // anchor. Re-measuring on resize keeps the pointer field aligned with what
    // is actually on screen.
    const ro = new ResizeObserver(() => world.remeasure(body));
    ro.observe(el);

    return () => {
      ro.disconnect();
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      if (onDown) el.removeEventListener("pointerdown", onDown);
      if (onUp) {
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      }
      world.remove(body);
      bodyRef.current = null;
    };
  }, []);

  return ref;
}
