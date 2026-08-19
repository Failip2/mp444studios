#!/usr/bin/env node
/**
 * Derives every web-ready image from the untouched originals in source/photos.
 *
 * The originals are camera exports (up to 22 MB each) and must never be served.
 * This writes an AVIF ladder plus a narrower WebP fallback ladder into
 * public/media, and emits a typed manifest that the app imports at build time so
 * every image knows its intrinsic size, blur placeholder and dominant colour
 * without a runtime round-trip.
 *
 * Output is committed to git, so the VPS only ever runs `next build`.
 *
 *   node scripts/build-media.mjs [--force] [--group=commercial]
 */

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { cpus } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = path.join(ROOT, "source", "photos");
const OUT_DIR = path.join(ROOT, "public", "media");
const CACHE_FILE = path.join(ROOT, ".cache", "media.json");
const MANIFEST_FILE = path.join(ROOT, "src", "lib", "media.generated.ts");

/** AVIF is the primary ladder - every current browser takes it. */
const AVIF_WIDTHS = [420, 840, 1400, 2100];
/** WebP exists only for Safari < 16, so it needs fewer rungs. */
const WEBP_WIDTHS = [840, 1400];

const AVIF_OPTS = { quality: 52, effort: 5, chromaSubsampling: "4:2:0" };
const WEBP_OPTS = { quality: 78, effort: 5 };

const SOURCE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"]);

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const ONLY_GROUP = [...args].find((a) => a.startsWith("--group="))?.split("=")[1];

const CONCURRENCY = Math.max(2, Math.min(cpus().length, 8));

// sharp's own thread pool plus our concurrency would oversubscribe the CPU.
sharp.concurrency(2);
sharp.cache({ files: 0, memory: 256 });

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function listGroups() {
  const entries = await readdir(SRC_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** Files whose name marks them as a second copy lose the dedup tie-break. */
function isCopyName(file) {
  return /\b(copy|kopi)\b|\(\d+\)/i.test(path.basename(file));
}

async function listSources(group) {
  const dir = path.join(SRC_DIR, group);
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && SOURCE_EXT.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(dir, e.name))
    .sort((a, b) => {
      // Sort "... copy.jpg" after its original so the clean name is the keeper.
      const ac = isCopyName(a) ? 1 : 0;
      const bc = isCopyName(b) ? 1 : 0;
      if (ac !== bc) return ac - bc;
      return a.localeCompare(b, "en");
    });
}

async function fingerprint(file) {
  const buf = await readFile(file);
  return createHash("sha1").update(buf).digest("hex");
}

/**
 * A 64x64 greyscale thumbnail used to spot the same photo saved twice.
 * `... copy.jpg` re-exports differ byte-for-byte but are the same picture, and
 * shipping both makes a gallery look padded.
 */
async function perceptualKey(pipeline) {
  return pipeline.clone().resize(64, 64, { fit: "fill" }).greyscale().raw().toBuffer();
}

/**
 * Mean absolute per-pixel difference, 0-255. Deliberately tight: a re-encode of
 * the same frame lands well under 1, while two frames from the same burst are
 * an order of magnitude apart. Anything looser would start eating real photos.
 */
const PERCEPTUAL_EPSILON = 1.5;

function perceptualDistance(a, b) {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i] - b[i]);
  return total / a.length;
}

