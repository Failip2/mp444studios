import { media } from "./media.generated";
import type { Photo } from "./media-types";

/**
 * Read side of the generated media manifest.
 *
 * Everything here runs at build time on the server. Pages import these helpers
 * rather than the raw manifest so a missing group or slug fails the build with
 * something readable instead of rendering an empty gallery.
 */

export function group(name: string): Photo[] {
  const g = media[name];
  if (!g) {
    throw new Error(
      `No media group "${name}". Known groups: ${Object.keys(media).join(", ")}. ` +
        `Add source/photos/${name}/ and run \`npm run media\`.`,
    );
  }
  return g;
}

export function photo(groupName: string, slug: string): Photo {
  const found = group(groupName).find((p) => p.slug === slug);
  if (!found) {
    throw new Error(
      `No photo "${slug}" in group "${groupName}". ` +
        `Available: ${group(groupName).map((p) => p.slug).join(", ")}`,
    );
  }
  return found;
}

/** Total photo count across the portfolio groups, shown as a stat. */
export function portfolioCount(groups: string[]): number {
  return groups.reduce((n, g) => n + group(g).length, 0);
}

export { balanceColumns, seededShuffle } from "./layout";
export { media };
export type { Photo };
