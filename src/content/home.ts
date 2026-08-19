/**
 * Homepage-specific content.
 *
 * The selected-work row and the featured film are both listed here by slug, so
 * changing what the front page shows never means editing a component.
 */

/**
 * The featured film.
 *
 * Drop the mp4 at `public/video/<file>` and point `src` at it. The section is
 * safe to ship before the file exists: FilmShowcase falls back to the poster
 * photograph if the video 404s or will not decode.
 *
 * Keep the file under ~30 MB if you can — it is served straight off disk by
 * nginx with no transcoding. H.264 in an mp4 container plays everywhere; if you
 * want to halve the size, add a WebM alongside it and extend FilmShowcase with
 * a second <source>.
 */
export const film = {
  src: "/video/bryllup.mp4",
  title: "Bryllupsfilm",
  /** Slug in the `events` media group, used as the poster frame. */
  posterSlug: "056a1669",
  eyebrow: "Film",
  lead: "Et bryllup, klippet ned til de minutter der faktisk betød noget.",
  meta: [
    { label: "Type", value: "Bryllup" },
    { label: "Format", value: "Film" },
    { label: "Levering", value: "Fuld film + klip" },
  ],
} as const;

/**
 * The selected-work row, in display order. Each entry names the media group and
 * the slug within it. Portrait and landscape are mixed on purpose — the strip
 * sizes each frame from its own aspect ratio rather than cropping to fit.
 */
export const stripPhotos: { group: string; slug: string }[] = [
  { group: "creative", slug: "056a1462" },
  { group: "covers", slug: "landing-cv" },
  { group: "covers", slug: "landing-portfolio" },
  { group: "commercial", slug: "056a5328" },
  { group: "commercial", slug: "056a5297" },
  { group: "commercial", slug: "056a5486" },
  { group: "events", slug: "056a5133" },
];
