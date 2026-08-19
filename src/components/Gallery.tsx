"use client";

import { useEffect, useMemo, useState } from "react";
import { Photo } from "./Photo";
import { Floating } from "./Floating";
import { Lightbox } from "./Lightbox";
import { balanceColumns } from "@/lib/layout";
import type { Photo as PhotoData } from "@/lib/media-types";

/**
 * The gallery proper.
 *
 * Each frame is a physics body: it drops in on a stagger, hangs a little under
 * its own weight, gets pushed aside as the cursor passes, and lags behind the
 * scroll in proportion to its mass. Mass is derived from shape — a tall frame is
 * a heavy frame — which is what makes the grid behave like a set of physical
 * objects rather than a set of divs.
 *
 * Columns are balanced from aspect ratios that are already known at build time,
 * so the layout is final in the HTML and nothing reflows as photos decode. The
 * server renders the three-column arrangement; the client re-balances to one or
 * two columns if the viewport is narrower. The first client render deliberately
 * matches the server, so hydration stays clean.
 */

const SERVER_COLUMNS = 3;

function useColumnCount() {
  const [count, setCount] = useState(SERVER_COLUMNS);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)");
    const mid = window.matchMedia("(min-width: 640px)");
    const update = () => setCount(wide.matches ? 3 : mid.matches ? 2 : 1);
    update();
    wide.addEventListener("change", update);
    mid.addEventListener("change", update);
    return () => {
      wide.removeEventListener("change", update);
      mid.removeEventListener("change", update);
    };
  }, []);

  return count;
}

export function Gallery({
  photos,
  categoryTitle,
}: {
  /** Full set, already in the order the eye should read them. */
  photos: PhotoData[];
  categoryTitle: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const columnCount = useColumnCount();

  const columns = useMemo(() => balanceColumns(photos, columnCount), [photos, columnCount]);
  const indexById = useMemo(() => {
    const m = new Map<string, number>();
    photos.forEach((p, i) => m.set(p.id, i));
    return m;
  }, [photos]);

  return (
    <>
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}
      >
        {columns.map((col, ci) => (
          <div key={ci} className="grid content-start gap-5">
            {col.map((p, ri) => {
              // Tall frames carry more mass, so they sag and lag more.
              const mass = 1.1 + (p.orientation === "portrait" ? 1.35 : 1) + (ri % 3) * 0.35;
              const n = indexById.get(p.id) ?? 0;
              return (
                <Floating
                  key={p.id}
                  mass={mass}
                  push={0.7 / mass}
                  stiffness={165}
                  damping={17}
                  sag={4}
                  tilt={0.00022 / mass}
                  dropFrom={70}
                  // Staggered by position, wrapped so a 46-photo gallery does
                  // not end up with a two-second entrance.
                  delay={(ci * 0.07 + ri * 0.05) % 0.9}
                  className="overflow-hidden rounded-[3px] bg-paper-raised"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(n)}
                    className="block w-full cursor-zoom-in"
                    aria-label={`Åbn billede ${n + 1} af ${photos.length}`}
                  >
                    <Photo
                      photo={p}
                      alt={`${categoryTitle} — billede ${n + 1}`}
                      sizes="(min-width: 1024px) 31vw, (min-width: 640px) 47vw, 92vw"
                      priority={n < columnCount}
                    />
                  </button>
                </Floating>
              );
            })}
          </div>
        ))}
      </div>

      <Lightbox
        photos={photos}
        index={openIndex}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
        categoryTitle={categoryTitle}
      />
    </>
  );
}
