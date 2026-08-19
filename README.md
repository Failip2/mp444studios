# mp444studios

Portfolio site for **mp444studios** — Filip Raeburn, foto- og videoproduktion
in Aarhus.

Next.js 16 (App Router), TypeScript, Tailwind v4. Self-hosted on a VPS.
Replaces the previous Hugo/PaperMod site that ran on GitHub Pages.

---

## Quick start

```bash
npm install
npm run dev
```

Node 20.9 or newer.

| Script                | Does                                                      |
| --------------------- | --------------------------------------------------------- |
| `npm run dev`         | Dev server on :3000                                        |
| `npm run build`       | Production build                                           |
| `npm start`           | Serve the production build                                 |
| `npm run typecheck`   | `tsc --noEmit`                                             |
| `npm run media`       | Derive web images from `source/photos` (incremental)       |
| `npm run media:force` | Same, ignoring the cache                                   |

---

## How it fits together

### Images

The originals are 4640×6960 camera exports, up to 22 MB each, ~660 MB total.
They are never served. `scripts/build-media.mjs` derives an AVIF ladder
(420/840/1400/2100) plus a narrower WebP fallback ladder for Safari < 16, and
writes `src/lib/media.generated.ts` describing every photo: intrinsic size,
aspect ratio, orientation, dominant colour and a 20px inline blur placeholder.

Both the derivatives and the manifest are committed. The server does no image
work at all — `images: { unoptimized: true }` in `next.config.ts` — which is why
a 1 vCPU VPS is enough.

Because the manifest is known at build time, galleries can balance their columns
and reserve exact space before a single photo byte arrives, so nothing on the
page ever shifts.

Run `npm run media` after touching anything in `source/photos`, and commit
`public/media/` together with `src/lib/media.generated.ts`.

### Motion

`src/lib/physics.ts` is a small rigid-body world for DOM elements. Every
participating element is a spring-anchored mass affected by four things:

1. an anchor spring pulling it back to its layout position,
2. gravity, modelled as a rest offset, so heavy things visibly hang lower,
3. a displacement field around the pointer — air being pushed aside,
4. scroll, which mass resists, so heavy things lag and tilt.

Draggable bodies can be grabbed, thrown with real momentum, and left to swing
back. Mass is not decorative: it feeds all four, which is what makes a large
frame behave differently from a small one.

One `requestAnimationFrame` loop drives everything, at a fixed timestep, writing
only `transform` and two custom properties. Bodies that settle are put to sleep
and skipped; the loop stops entirely when nothing is moving. Geometry reads are
batched into a single rAF so a burst of scroll events cannot cause a burst of
forced reflows.

`--lift` is the bridge to the design: the `.material` class in `globals.css`
turns it into a four-layer shadow plus a contact shadow, so an object picked up
by the cursor visibly rises off the paper.

`prefers-reduced-motion: reduce` disables the simulation and resets every body.

### The 3D hero

`src/components/three/` builds five objects — AirPods Max, a mirrorless camera,
a MacBook, an SD card and a card reader — entirely from primitives. There are no
model files to download, and the objects inherit the site's palette rather than
fighting it. Lighting comes from three directional lights plus a procedural
`RoomEnvironment`, so nothing is fetched from a CDN.

The camera and the laptop both display real photographs from the manifest,
cycling every few seconds and offset from each other. That is the point where
the gear and the work stop being two separate things on one page.

Objects read pointer and scroll state from the same physics `World` the DOM uses
rather than attaching their own listeners, and can be grabbed, spun and thrown.

Three.js is roughly 240 KB gzipped. It is a lazily-loaded chunk that never
enters the initial payload, and `HeroStage` only requests it when WebGL is
available, reduced motion is off, and the viewport is at least 768px wide. Below
any of those the hero is type on paper.

### The contact form

`/kontakt` lists the email address and phone number first — someone who already
knows what they want should not have to fill in a form to get an address — and
puts the enquiry form beside them.

The form is a plain `<form>` wired to a Server Action, so it submits and
validates without JavaScript; the inline errors and pending state are
refinements on top. Validation is server-side and authoritative.

Three spam defences, in order of how much work they do: a honeypot field hidden
off-screen, a minimum fill time, and a small in-memory per-IP rate limit. The
first two return the ordinary success response and send nothing — telling a bot
it failed only teaches it what to change.

Delivery is SMTP via nodemailer. `From` is the authenticated account (Gmail
rewrites it anyway) and `Reply-To` is the enquirer, so replying in the mail
client reaches them. Configure with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS` and `CONTACT_TO` — see `.env.example`. **Gmail needs an App
Password, not the account password.** With no SMTP configured the page still
renders and still shows the address and phone; only the send step reports that
it is not set up.

### The featured film

`FilmShowcase` shows a poster photograph with a play control and swaps in a
`<video>` on demand. `preload="none"`, so the mp4 is never requested until
asked for, and if it is missing or will not decode the player steps aside and
leaves the poster. The section is therefore safe to ship before the film
exists — see `public/video/README.md` for where to drop it.

### Content

Plain typed modules under `src/content/` — no CMS, no markdown parsing:

- `site.ts` — name, contact, navigation
- `portfolio.ts` — the three categories, each pointing at a media group
- `equipment.ts` — the gear list
- `about.ts` — story, bio, CV link
- `home.ts` — the featured film, and the selected-work row by slug

### Routes

| Route                | Was (Hugo)          |
| -------------------- | ------------------- |
| `/`                  | `/`                 |
| `/portfolio`         | `/portfolio`        |
| `/portfolio/[slug]`  | `/portfolio/[slug]` |
| `/udstyr`            | `/equipment`        |
| `/om-os`             | `/cv`               |
| `/kontakt`           | — (new)             |

The old English paths are kept alive as permanent redirects in
`next.config.ts`, along with `/catalog/landing` → `/portfolio`.

Category slugs are Danish: `kommercielt`, `events`, `kreativt`.

---

## Deployment

See [docs/DEPLOY.md](docs/DEPLOY.md). Docker Compose plus nginx is the
recommended path; a systemd unit is provided as an alternative.

---

## Layout

```
source/photos/     camera originals, by group        (committed, never served)
public/media/      derived AVIF + WebP               (committed, served)
public/docs/       CV PDFs
public/video/      the featured film (see public/video/README.md)
scripts/           the image pipeline
src/app/           routes
src/components/    UI, including the physics bindings
src/content/       the words
src/lib/           physics, layout maths, media manifest
deploy/            nginx config, systemd unit
```
