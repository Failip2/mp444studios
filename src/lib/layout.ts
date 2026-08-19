/**
 * Pure layout maths, kept free of any manifest import so client components can
 * use it without pulling the whole media manifest into the browser bundle.
 */

/**
 * Deterministic shuffle.
 *
 * Galleries look better when portrait and landscape frames alternate rather
 * than arriving in camera order, but the result has to be identical on the
 * server and the client or hydration will mismatch — hence a seeded PRNG
 * rather than Math.random.
 */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  let s = seed >>> 0 || 1;
  const next = () => {
    // xorshift32 — small, fast, and stable across engines.
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Splits items into `count` columns, keeping the columns close to equal height.
 *
 * A CSS `columns` masonry reorders items unpredictably and cannot be given
 * per-item entrance delays, so the balancing happens here using the aspect
 * ratios we already know from the manifest. Column width is uniform, so an
 * item's relative height is just 1/aspect.
 */
export function balanceColumns<T extends { aspect: number }>(items: T[], count: number): T[][] {
  const cols: T[][] = Array.from({ length: count }, () => []);
  if (count <= 1) return [items.slice()];
  const heights = new Array<number>(count).fill(0);
  for (const item of items) {
    let shortest = 0;
    for (let i = 1; i < count; i++) if (heights[i] < heights[shortest]) shortest = i;
    cols[shortest].push(item);
    heights[shortest] += 1 / item.aspect;
  }
  return cols;
}
