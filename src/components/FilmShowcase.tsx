"use client";

import { useRef, useState } from "react";
import { Photo } from "./Photo";
import { Floating } from "./Floating";
import type { Photo as PhotoData } from "@/lib/media-types";

/**
 * A single film, presented the way the rest of the site presents an object:
 * one thing, on paper, with weight.
 *
 * The poster is a real photograph from the manifest, so the section is complete
 * and correct-looking *before* the video file exists. If the mp4 is missing or
 * fails to decode, the player quietly steps aside and leaves the poster — which
 * is why this can be committed and the film dropped in afterwards without the
 * page ever looking broken.
 */

export function FilmShowcase({
  poster,
  src,
  title,
  meta,
}: {
  poster: PhotoData;
  /** Path under /public, e.g. /video/bryllup.mp4 */
  src: string;
  title: string;
  meta: { label: string; value: string }[];
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  // Whether the reader actually asked for playback. The explanatory note is
  // only shown if they did — while the film has simply not been added yet, the
  // section should read as a finished poster, not as a fault.
  const [attempted, setAttempted] = useState(false);

  const play = async () => {
    const el = video.current;
    if (!el || failed) return;
    setAttempted(true);
    setStarted(true);
    try {
      await el.play();
    } catch {
      // Autoplay policy or a missing file. Either way, fall back to the poster.
      setFailed(true);
      setStarted(false);
    }
  };

  return (
    <div className="grid gap-x-10 gap-y-12 md:grid-cols-12">
      <div className="md:col-span-8">
        <Floating
          mass={3.4}
          push={0.4}
          stiffness={190}
          damping={20}
          sag={6}
          tilt={0.0001}
          className="relative overflow-hidden rounded-[4px] bg-paper-raised"
        >
          {/* 16:9 shell, so the box is the right shape before anything loads. */}
          <div className="relative aspect-video w-full">
            <video
              ref={video}
              src={src}
              poster={undefined}
              controls={started}
              playsInline
              preload="none"
              onError={() => {
                setFailed(true);
                setStarted(false);
              }}
              onEnded={() => setStarted(false)}
              className={[
                "absolute inset-0 h-full w-full bg-ink object-cover transition-opacity duration-700",
                started && !failed ? "opacity-100" : "pointer-events-none opacity-0",
              ].join(" ")}
            />

            {/* Poster. Sits above the video until playback actually begins. */}
            <div
              className={[
                "absolute inset-0 transition-opacity duration-700",
                started && !failed ? "pointer-events-none opacity-0" : "opacity-100",
              ].join(" ")}
            >
              <Photo
                photo={poster}
                alt={title}
                sizes="(min-width: 768px) 66vw, 92vw"
                ratio={16 / 9}
                className="h-full w-full"
              />
              <div className="absolute inset-0 bg-ink/15" />

              {!failed && (
                <button
                  type="button"
                  onClick={play}
                  className="group absolute inset-0 flex items-center justify-center"
                >
                  <span className="sr-only">Afspil {title}</span>
                  <span
                    aria-hidden="true"
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-paper/90 backdrop-blur-sm transition-transform duration-500 [transition-timing-function:var(--ease-weight)] group-hover:scale-110"
                  >
                    <svg width="18" height="20" viewBox="0 0 18 20" className="ml-1">
                      <path d="M0 0l18 10L0 20z" fill="currentColor" />
                    </svg>
                  </span>
                </button>
              )}
            </div>
          </div>
        </Floating>
      </div>

      <div className="md:col-span-4">
        <h3 className="text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-[-0.035em]">
          {title}
        </h3>
        <dl className="mt-8">
          {meta.map((m) => (
            <div
              key={m.label}
              className="flex items-baseline justify-between gap-4 border-t border-hairline py-3"
            >
              <dt className="label">{m.label}</dt>
              <dd className="text-[0.8125rem] text-ink-muted">{m.value}</dd>
            </div>
          ))}
        </dl>
        {failed && attempted && (
          <p className="mt-6 text-[0.8125rem] text-ink-faint">
            Filmen kan ikke afspilles lige nu.
          </p>
        )}
      </div>
    </div>
  );
}
