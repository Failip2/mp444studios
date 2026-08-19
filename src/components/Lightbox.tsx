"use client";

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Photo } from "./Photo";
import type { Photo as PhotoData } from "@/lib/media-types";

/**
 * Full-bleed viewer.
 *
 * Behaviour that matters here is not decorative: the page behind it is locked
 * without shifting (the scrollbar is replaced by padding), focus is trapped and
 * returned to the thumbnail on close, arrows and Escape work, and the two
 * neighbouring frames are prefetched so paging through feels instant.
 *
 * It renders into a portal on <body> so it escapes the header's stacking
 * context and any transformed physics ancestor.
 */

type Props = {
  photos: PhotoData[];
  index: number | null;
  onClose: () => void;
  onNavigate: (i: number) => void;
  categoryTitle: string;
};

export function Lightbox({ photos, index, onClose, onNavigate, categoryTitle }: Props) {
  const open = index !== null;
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      // Wraps, so paging never dead-ends.
      onNavigate((index + delta + photos.length) % photos.length);
    },
    [index, photos.length, onNavigate],
  );

  // Keyboard: Escape, arrows, and a focus trap over the three controls.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Tab") {
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>("button");
        if (!focusables?.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, go, onClose]);

  // Lock the page without the layout jumping as the scrollbar disappears.
  useEffect(() => {
    if (!open) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const { body } = document;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPad = body.style.paddingRight;
    body.style.overflow = "hidden";
    if (gap > 0) body.style.paddingRight = `${gap}px`;

    // Move focus into the dialog so the keyboard handler has somewhere to land.
    panelRef.current?.querySelector("button")?.focus();

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPad;
      restoreFocus.current?.focus?.();
    };
  }, [open]);

  if (!open || index === null) return null;
  if (typeof document === "undefined") return null;

  const current = photos[index];
  const neighbours = [
    photos[(index + 1) % photos.length],
    photos[(index - 1 + photos.length) % photos.length],
  ];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${categoryTitle}, billede ${index + 1} af ${photos.length}`}
      className="fixed inset-0 z-50 flex flex-col bg-paper/97 backdrop-blur-2xl"
      // Click anywhere on the backdrop closes; the figure stops propagation.
      onClick={onClose}
      ref={panelRef}
    >
      {/* Prefetch the neighbours at the size the viewer will actually use. */}
      <div className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden="true">
        {neighbours.map((p) => (
          <img key={p.id} src={p.avif[p.avif.length - 1].src} alt="" loading="eager" />
        ))}
      </div>

      <div className="gutter flex h-[72px] shrink-0 items-center justify-between">
        <span className="label tabular-nums">
          {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-ink/5"
        >
          <span className="sr-only">Luk</span>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="1.25" fill="none" />
          </svg>
        </button>
      </div>

      <figure
        className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Photo
          key={current.id}
          photo={current}
          alt={`${categoryTitle} — billede ${index + 1}`}
          sizes="(min-width: 1024px) 82vw, 96vw"
          priority
          className="material max-h-full w-auto rounded-[2px] bg-paper-raised"
          imgClassName="!h-auto !w-auto max-h-[calc(100svh-160px)] max-w-full object-contain"
        />
      </figure>

      <div className="gutter flex h-[72px] shrink-0 items-center justify-center gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline transition-colors hover:border-ink"
        >
          <span className="sr-only">Forrige billede</span>
          <svg width="15" height="12" viewBox="0 0 15 12" aria-hidden="true">
            <path d="M6 1L1 6l5 5M1 6h14" stroke="currentColor" strokeWidth="1.25" fill="none" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-hairline transition-colors hover:border-ink"
        >
          <span className="sr-only">Næste billede</span>
          <svg width="15" height="12" viewBox="0 0 15 12" aria-hidden="true">
            <path d="M9 1l5 5-5 5M14 6H0" stroke="currentColor" strokeWidth="1.25" fill="none" />
          </svg>
        </button>
      </div>
    </div>,
    document.body,
  );
}
