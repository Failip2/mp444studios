"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { getWorld } from "@/lib/physics";
import { AirPodsMax, CameraBody, CardReader, MacBook, SdCard } from "./models";

/**
 * The hero: real 3D objects suspended in the white.
 *
 * They obey the same rules as the DOM bodies elsewhere on the site — anchor
 * spring, gravity sag, a displacement field around the cursor, and lag under
 * scroll proportional to mass — but solved in three dimensions, so an object
 * also tumbles, catches the light differently as it turns, and can be spun.
 *
 * Pointer and scroll state is read from the shared physics World rather than
 * from a second set of listeners, so the 3D objects and the photographs react
 * to exactly the same input.
 */

// ------------------------------------------------------------------ constants

/** World units. Matches the DOM field in feel, not in scale. */
const FIELD_RADIUS = 2.6;
const FIELD_STRENGTH = 26;
const MAX_OFFSET = 2.2;
const MAX_SPIN = 7;

// -------------------------------------------------------------- soft shadow

/**
 * A soft blob under each object.
 *
 * Deliberately not a shadow map: the objects hang at very different heights in
 * an empty room, so a shared floor would collect every shadow in a heap at the
 * bottom of the screen. A per-object blob reads the way the `.material` shadow
 * does in the DOM — as an object resting just above the paper — which keeps the
 * 3D and the flat parts of the page speaking the same language.
 */
