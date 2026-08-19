/**
 * A tiny rigid-body world for DOM elements.
 *
 * Every participating element is a spring-anchored mass. Four things move it:
 *
 *   1. an anchor spring pulling it back to where layout put it,
 *   2. gravity, which makes heavy things hang lower than light ones,
 *   3. a displacement field around the pointer — the "air" being pushed aside,
 *   4. scroll, which the mass resists, so heavy things lag and tilt.
 *
 * Bodies can also be grabbed, thrown, and left to swing back.
 *
 * Everything runs in one requestAnimationFrame loop with a fixed timestep, and
 * writes nothing but `transform` and two custom properties, so the browser never
 * has to reflow. Bodies that have settled are put to sleep and skipped entirely.
 */

export type BodyOptions = {
  /** Heavier bodies resist the pointer and scroll more, and hang lower. */
  mass?: number;
  /** Anchor spring constant. Higher snaps back faster. */
  stiffness?: number;
  /** Viscous damping. Higher settles sooner with less overshoot. */
  damping?: number;
  /** How strongly the pointer field pushes this body, 0 disables it. */
  push?: number;
  /** Radians of tilt per unit of scroll velocity. */
  tilt?: number;
  /** How far the body sags under gravity, in px at rest. */
  sag?: number;
  /** Can the user pick it up and throw it. */
  draggable?: boolean;
  /** Entrance: how far above its anchor the body starts, in px. */
  dropFrom?: number;
  /** Entrance delay in seconds. */
  delay?: number;
};

