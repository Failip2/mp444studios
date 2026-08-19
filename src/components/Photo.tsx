import type { Photo as PhotoData } from "@/lib/media-types";

/**
 * Renders one derived photo.
 *
 * Deliberately a plain <picture> rather than next/image: every rendition is
 * already on disk with a known width, so there is nothing for a runtime
 * optimiser to do. The AVIF ladder is offered first, WebP covers Safari < 16.
 *
 * The blur placeholder is painted as a CSS background on the wrapper, sized to
 * the real aspect ratio, so the layout is final before any photo bytes land and
 * nothing on the page shifts.
 */

type Props = {
  photo: PhotoData;
  alt: string;
  /** The `sizes` attribute — get this right or the browser over-fetches. */
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Applied to the <img> itself, e.g. object-cover for cropped tiles. */
  imgClassName?: string;
  /** Force a crop ratio instead of the photo's own. */
  ratio?: number;
};

export function Photo({
  photo,
  alt,
  sizes,
  priority = false,
  className = "",
  imgClassName = "",
  ratio,
}: Props) {
  const srcset = (rends: PhotoData["avif"]) =>
    rends.map((r) => `${r.src} ${r.width}w`).join(", ");

  // Largest WebP is the <img> src, so a browser that understands neither
  // <source> type still gets something reasonable.
  const fallback = photo.webp[photo.webp.length - 1] ?? photo.avif[photo.avif.length - 1];

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio: String(ratio ?? photo.aspect),
        backgroundImage: `url("${photo.blurDataURL}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        // Tints this object's shadow with its own dominant colour, so a warm
        // photo casts a warm shadow.
        ["--shadow-tint" as string]: hexToRgbTriplet(photo.color),
      }}
    >
      <picture>
        <source type="image/avif" srcSet={srcset(photo.avif)} sizes={sizes} />
        <source type="image/webp" srcSet={srcset(photo.webp)} sizes={sizes} />
        <img
          src={fallback.src}
          width={photo.width}
          height={photo.height}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          // fetchPriority high on the hero shaves a real chunk off LCP.
          fetchPriority={priority ? "high" : "auto"}
          decoding={priority ? "sync" : "async"}
          draggable={false}
          className={`h-full w-full object-cover ${imgClassName}`}
        />
      </picture>
    </div>
  );
}

/** "#a88878" -> "168 136 120", the form the shadow custom property wants. */
function hexToRgbTriplet(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return "16 15 13";
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}