function useShadowTexture() {
  return useMemo(() => {
    const size = 128;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(16,15,13,0.34)");
    g.addColorStop(0.45, "rgba(16,15,13,0.16)");
    g.addColorStop(1, "rgba(16,15,13,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

// --------------------------------------------------------------- environment

/** Procedural studio reflections. No HDRI fetch, so nothing leaves the origin. */
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    scene.environmentIntensity = 0.55;
    return () => {
      scene.environment = null;
      env.texture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

// ------------------------------------------------------------------- object

export type GearPlacement = {
  id: string;
  side: "left" | "right";
  /** Centre position, as a fraction of half-viewport from the outer edge. */
  inset: number;
  /** Vertical position, -1 (bottom) to 1 (top). */
  yFrac: number;
  z: number;
  scale: number;
  mass: number;
  /** Resting orientation. */
  rest: [number, number, number];
  /** Amplitude of the idle yaw oscillation, radians. */
  sway: number;
  delay: number;
  /** Radius of the soft shadow relative to scale. */
  shadow: number;
};

function GearObject({
  placement,
  children,
  onGrabChange,
}: {
  placement: GearPlacement;
  children: ReactNode;
  onGrabChange: (grabbing: boolean) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const shadowTex = useShadowTexture();
  const { camera, gl, viewport, raycaster } = useThree();

  // Mutable simulation state, kept off React so a frame costs no re-render.
  const s = useRef({
    off: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    rot: new THREE.Vector3(...placement.rest),
    rotVel: new THREE.Vector3(),
    scale: 0,
    // Desynchronises the idle oscillation between objects.
    phase: Math.random() * Math.PI * 2,
    wait: placement.delay,
    entered: false,
    dragging: false,
    grabOffset: new THREE.Vector3(),
    lastPointer: new THREE.Vector3(),
    home: new THREE.Vector3(),
  }).current;

  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), -placement.z), [placement.z]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  /** Client coordinates to a world point on this object's z-plane. */
  const toWorld = (clientX: number, clientY: number, out: THREE.Vector3) => {
    const rect = gl.domElement.getBoundingClientRect();
    ndc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -(((clientY - rect.top) / rect.height) * 2 - 1),
    );
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(plane, out) ? out : null;
  };

  // Real state, not a ref flag: the window listeners below are attached and
  // detached by an effect, and an effect can only react to something React can
  // see change. A mutable ref would attach on grab and never let go.
  const [dragging, setDragging] = useState(false);
  s.dragging = dragging;

  // Wired at the window level so a fast pointer cannot outrun the mesh and
  // leave the object stranded mid-drag.
  useEffect(() => {
    if (!dragging) return;

    const move = (e: PointerEvent) => {
      const p = toWorld(e.clientX, e.clientY, tmp);
      if (!p) return;
      const targetX = p.x - s.grabOffset.x - s.home.x;
      const targetY = p.y - s.grabOffset.y - s.home.y;
      // Horizontal drag spins around Y, vertical around X — the way you would
      // actually turn an object over in your hand.
      s.rotVel.y += (targetX - s.off.x) * 2.4;
      s.rotVel.x -= (targetY - s.off.y) * 2.4;
      s.off.x = targetX;
      s.off.y = targetY;
    };
    const up = () => setDragging(false);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    // A drag must not survive the tab being hidden or the window losing focus.
    window.addEventListener("blur", up);

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    onGrabChange(true);

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      onGrabChange(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  useFrame((state, rawDelta) => {
    const g = group.current;
    const ir = inner.current;
    if (!g || !ir) return;

    const dt = Math.min(rawDelta, 1 / 20);
    const world = getWorld();
    const input = world?.input();
    const reduced = world?.reducedMotion ?? false;

    // Home position, recomputed every frame so a resize needs no extra wiring.
    const halfW = viewport.width / 2;
    const halfH = viewport.height / 2;
    const dir = placement.side === "left" ? -1 : 1;
    s.home.set(dir * (halfW - placement.inset * viewport.width), placement.yFrac * halfH, placement.z);

    if (reduced) {
      g.position.copy(s.home);
      g.scale.setScalar(placement.scale);
      ir.rotation.set(...placement.rest);
      return;
    }

    // Entrance: hold, then spring up to full size while settling down from above.
    if (s.wait > 0) {
      s.wait -= dt;
      g.scale.setScalar(0);
      return;
    }
    if (!s.entered) {
      s.entered = true;
      s.off.y = 1.1;
    }
    s.scale += (1 - s.scale) * Math.min(dt * 7, 1);

    const invMass = 1 / placement.mass;

    if (s.dragging) {
      // Position is driven by the pointer; only spin is simulated.
      s.vel.set(0, 0, 0);
    } else {
      const acc = tmp.set(0, 0, 0);

      // 1. Anchor spring and 2. gravity, as a constant sag.
      const k = 26;
      acc.x -= k * s.off.x;
      acc.y -= k * s.off.y;
      acc.y -= 1.6 * placement.mass;

      // 3. Pointer displacement field, in world units on this object's plane.
      if (input?.active) {
        const p = toWorld(input.x, input.y, new THREE.Vector3());
        if (p) {
          const dx = s.home.x + s.off.x - p.x;
          const dy = s.home.y + s.off.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d < FIELD_RADIUS && d > 1e-4) {
            const f = 1 - d / FIELD_RADIUS;
            const mag = FIELD_STRENGTH * f * f * invMass;
            acc.x += (dx / d) * mag;
            acc.y += (dy / d) * mag;
            // Off-centre pressure turns the object as it is pushed.
            s.rotVel.y += (dx / FIELD_RADIUS) * f * 0.9 * invMass * dt;
            s.rotVel.x += (dy / FIELD_RADIUS) * f * 0.5 * invMass * dt;
          }
        }
      }

      // 4. Scroll inertia: heavier objects lag further behind the page.
      if (input && input.scrollV !== 0) {
        acc.y += input.scrollV * 0.0016 * placement.mass;
        s.rotVel.x += input.scrollV * 0.000018 * invMass;
      }

      // Viscous damping.
      acc.x -= 6.5 * s.vel.x;
      acc.y -= 6.5 * s.vel.y;

      s.vel.addScaledVector(acc, dt);
      s.off.addScaledVector(s.vel, dt);

      // Keep it in its rail no matter what impulse arrives.
      if (Math.abs(s.off.x) > MAX_OFFSET) {
        s.off.x = THREE.MathUtils.clamp(s.off.x, -MAX_OFFSET, MAX_OFFSET);
        s.vel.x *= 0.4;
      }
      if (Math.abs(s.off.y) > MAX_OFFSET) {
        s.off.y = THREE.MathUtils.clamp(s.off.y, -MAX_OFFSET, MAX_OFFSET);
        s.vel.y *= 0.4;
      }
    }

    /*
     * Spin.
     *
     * Every axis springs back to a slowly breathing version of the resting
     * pose. An earlier version instead fed a constant angular acceleration in,
     * which made each object drift through a full revolution — so an SD card
     * or a card reader spent a good part of every minute edge-on and unreadable
     * as a thin sliver. These are products on a shelf, not a carousel: they
     * should always be recognisable, and only wobble when disturbed.
     */
    const t = state.clock.elapsedTime + s.phase;
    const targetX = placement.rest[0] + Math.sin(t * 0.5) * 0.05;
    const targetY = placement.rest[1] + Math.sin(t * 0.37) * placement.sway;
    const targetZ = placement.rest[2] + Math.cos(t * 0.44) * 0.04;

    s.rotVel.x += (targetX - s.rot.x) * 3.4 * dt;
    s.rotVel.y += (targetY - s.rot.y) * 2.0 * dt;
    s.rotVel.z += (targetZ - s.rot.z) * 3.4 * dt;
    s.rotVel.clampScalar(-MAX_SPIN, MAX_SPIN);
    // Loose while held so it turns freely in the hand, then tighter so a
    // released object settles back to a readable pose instead of tumbling.
    const spinDamp = s.dragging ? 3.5 : 2.1;
    s.rotVel.multiplyScalar(Math.max(0, 1 - spinDamp * dt));
    s.rot.addScaledVector(s.rotVel, dt);

    g.position.set(s.home.x + s.off.x, s.home.y + s.off.y, s.home.z);
    g.scale.setScalar(placement.scale * s.scale);
    ir.rotation.set(s.rot.x, s.rot.y, s.rot.z);

    // A flattened ellipse just under the object, spreading and fading as it
    // rises — the same cue the DOM `.material` shadow uses. Kept deliberately
    // tight: a large soft disc floating below reads as a second object.
    if (shadowRef.current) {
      const lift = THREE.MathUtils.clamp((s.off.y + 0.5) / 1.8, 0, 1);
      shadowRef.current.position.set(0, -placement.shadow * 1.18 - s.off.y * 0.5, -0.3);
      shadowRef.current.scale.set(
        placement.shadow * (1.05 + lift * 0.35),
        placement.shadow * (0.34 + lift * 0.1),
        1,
      );
      (shadowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.7 - lift * 0.34;
    }
  });

  return (
    <group ref={group}>
      <mesh ref={shadowRef} renderOrder={-1}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial
          map={shadowTex}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <group
        ref={inner}
        onPointerDown={(e) => {
          if (e.button !== 0 || getWorld()?.reducedMotion) return;
          e.stopPropagation();
          const p = toWorld(e.nativeEvent.clientX, e.nativeEvent.clientY, new THREE.Vector3());
          if (!p) return;
          // Grab where it was actually clicked, so it does not jump to centre.
          s.grabOffset.set(p.x - (s.home.x + s.off.x), p.y - (s.home.y + s.off.y), 0);
          setDragging(true);
        }}
        onPointerOver={() => {
          if (!dragging) document.body.style.cursor = "grab";
        }}
        onPointerOut={() => {
          if (!dragging) document.body.style.cursor = "";
        }}
      >
        {children}
      </group>
    </group>
  );
}

// -------------------------------------------------------------------- scene

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.65} />
      {/* Key, from the upper left, matching the page's own top-lit gradient. */}
      <directionalLight position={[-4, 6, 6]} intensity={2.1} />
      {/* Fill, to keep the shadow sides from going muddy. */}
      <directionalLight position={[5, -1, 4]} intensity={0.7} />
      {/* Rim, to separate the objects from the paper. */}
      <directionalLight position={[2, 3, -6]} intensity={1.1} />
    </>
  );
}

export type SceneProps = {
  /** Photographs cycled on the camera's rear screen. */
  screenSrcs: string[];
  /** Narrow viewport: one object under the type instead of four in the rails. */
  compact?: boolean;
};

/** Screen plane aspect, used to cover rather than squash each photograph. */
const SCREEN_ASPECT = 1.18 / 0.76;

function Objects({ screenSrcs, compact }: SceneProps) {
  const [, setGrabbing] = useState(false);
  const [textures, setTextures] = useState<THREE.Texture[]>([]);
  const [index, setIndex] = useState(0);

  // Load every frame the camera will show, once.
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    const loaded: THREE.Texture[] = [];

    Promise.all(
      screenSrcs.map(
        (src) =>
          new Promise<THREE.Texture | null>((resolve) =>
            loader.load(
              src,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                const srcAspect = tex.image.width / tex.image.height;
                if (srcAspect > SCREEN_ASPECT) {
                  tex.repeat.set(SCREEN_ASPECT / srcAspect, 1);
                  tex.offset.set((1 - SCREEN_ASPECT / srcAspect) / 2, 0);
                } else {
                  tex.repeat.set(1, srcAspect / SCREEN_ASPECT);
                  tex.offset.set(0, (1 - srcAspect / SCREEN_ASPECT) / 2);
                }
                resolve(tex);
              },
              undefined,
              () => resolve(null),
            ),
          ),
      ),
    ).then((all) => {
      for (const t of all) if (t) loaded.push(t);
      if (cancelled) {
        for (const t of loaded) t.dispose();
        return;
      }
      setTextures(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [screenSrcs]);

  // Flip through them the way you would review shots on the back of the camera.
  useEffect(() => {
    if (textures.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % textures.length), 4200);
    return () => window.clearInterval(id);
  }, [textures.length]);

  // Free the GPU memory when the hero unmounts.
  useEffect(() => () => {
    for (const t of textures) t.dispose();
  }, [textures]);

  const screen = textures[index];
  // Offset so the laptop and the camera never show the same frame.
  const laptopScreen = textures.length > 1 ? textures[(index + 1) % textures.length] : textures[0];

  // On a phone the rails do not exist, so the composition collapses to the one
  // object that best says "camera work", sitting under the type.
  const compactPlacements: (GearPlacement & { node: ReactNode })[] = [
    {
      id: "camera",
      side: "right",
      inset: 0.5,
      // Low enough to clear the call-to-action buttons above it. The canvas is
      // full-bleed behind the type, so anything higher crowds the controls.
      yFrac: -0.72,
      z: 0,
      scale: 0.56,
      mass: 2.4,
      rest: [0.1, 2.42, -0.04],
      sway: 0.13,
      delay: 0.45,
      shadow: 1.2,
      node: <CameraBody screen={screen} />,
    },
  ];

  const placements: (GearPlacement & { node: ReactNode })[] = [
    {
      id: "airpods",
      side: "left",
      inset: 0.115,
      yFrac: 0.46,
      z: 0,
      scale: 0.66,
      mass: 1.5,
      rest: [0.14, -0.42, 0.06],
      sway: 0.16,
      delay: 0.35,
      shadow: 1.15,
      node: <AirPodsMax />,
    },
    {
      id: "camera",
      side: "right",
      inset: 0.115,
      yFrac: 0.42,
      z: 0.3,
      scale: 0.66,
      mass: 2.6,
      // Turned to show the back, so the photograph on the rear screen is the
      // side facing the reader. That screen is the whole point of this object.
      rest: [0.1, 2.42, -0.05],
      sway: 0.13,
      delay: 0.5,
      shadow: 1.1,
      node: <CameraBody screen={screen} />,
    },
    {
      // Wide and flat, so it takes the bottom of the left rail where there is
      // room for its span without crowding the headphones above.
      id: "macbook",
      side: "left",
      // Deeper inset and a smaller scale than the others: it is by far the
      // widest object here, and at the shared inset its corner ran off-screen.
      inset: 0.16,
      yFrac: -0.5,
      z: -0.1,
      scale: 0.38,
      mass: 3.2,
      rest: [0.42, 0.66, 0.04],
      sway: 0.1,
      delay: 0.64,
      shadow: 1.3,
      node: <MacBook screen={laptopScreen} />,
    },
    {
      id: "sdcard",
      side: "right",
      inset: 0.2,
      yFrac: -0.16,
      z: -0.2,
      scale: 0.48,
      mass: 0.5,
      rest: [0.22, 0.36, -0.12],
      sway: 0.22,
      delay: 0.76,
      shadow: 0.6,
      node: <SdCard />,
    },
    {
      id: "reader",
      side: "right",
      inset: 0.1,
      yFrac: -0.66,
      z: -0.4,
      scale: 0.56,
      mass: 0.85,
      rest: [0.3, 0.5, 0.16],
      sway: 0.2,
      delay: 0.88,
      shadow: 0.7,
      node: <CardReader />,
    },
  ];

  const active = compact ? compactPlacements : placements;

  return (
    <>
      {active.map(({ node, ...p }) => (
        <GearObject key={p.id} placement={p} onGrabChange={setGrabbing}>
          {node}
        </GearObject>
      ))}
    </>
  );
}

export function HeroScene({ screenSrcs, compact }: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  // Stop rendering entirely once the hero scrolls away — the objects are only
  // ever visible at the top of the page.
  const [active, setActive] = useState(true);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={host} className="absolute inset-0 z-0" aria-hidden="true">
      <Canvas
        frameloop={active ? "always" : "never"}
        dpr={[1, 1.75]}
        camera={{ fov: 32, position: [0, 0, 9], near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
      >
        <Suspense fallback={null}>
          <StudioEnvironment />
          <Lighting />
          <Objects screenSrcs={screenSrcs} compact={compact} />
        </Suspense>
      </Canvas>
    </div>
  );
}
