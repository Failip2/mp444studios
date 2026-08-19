/**
 * Shape of the manifest emitted by scripts/build-media.mjs.
 *
 * Everything here is known at build time, which is what lets the gallery lay
 * itself out and start its entrance animation before a single photo byte has
 * arrived: the intrinsic aspect ratio reserves the space, the blur data URI
 * fills it, and the dominant colour tints the shadow underneath.
 */

export type Rendition = {
  /** Public path, e.g. /media/events/056a1657-840.avif */
  src: string;
  width: number;
  bytes: number;
};

export type Orientation = "landscape" | "portrait" | "square";

export type Photo = {
  /** `${group}/${slug}` — stable across rebuilds, used as a React key. */
  id: string;
  group: string;
  slug: string;
  /** Intrinsic size of the original, after EXIF rotation. */
  width: number;
  height: number;
  aspect: number;
  orientation: Orientation;
  /** Dominant colour as #rrggbb, used to tint the drop shadow. */
  color: string;
  blurDataURL: string;
  avif: Rendition[];
  webp: Rendition[];
};

export type MediaGroups = Record<string, Photo[]>;