type Body = Required<BodyOptions> & {
  el: HTMLElement;
  /** Offset from the anchor, in px. */
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Rotation in radians, and its velocity. */
  rot: number;
  vrot: number;
  /** 0 = flat on the page, 1 = fully lifted. Drives shadow and scale. */
  lift: number;
  liftTarget: number;
  /** Cached viewport-space centre, refreshed on scroll/resize. */
  cx: number;
  cy: number;
  w: number;
  h: number;
  visible: boolean;
  asleep: boolean;
  dragging: boolean;
  /** Pointer offset captured on grab, so the body does not jump to the cursor. */
  grabX: number;
  grabY: number;
  /** Seconds remaining before this body joins the simulation. */
  wait: number;
  entering: boolean;
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Where a body actually comes to rest on the y axis. Gravity is modelled as a
 * constant sag rather than an acceleration, so "rest" is never y = 0.
 */
const restOffset = (b: Body) => b.sag * b.mass * 0.06;

/** Fixed timestep. Decoupled from frame rate so 120 Hz behaves like 60 Hz. */
const STEP = 1 / 120;
const MAX_FRAME = 1 / 20;

/** Radius of the pointer displacement field, in px. */
const FIELD_RADIUS = 320;
const FIELD_STRENGTH = 2600;

/** Below these thresholds a body is considered settled. */
const SLEEP_V = 0.06;
const SLEEP_D = 0.12;

/**
 * Hard limits.
 *
 * Scroll velocity is an *input* we do not control: a jump to an anchor, a
 * "back to top" link, a restored scroll position or a coarse mouse wheel can
 * all deliver thousands of pixels in a single event. Fed straight into the
 * angular integrator that spins every frame on the page right off its axis, so
 * the input is clamped first and the resulting motion is clamped again.
 */
const MAX_SCROLL_V = 2600;
/** Pointer speed feeding the air-drag term, px/s. */
const MAX_POINTER_V = 3200;
/** Speed a body can be given by a drag, px/s, before release caps it again. */
const MAX_THROW_V = 3600;
/** ~8 degrees. Past this a tilt stops reading as weight and starts reading as broken. */
const MAX_ROT = 0.14;
const MAX_VROT = 2.6;
/** How far a body may stray from its anchor while not being dragged. */
const MAX_OFFSET = 260;

export class World {
  private bodies = new Set<Body>();
  private raf = 0;
  private last = 0;
  private accumulator = 0;
  private running = false;

  /** Pointer position in viewport space, and its smoothed velocity. */
  private px = -1e5;
  private py = -1e5;
  private pvx = 0;
  private pvy = 0;
  private pointerActive = false;

  /** Scroll velocity in px/s, smoothed. */
  private scrollV = 0;
  private lastScrollY = 0;

  private dragged: Body | null = null;
  private reduced = false;
  private measureQueued = false;

  constructor() {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reduced = mq.matches;
    mq.addEventListener("change", (e) => {
      this.reduced = e.matches;
      if (this.reduced) this.resetAll();
      else this.wakeAll();
    });
    this.lastScrollY = window.scrollY;
    this.bind();
  }

  // ---------------------------------------------------------------- lifecycle

  add(el: HTMLElement, opts: BodyOptions = {}): Body {
    const body: Body = {
      el,
      mass: opts.mass ?? 1,
      stiffness: opts.stiffness ?? 170,
      damping: opts.damping ?? 17,
      push: opts.push ?? 1,
      tilt: opts.tilt ?? 0.00018,
      sag: opts.sag ?? 3,
      draggable: opts.draggable ?? false,
      dropFrom: opts.dropFrom ?? 0,
      delay: opts.delay ?? 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rot: 0,
      vrot: 0,
      lift: 0,
      liftTarget: 0,
      cx: 0,
      cy: 0,
      w: 0,
      h: 0,
      visible: true,
      asleep: false,
      dragging: false,
      grabX: 0,
      grabY: 0,
      wait: opts.delay ?? 0,
      entering: (opts.dropFrom ?? 0) > 0,
    };

    if (body.entering && !this.reduced) {
      body.y = -body.dropFrom;
      // A touch of initial spin so items do not all fall like a grid.
      body.rot = (Math.random() - 0.5) * 0.05;
      // Hold it invisible until its turn comes. Without this the object sits
      // plainly visible at its raised position for the whole of its stagger
      // delay, which reads as a layout fault rather than as an entrance.
      body.el.style.opacity = "0";
      this.write(body);
    }

    this.bodies.add(body);
    this.measure(body);
    this.start();
    return body;
  }

  remove(body: Body) {
    this.bodies.delete(body);
    if (this.dragged === body) this.dragged = null;
    body.el.style.transform = "";
    body.el.style.opacity = "";
    body.el.style.transition = "";
    body.el.style.removeProperty("--lift");
    body.el.style.removeProperty("--tilt");
    if (this.bodies.size === 0) this.stop();
  }

  private start() {
    if (this.running || this.reduced) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.stop();
    this.unbind();
    this.bodies.clear();
  }

  // ------------------------------------------------------------------- input

  private onPointerMove = (e: PointerEvent) => {
    const now = performance.now();

    if (!this.pointerSeeded) {
      // First sighting of the pointer. There is no previous position to
      // subtract, and pretending otherwise produces a velocity in the millions
      // of px/s — which the air-drag term then applies to every nearby body,
      // flinging the whole page apart on the first mouse move. Seed and stop.
      this.px = e.clientX;
      this.py = e.clientY;
      this.pvx = 0;
      this.pvy = 0;
      this.pointerSeeded = true;
      this.lastPointerT = now;
      this.pointerActive = true;
      this.wakeNear(e.clientX, e.clientY);
      return;
    }

    const dt = clamp((now - this.lastPointerT) / 1000, 1 / 240, 1 / 15);
    this.lastPointerT = now;
    // Clamped as well: a pointer that teleports across the viewport (window
    // switch, tab return, a synthetic event) must not read as a gale.
    this.pvx = clamp((e.clientX - this.px) / dt, -MAX_POINTER_V, MAX_POINTER_V);
    this.pvy = clamp((e.clientY - this.py) / dt, -MAX_POINTER_V, MAX_POINTER_V);
    this.px = e.clientX;
    this.py = e.clientY;
    this.pointerActive = true;

    if (this.dragged) {
      const b = this.dragged;
      // Target offset = where the pointer is, minus where it grabbed the body.
      const tx = e.clientX - b.grabX;
      const ty = e.clientY - b.grabY;
      // Velocity is derived from the move so a flick carries real momentum.
      b.vx = clamp((tx - b.x) / dt, -MAX_THROW_V, MAX_THROW_V);
      b.vy = clamp((ty - b.y) / dt, -MAX_THROW_V, MAX_THROW_V);
      b.x = tx;
      b.y = ty;
      b.asleep = false;
    }
    this.wakeNear(e.clientX, e.clientY);
  };
  private lastPointerT = 0;
  private pointerSeeded = false;

  private onPointerLeave = () => {
    this.pointerActive = false;
    this.px = -1e5;
    this.py = -1e5;
    this.pvx = 0;
    this.pvy = 0;
    // Re-entry is a fresh sighting, not a continuation, so do not measure a
    // velocity across the gap.
    this.pointerSeeded = false;
    // A pointer that left the document is never coming back to finish its
    // drag. Without this the body stays stuck to a cursor that is not there.
    if (this.dragged) this.release(this.dragged);
    this.wakeAll();
  };

  /** Tab hidden or window blurred: end any drag rather than freezing mid-grab. */
  private onInterrupt = () => {
    if (this.dragged) this.release(this.dragged);
    this.pointerSeeded = false;
  };

  private onScroll = () => {
    const y = window.scrollY;
    const dy = y - this.lastScrollY;
    this.lastScrollY = y;
    // Blend rather than replace, so a single jumpy event cannot spike the tilt,
    // then clamp because a blend alone cannot tame a 2000px jump.
    this.scrollV = clamp(this.scrollV * 0.6 + dy * 60 * 0.4, -MAX_SCROLL_V, MAX_SCROLL_V);
    this.queueMeasure();
    this.wakeAll();
  };

  private onResize = () => this.queueMeasure();

  private bind() {
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("pointerdown", this.onPointerMove, { passive: true });
    document.addEventListener("pointerleave", this.onPointerLeave);
    window.addEventListener("blur", this.onInterrupt);
    document.addEventListener("visibilitychange", this.onInterrupt);
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onResize, { passive: true });
  }

  private unbind() {
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerdown", this.onPointerMove);
    document.removeEventListener("pointerleave", this.onPointerLeave);
    window.removeEventListener("blur", this.onInterrupt);
    document.removeEventListener("visibilitychange", this.onInterrupt);
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onResize);
  }

  // -------------------------------------------------------------- measurement

  /**
   * Reads layout for every body. This is the only place the loop touches
   * geometry, and it is batched into a rAF so a burst of scroll events cannot
   * turn into a burst of forced reflows.
   */
  private queueMeasure() {
    if (this.measureQueued) return;
    this.measureQueued = true;
    requestAnimationFrame(() => {
      this.measureQueued = false;
      for (const b of this.bodies) this.measure(b);
    });
  }

  /**
   * Re-read one body's geometry. Called when an image decodes and changes the
   * element's size, which would otherwise leave the pointer field pointing at
   * where the element used to be.
   */
  remeasure(b: Body) {
    this.measure(b);
  }

  /**
   * Re-read every body's geometry, batched into one frame.
   *
   * Needed by anything that moves elements without moving the page: a
   * horizontally scrolling container fires no window scroll event, so the
   * cached anchor positions would keep pointing at where the items used to be
   * and the pointer field would push the wrong ones.
   */
  remeasureAll() {
    this.queueMeasure();
    this.wakeAll();
  }

  // ------------------------------------------------------------ shared inputs

  /**
   * The 3D hero runs its own integrator but must react to the same pointer and
   * scroll as the DOM bodies. Reading them from here keeps one set of listeners
   * and one definition of "how fast is the page moving".
   */
  input() {
    return {
      x: this.px,
      y: this.py,
      vx: this.pvx,
      vy: this.pvy,
      active: this.pointerActive,
      scrollV: this.scrollV,
      reduced: this.reduced,
    };
  }

  get reducedMotion() {
    return this.reduced;
  }

  private measure(b: Body) {
    const r = b.el.getBoundingClientRect();
    // Subtract the current offset so cx/cy describe the anchor, not the
    // displaced position — otherwise the field would chase its own output.
    b.cx = r.left + r.width / 2 - b.x;
    b.cy = r.top + r.height / 2 - b.y;
    b.w = r.width;
    b.h = r.height;
    const vh = window.innerHeight;
    b.visible = r.bottom > -vh * 0.4 && r.top < vh * 1.4;
  }

  private wakeAll() {
    for (const b of this.bodies) b.asleep = false;
    this.start();
  }

  private wakeNear(x: number, y: number) {
    const r2 = (FIELD_RADIUS * 1.3) ** 2;
    for (const b of this.bodies) {
      if (!b.asleep) continue;
      const dx = b.cx + b.x - x;
      const dy = b.cy + b.y - y;
      if (dx * dx + dy * dy < r2) b.asleep = false;
    }
    this.start();
  }

  private resetAll() {
    for (const b of this.bodies) {
      b.x = b.y = b.vx = b.vy = b.rot = b.vrot = b.lift = 0;
      b.entering = false;
      b.wait = 0;
      b.el.style.transform = "";
      // Reduced motion means no entrance at all — never leave anything hidden.
      b.el.style.opacity = "";
      b.el.style.transition = "";
      b.el.style.setProperty("--lift", "0");
      b.el.style.setProperty("--tilt", "0");
    }
    this.stop();
  }

  // ----------------------------------------------------------------- dragging

  grab(b: Body, e: PointerEvent) {
    if (!b.draggable || this.reduced) return;
    this.dragged = b;
    b.dragging = true;
    b.asleep = false;
    b.liftTarget = 1;
    // Without this, dragging an object across the page sweeps a text selection
    // along with it and the cursor flickers between grab and I-beam.
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    b.grabX = e.clientX - b.x;
    b.grabY = e.clientY - b.y;
    // Capture keeps the drag alive when the cursor outruns the element, but
    // throws for a pointerId the browser no longer considers active. Losing
    // capture only degrades the drag; it must never break the grab.
    try {
      b.el.setPointerCapture?.(e.pointerId);
    } catch {
      /* no capture available — the window-level listeners still cover it */
    }
    this.start();
  }

  release(b: Body) {
    if (this.dragged === b) this.dragged = null;
    if (!b.dragging) return;
    b.dragging = false;
    b.liftTarget = 0;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    // Cap the throw so a violent flick cannot fling an item off-screen.
    const speed = Math.hypot(b.vx, b.vy);
    const max = 2400;
    if (speed > max) {
      b.vx = (b.vx / speed) * max;
      b.vy = (b.vy / speed) * max;
    }
    b.vrot += (b.vx / 6000) * (1 / b.mass);
  }

  hover(b: Body, on: boolean) {
    if (b.dragging) return;
    b.liftTarget = on ? 1 : 0;
    b.asleep = false;
    this.start();
  }

  // --------------------------------------------------------------- simulation

  private frame = (now: number) => {
    if (!this.running) return;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > MAX_FRAME) dt = MAX_FRAME;

    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= STEP && steps < 8) {
      this.integrate(STEP);
      this.accumulator -= STEP;
      steps++;
    }
    if (steps === 8) this.accumulator = 0;

    let awake = 0;
    for (const b of this.bodies) {
      if (b.asleep) continue;
      awake++;
      this.write(b);
    }

    // Scroll impulse decays on its own so the tilt relaxes when scrolling stops.
    this.scrollV *= 0.86;
    if (Math.abs(this.scrollV) < 0.5) this.scrollV = 0;
    this.pvx *= 0.9;
    this.pvy *= 0.9;

    if (awake === 0 && this.scrollV === 0 && !this.dragged) {
      this.running = false;
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  private integrate(dt: number) {
    const px = this.px;
    const py = this.py;
    const fieldOn = this.pointerActive;

    for (const b of this.bodies) {
      if (b.asleep) continue;

      // Staggered entrance: hold position, and stay invisible, until its turn.
      if (b.wait > 0) {
        b.wait -= dt;
        continue;
      }
      if (b.entering) {
        b.entering = false;
        // Fade up over the fall itself, then drop the transition so it cannot
        // interfere with anything that sets opacity later.
        b.el.style.transition = "opacity 620ms var(--ease-material)";
        b.el.style.opacity = "1";
        window.setTimeout(() => {
          b.el.style.transition = "";
          b.el.style.opacity = "";
        }, 700);
      }

      // Lift eases separately from the physics — it is a visual state, not a force.
      b.lift += (b.liftTarget - b.lift) * clamp(dt * 11, 0, 1);

      if (b.dragging) {
        // Position is driven by the pointer; only rotation is simulated, so the
        // held item swings from the grab point like real weight.
        // A held object swings from the grab point, so it may lean further than
        // a resting one — but still within a believable range.
        const swing = clamp(b.vx / 3000, -0.35, 0.35);
        b.vrot += (swing - b.rot) * 60 * dt;
        b.vrot -= b.vrot * 9 * dt;
        b.vrot = clamp(b.vrot, -MAX_VROT, MAX_VROT);
        b.rot = clamp(b.rot + b.vrot * dt, -0.4, 0.4);
        continue;
      }

      // Bodies far outside the viewport skip the simulation and ease back to
      // rest instead. Rotation has to be part of that: a body that scrolls off
      // screen mid-spin and then sleeps would still be visibly crooked when the
      // reader scrolls back to it.
      if (!b.visible) {
        const k = clamp(dt * 8, 0, 1);
        b.x += (0 - b.x) * k;
        b.y += (restOffset(b) - b.y) * k;
        b.rot += (0 - b.rot) * k;
        b.vx = b.vy = b.vrot = 0;
        if (
          Math.abs(b.x) < SLEEP_D &&
          Math.abs(b.y - restOffset(b)) < SLEEP_D &&
          Math.abs(b.rot) < 0.0012
        ) {
          b.x = 0;
          b.y = restOffset(b);
          b.rot = 0;
          b.asleep = true;
          this.write(b);
        }
        continue;
      }

      const invMass = 1 / b.mass;
      let fx = 0;
      let fy = 0;

      // 1. Anchor spring, pulling back to the layout position.
      fx -= b.stiffness * b.x;
      fy -= b.stiffness * b.y;

      // 2. Gravity: expressed as a rest offset, so heavier bodies hang lower
      //    rather than accelerating away forever.
      fy += b.stiffness * b.sag * b.mass * 0.06;

      // 3. Pointer field. Force falls off with the square of normalised
      //    distance, which reads as air being displaced rather than magnetism.
      if (fieldOn && b.push !== 0) {
        const dx = b.cx + b.x - px;
        const dy = b.cy + b.y - py;
        const d = Math.hypot(dx, dy);
        if (d < FIELD_RADIUS && d > 0.001) {
          const falloff = 1 - d / FIELD_RADIUS;
          const mag = FIELD_STRENGTH * falloff * falloff * b.push * invMass;
          fx += (dx / d) * mag;
          fy += (dy / d) * mag;
          // A fast cursor drags the surrounding air with it.
          fx += this.pvx * 0.06 * falloff * b.push * invMass;
          fy += this.pvy * 0.06 * falloff * b.push * invMass;
          // Off-centre pressure induces spin.
          b.vrot += ((dx / FIELD_RADIUS) * falloff * 0.9 * invMass) * dt;
        }
      }

      // 4. Scroll inertia: the body resists being moved, so it lags and tilts.
      if (this.scrollV !== 0) {
        fy -= this.scrollV * 0.55 * b.mass * 0.5;
        b.vrot += this.scrollV * b.tilt * invMass * dt * 60;
      }

      // Viscous damping on both linear and angular motion.
      fx -= b.damping * b.vx;
      fy -= b.damping * b.vy;

      b.vx += fx * invMass * dt;
      b.vy += fy * invMass * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Keep the body within reach of its anchor. The spring alone gets there
      // eventually, but not before a big impulse has thrown it across the page.
      if (b.x > MAX_OFFSET || b.x < -MAX_OFFSET) {
        b.x = clamp(b.x, -MAX_OFFSET, MAX_OFFSET);
        b.vx *= 0.4;
      }
      if (b.y > MAX_OFFSET || b.y < -MAX_OFFSET) {
        b.y = clamp(b.y, -MAX_OFFSET, MAX_OFFSET);
        b.vy *= 0.4;
      }

      // Rotation always springs back to level. Damped harder than the linear
      // axes: a frame that stays visibly askew for a second after scrolling
      // stops reads as a rendering fault rather than as weight.
      b.vrot += -b.rot * 115 * dt;
      b.vrot -= b.vrot * 9.5 * dt;
      b.vrot = clamp(b.vrot, -MAX_VROT, MAX_VROT);
      b.rot += b.vrot * dt;
      if (b.rot > MAX_ROT || b.rot < -MAX_ROT) {
        b.rot = clamp(b.rot, -MAX_ROT, MAX_ROT);
        // Bleed off the spin at the limit instead of letting it press against it.
        b.vrot *= 0.3;
      }

      // Settle: only sleep once motion, displacement and lift have all stopped.
      const still =
        Math.abs(b.vx) < SLEEP_V &&
        Math.abs(b.vy) < SLEEP_V &&
        Math.abs(b.vrot) < 0.0012 &&
        Math.abs(b.x) < SLEEP_D &&
        Math.abs(b.rot) < 0.0012 &&
        Math.abs(b.lift - b.liftTarget) < 0.004;
      // The gravity sag is a real resting offset, so compare y against it.
      const restY = restOffset(b);
      if (still && Math.abs(b.y - restY) < SLEEP_D) {
        b.x = 0;
        b.y = restY;
        b.vx = b.vy = b.vrot = 0;
        b.rot = 0;
        b.lift = b.liftTarget;
        b.asleep = true;
        this.write(b);
      }
    }
  }

  /** The only DOM write in the loop. Transform plus two custom properties. */
  private write(b: Body) {
    const lift = b.lift;
    const scale = 1 + lift * 0.022;
    const z = lift * 26;
    b.el.style.transform =
      `translate3d(${b.x.toFixed(2)}px, ${(b.y - z).toFixed(2)}px, 0) ` +
      `rotate(${b.rot.toFixed(5)}rad) scale(${scale.toFixed(4)})`;
    b.el.style.setProperty("--lift", lift.toFixed(3));
    b.el.style.setProperty("--tilt", b.rot.toFixed(5));
  }
}

let world: World | null = null;

/** Lazily created singleton — one loop for the whole document. */
export function getWorld(): World | null {
  if (typeof window === "undefined") return null;
  if (!world) world = new World();
  return world;
}

export type { Body };