async function loadCache() {
  if (FORCE || !existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(await readFile(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}

/** Runs `worker` over `items` with a bounded number of in-flight promises. */
async function pool(items, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

/**
 * A 20px-wide WebP inlined as a data URI. Small enough (~400 bytes) to sit in
 * the HTML payload, and it gives the page something with the right colour and
 * shape to render while the real bytes stream in.
 */
async function makeBlur(pipeline) {
  const buf = await pipeline
    .clone()
    .resize(20, null, { fit: "inside" })
    .webp({ quality: 40, alphaQuality: 40, smartSubsample: true })
    .toBuffer();
  return `data:image/webp;base64,${buf.toString("base64")}`;
}

async function dominantColor(pipeline) {
  const { dominant } = await pipeline.clone().stats();
  const hex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`;
}

/**
 * Phase one: everything needed to decide whether a file is worth rendering.
 * Reuses the cached perceptual key when the bytes have not changed, so a
 * no-op rebuild never decodes a 22 MB JPEG.
 */
async function survey(group, file, cache) {
  const slug = slugify(path.basename(file));
  const hash = await fingerprint(file);
  const cached = cache[`${group}/${slug}`];

  if (cached && cached.hash === hash && cached.pkey) {
    return { group, file, slug, hash, pkey: Buffer.from(cached.pkey, "base64") };
  }
  const base = sharp(file, { limitInputPixels: 512 * 1024 * 1024 }).rotate();
  return { group, file, slug, hash, pkey: await perceptualKey(base) };
}

async function processOne(group, file, slug, hash, cache) {
  const cacheKey = `${group}/${slug}`;
  const cached = cache[cacheKey];
  const outDir = path.join(OUT_DIR, group);

  if (cached && cached.hash === hash && cached.entry) {
    const allPresent = [...cached.entry.avif, ...cached.entry.webp].every((v) =>
      existsSync(path.join(ROOT, "public", v.src)),
    );
    if (allPresent) return { entry: cached.entry, hash, cacheKey, skipped: true };
  }

  await mkdir(outDir, { recursive: true });

  // .rotate() with no argument applies the EXIF orientation and then strips it,
  // which matters because these come straight out of a Canon body.
  const base = sharp(file, { limitInputPixels: 512 * 1024 * 1024 }).rotate();
  const meta = await base.metadata();
  // metadata() reports the file as stored, so undo the swap that .rotate()
  // will apply for the quarter-turn orientations (6 and 8).
  const swap = meta.orientation === 6 || meta.orientation === 8;
  const srcW = (swap ? meta.height : meta.width) ?? 0;
  const srcH = (swap ? meta.width : meta.height) ?? 0;
  if (!srcW || !srcH) throw new Error(`Could not read dimensions of ${file}`);

  const [blurDataURL, color] = await Promise.all([makeBlur(base), dominantColor(base)]);

  const renditions = async (widths, format, opts) => {
    const usable = widths.filter((w) => w <= srcW);
    // Never upscale, but always emit at least one rendition.
    if (usable.length === 0) usable.push(srcW);
    const out = [];
    for (const w of usable) {
      const rel = `/media/${group}/${slug}-${w}.${format}`;
      const abs = path.join(ROOT, "public", rel);
      const pipe = base.clone().resize(w, null, { fit: "inside", withoutEnlargement: true });
      const buf = await (format === "avif" ? pipe.avif(opts) : pipe.webp(opts)).toBuffer();
      await writeFile(abs, buf);
      out.push({ src: rel, width: w, bytes: buf.byteLength });
    }
    return out;
  };

  const avif = await renditions(AVIF_WIDTHS, "avif", AVIF_OPTS);
  const webp = await renditions(WEBP_WIDTHS, "webp", WEBP_OPTS);

  const entry = {
    id: `${group}/${slug}`,
    group,
    slug,
    width: srcW,
    height: srcH,
    aspect: Number((srcW / srcH).toFixed(5)),
    orientation: srcW / srcH > 1.08 ? "landscape" : srcW / srcH < 0.92 ? "portrait" : "square",
    color,
    blurDataURL,
    avif,
    webp,
  };

  return { entry, hash, cacheKey };
}

function serialize(groups) {
  return [
    "// GENERATED BY scripts/build-media.mjs - DO NOT EDIT BY HAND.",
    "// Run `npm run media` after adding or replacing anything in source/photos.",
    "",
    'import type { MediaGroups } from "./media-types";',
    "",
    `export const media: MediaGroups = ${JSON.stringify(groups, null, 2)};`,
    "",
  ].join("\n");
}

async function main() {
  const started = Date.now();
  if (!existsSync(SRC_DIR)) throw new Error(`Missing source directory: ${SRC_DIR}`);

  const cache = await loadCache();
  const nextCache = {};
  const groups = await listGroups();
  const manifest = {};

  let built = 0;
  let skipped = 0;
  let dupes = 0;
  let bytes = 0;

  for (const group of groups) {
    // --group=x still has to walk every group, otherwise the manifest and the
    // cache would come back holding only that one group. The others are simply
    // replayed from cache instead of being re-derived.
    if (ONLY_GROUP && group !== ONLY_GROUP) {
      const replayed = Object.entries(cache)
        .filter(([key]) => key.startsWith(`${group}/`))
        .map(([key, v]) => ({ key, v }))
        .sort((a, b) => a.key.localeCompare(b.key, "en"));
      if (replayed.length === 0) {
        throw new Error(
          `--group=${ONLY_GROUP} needs a warm cache for "${group}", but none exists. ` +
            `Run a full \`npm run media\` once first.`,
        );
      }
      manifest[group] = replayed.map(({ v }) => v.entry);
      for (const { key, v } of replayed) {
        nextCache[key] = v;
        bytes += [...v.entry.avif, ...v.entry.webp].reduce((n, r) => n + (r.bytes ?? 0), 0);
      }
      skipped += replayed.length;
      process.stdout.write(`\n${group}  (${replayed.length} replayed from cache)\n`);
      continue;
    }

    const files = await listSources(group);
    process.stdout.write(`\n${group}  (${files.length} source files)\n`);

    // Phase one, in parallel but reduced in sorted order, so the same input
    // always yields the same keep-set regardless of which worker finished first.
    const surveyed = await pool(files, async (file) => {
      try {
        return await survey(group, file, cache);
      } catch (err) {
        console.error(`  ! ${path.basename(file)}: ${err.message}`);
        return null;
      }
    });

    const keepers = [];
    const seenExact = new Map();
    for (const s of surveyed) {
      if (!s) continue;
      const exact = seenExact.get(s.hash);
      if (exact) {
        process.stdout.write(`  = ${s.slug} (identical to ${exact})\n`);
        dupes++;
        continue;
      }
      const near = keepers.find((k) => perceptualDistance(k.pkey, s.pkey) < PERCEPTUAL_EPSILON);
      if (near) {
        process.stdout.write(`  = ${s.slug} (same photo as ${near.slug})\n`);
        dupes++;
        continue;
      }
      seenExact.set(s.hash, s.slug);
      keepers.push(s);
    }

    // Phase two: only the keepers pay for the full rendition ladder.
    const results = await pool(keepers, async (k) => {
      try {
        return await processOne(group, k.file, k.slug, k.hash, cache);
      } catch (err) {
        console.error(`  ! ${path.basename(k.file)}: ${err.message}`);
        return null;
      }
    });

    const entries = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (!r) continue;
      entries.push(r.entry);
      nextCache[r.cacheKey] = {
        hash: r.hash,
        pkey: keepers[i].pkey.toString("base64"),
        entry: r.entry,
      };
      if (r.skipped) skipped++;
      else built++;
      bytes += [...r.entry.avif, ...r.entry.webp].reduce((n, v) => n + (v.bytes ?? 0), 0);
      process.stdout.write(`  ${r.skipped ? "." : "+"} ${r.entry.slug}\n`);
    }
    manifest[group] = entries;
  }

  // Drop renditions whose source has since been deleted or renamed.
  const live = new Set();
  for (const entries of Object.values(manifest)) {
    for (const e of entries) for (const v of [...e.avif, ...e.webp]) live.add(v.src);
  }
  let pruned = 0;
  const outGroups = await readdir(OUT_DIR, { withFileTypes: true }).catch(() => []);
  for (const group of outGroups) {
    if (!group.isDirectory()) continue;
    // A --group=x run only knows about that group, so leave the others alone.
    if (ONLY_GROUP && group.name !== ONLY_GROUP) continue;
    const dir = path.join(OUT_DIR, group.name);
    for (const f of await readdir(dir)) {
      const rel = `/media/${group.name}/${f}`;
      if (!live.has(rel)) {
        await rm(path.join(dir, f));
        pruned++;
      }
    }
  }

  await mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(nextCache));
  await mkdir(path.dirname(MANIFEST_FILE), { recursive: true });
  await writeFile(MANIFEST_FILE, serialize(manifest), "utf8");

  const mb = (bytes / 1024 / 1024).toFixed(1);
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  const total = Object.values(manifest).reduce((n, e) => n + e.length, 0);
  process.stdout.write(
    `\ndone in ${secs}s - ${built} built, ${skipped} cached, ${dupes} duplicates skipped, ${pruned} stale removed\n` +
      `${total} photos -> ${mb} MB of derivatives\n` +
      `manifest: ${path.relative(ROOT, MANIFEST_FILE)}\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
