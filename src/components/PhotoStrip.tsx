"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Photo } from "./Photo";
import { Floating } from "./Floating";
import { getWorld } from "@/lib/physics";
import type { Photo as PhotoData } from "@/lib/media-types";

/**
 * A horizontally scrollable row of frames.
 *
 * Each photograph keeps its own aspect ratio. An earlier version forced every
 * frame into one of two crops, which quietly cut the top off portraits and the
 * sides off landscapes — the point of a selected-work row is to show the
 * compositions as they were shot, so the row is a constant *height* and every
 * frame takes whatever width its own ratio asks for.
 *
 * Scrolling works three ways, because all three are things people try: the
 * wheel or trackpad, dragging the row itself, and the arrow buttons. Native
 * scrolling does the actual work, so momentum, snapping and keyboard access all
 * come for free and behave the way the platform does.
 */

/** Row height at each breakpoint, in the same units the CSS uses. */
const ROW_HEIGHT = "h-[52vw] sm:h-[34vw] md:h-[26vw] lg:h-[22vw] max-h-[420px] min-h-[220px]";

/** The vw numbers above, paired with the breakpoint they apply from. */
const ROW_HEIGHT_VW: { min: number; vh: number }[] = [
  { min: 1024, vh: 22 },
  { min: 768, vh: 26 },
  { min: 640, vh: 34 },
  { min: 0, vh: 52 },
];

/**
 * Builds a `sizes` string for one frame.
 *
 * The row is a constant height, so a frame's *width* is height x its own aspect
 * ratio — which means a portrait occupies less than half the width of a
 * landscape beside it. A single shared `sizes` value would therefore be wrong
 * for one of them, and being wrong high is expensive: the browser would fetch a
 * rendition twice the size it can display.
 */
function stripSizes(aspect: number): string {
  const parts = ROW_HEIGHT_VW.filter((b) => b.min > 0).map(
    (b) => `(min-width: ${b.min}px) ${(b.vh * aspect).toFixed(1)}vw`,
  );
  const base = ROW_HEIGHT_VW[ROW_HEIGHT_VW.length - 1];
  return [...parts, `${(base.vh * aspect).toFixed(1)}vw`].join(", ");
}

export function PhotoStrip({ photos }: { photos: PhotoData[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Drag-to-scroll state. Kept in a ref so a drag costs no re-renders.
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: 0 });

  const updateEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    updateEdges();

    // The physics bodies inside cache their anchor positions in viewport space.
    // A horizontal scroll moves them without firing a window scroll event, so
    // the world has to be told or the cursor field pushes the wrong frames.
    let queued = false;
    const onScroll = () => {
      updateEdges();
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        getWorld()?.remeasureAll();
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateEdges);
    };
  }, [updateEdges]);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  // Pointer drag. Only for mouse — touch already scrolls natively, and hijacking
  // it would break the platform's own momentum.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = scroller.current;
    if (!el) return;
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: 0 };
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      const el = scroller.current;
      if (!d.active || !el) return;
      const dx = e.clientX - d.startX;
      d.moved = Math.max(d.moved, Math.abs(dx));
      if (d.moved > 4) {
        el.scrollLeft = d.startScroll - dx;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      }
    };
    const up = () => {
      if (!drag.current.active) return;
      drag.current.active = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
    };
  }, []);

  return (
    <div className="relative">
      <div
        ref={scroller}
        onPointerDown={onPointerDown}
        tabIndex={0}
        role="region"
        aria-label="Udvalgte billeder, kan scrolles vandret"
        className={[
          "flex gap-5 overflow-x-auto overscroll-x-contain",
          // Proximity, not mandatory: the frames are different widths, and
          // forcing every one to an edge fights the drag. `scroll-smooth` is
          // deliberately absent — it would animate the scrollLeft writes the
          // drag handler makes, so the row would lag a frame behind the cursor.
          "snap-x snap-proximity",
          // The scrollbar is noise on a row of photographs; the arrows and the
          // fades tell the reader there is more.
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "px-[clamp(1.25rem,6vw,7rem)] py-2",
          // Snap points have to respect the gutter too, or the browser aligns
          // the first frame to the container edge and scrolls the padding out
          // of view — leaving the row starting flush against the viewport while
          // every other section on the page is inset.
          "scroll-pl-[clamp(1.25rem,6vw,7rem)] scroll-pr-[clamp(1.25rem,6vw,7rem)]",
        ].join(" ")}
      >
        {photos.map((p, i) => (
          <Floating
            key={p.id}
            mass={1 + (i % 3) * 0.6}
            push={0.7}
            tilt={0.00026}
            stiffness={155}
            sag={3}
            className="shrink-0 snap-start overflow-hidden rounded-[3px] bg-paper-raised"
          >
            {/*
              Constant height, width derived from the photo's own aspect ratio.
              That is what makes portraits and landscapes sit in one row without
              either being cropped.
            */}
            <div className={ROW_HEIGHT} style={{ aspectRatio: String(p.aspect) }}>
              <Photo
                photo={p}
                alt="Udvalgt billede"
                sizes={stripSizes(p.aspect)}
                className="h-full w-full"
                priority={i < 2}
              />
            </div>
          </Floating>
        ))}
      </div>

      {/* Edge fades, so a cut-off frame reads as "more this way" rather than as
          a mistake. Hidden once that end is reached. */}
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-y-0 left-0 w-[clamp(1.25rem,6vw,7rem)]",
          "bg-gradient-to-r from-paper to-transparent transition-opacity duration-500",
          atStart ? "opacity-0" : "opacity-100",
        ].join(" ")}
      />
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-y-0 right-0 w-[clamp(1.25rem,6vw,7rem)]",
          "bg-gradient-to-l from-paper to-transparent transition-opacity duration-500",
          atEnd ? "opacity-0" : "opacity-100",
        ].join(" ")}
      />

      <div className="gutter mt-10 flex items-center gap-3">
        <button
          type="button"
          onClick={() => page(-1)}
          disabled={atStart}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline transition-all duration-300 hover:border-ink disabled:pointer-events-none disabled:opacity-25"
        >
          <span className="sr-only">Rul til venstre</span>
          <svg width="15" height="12" viewBox="0 0 15 12" aria-hidden="true">
            <path d="M6 1L1 6l5 5M1 6h14" stroke="currentColor" strokeWidth="1.25" fill="none" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => page(1)}
          disabled={atEnd}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline transition-all duration-300 hover:border-ink disabled:pointer-events-none disabled:opacity-25"
        >
          <span className="sr-only">Rul til højre</span>
          <svg width="15" height="12" viewBox="0 0 15 12" aria-hidden="true">
            <path d="M9 1l5 5-5 5M14 6H0" stroke="currentColor" strokeWidth="1.25" fill="none" />
          </svg>
        </button>
      </div>
    </div>
  );
}
