"use client";

import { useEffect } from "react";

/**
 * One IntersectionObserver for the whole document.
 *
 * Anything with [data-reveal] gets [data-inview] the first time it crosses into
 * view, and is then unobserved. Cheaper and far less jittery than tying the
 * effect to scroll position, and it degrades to "always visible" when
 * JavaScript never runs, because the CSS only hides elements the observer will
 * definitely reach.
 */
export function Reveal() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nodes = () => Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (reduced) {
      for (const el of nodes()) el.setAttribute("data-inview", "");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-inview", "");
          io.unobserve(entry.target);
        }
      },
      // Fire slightly before the element is fully on screen so the motion has
      // finished by the time the reader's eye arrives.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    for (const el of nodes()) io.observe(el);

    // Route changes swap the tree underneath us; re-scan for new targets.
    const mo = new MutationObserver(() => {
      for (const el of nodes()) {
        if (!el.hasAttribute("data-inview")) io.observe(el);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
