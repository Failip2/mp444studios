"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { arcBand, extrudeSlab, roundedBox, roundedRectShape, sdCardShape } from "@/lib/geometry";

/**
 * The hero objects, built from primitives.
 *
 * The palette deliberately matches the rest of the site: warm off-whites,
 * greys and near-black, no accent colour anywhere. The photographs are the only
 * thing on the page allowed to be colourful, and that holds inside the 3D scene
 * too — the one exception is the gold on the SD card contacts, which is what
 * makes a small grey rectangle read as an SD card at all.
 */

// ------------------------------------------------------------------ materials

const SHELL = { color: "#efedE8", roughness: 0.52, metalness: 0.08 };
const SHELL_DARK = { color: "#26251f", roughness: 0.55, metalness: 0.12 };
const ALU = { color: "#cfccc6", roughness: 0.3, metalness: 0.85 };
const ALU_DARK = { color: "#5f5c57", roughness: 0.34, metalness: 0.8 };
const FABRIC = { color: "#b4b0a9", roughness: 0.95, metalness: 0 };
const RUBBER = { color: "#1a1a18", roughness: 0.85, metalness: 0 };
const GLASS = { color: "#0a0b0d", roughness: 0.06, metalness: 0.6 };
const GOLD = { color: "#b9975b", roughness: 0.3, metalness: 0.95 };

/** Shared across every object so the whole scene lights consistently. */
function Std(props: React.ComponentProps<"meshStandardMaterial">) {
  return <meshStandardMaterial {...props} />;
}

// ------------------------------------------------------------- AirPods Max

export function AirPodsMax() {
  const geo = useMemo(() => {
    const cup = new THREE.CylinderGeometry(0.6, 0.6, 0.32, 48);
    // Ear cups are ovals, not circles.
    cup.scale(1, 1, 0.84);
    const cushion = new THREE.CylinderGeometry(0.58, 0.64, 0.22, 48);
    cushion.scale(1, 1, 0.84);
    return {
      cup,
      cushion,
      // Two concentric arcs: the aluminium frame, and the fabric canopy slung
      // inside it. That gap is the whole silhouette of these headphones.
      frame: arcBand(1.0, 0.05, 0.26, Math.PI * 0.1, Math.PI * 0.9),
      canopy: arcBand(0.86, 0.055, 0.3, Math.PI * 0.14, Math.PI * 0.86),
      stem: roundedBox(0.1, 0.46, 0.085, 0.038),
      crown: new THREE.CylinderGeometry(0.08, 0.08, 0.08, 28),
      button: roundedBox(0.05, 0.13, 0.045, 0.02),
    };
  }, []);

  // Arc endpoints, so the stems meet the frame exactly instead of by eye.
  const BAND_Y = 0.12;
  const endX = Math.cos(Math.PI * 0.1) * 1.0;
  const endY = Math.sin(Math.PI * 0.1) * 1.0 + BAND_Y;
  const cupY = -0.62;
  const stemY = (endY + cupY) / 2 + 0.06;

  return (
    <group>
      <mesh geometry={geo.frame} position={[0, BAND_Y, 0]} castShadow receiveShadow>
        <Std {...ALU} />
      </mesh>
      <mesh geometry={geo.canopy} position={[0, BAND_Y + 0.02, 0]} castShadow>
        <Std {...FABRIC} />
      </mesh>

      {/* Telescoping stems, bridging the frame ends down to each cup. */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={geo.stem} position={[s * endX, stemY, 0]} castShadow>
          <Std {...ALU_DARK} />
        </mesh>
      ))}

      {/* Ear cups, rotated so their axis runs left-to-right. */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (endX + 0.02), cupY, 0]}>
          <mesh geometry={geo.cup} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <Std {...SHELL} />
          </mesh>
          <mesh
            geometry={geo.cushion}
            position={[-s * 0.24, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <Std {...FABRIC} />
          </mesh>
        </group>
      ))}

      {/*
        Digital crown and noise-control button. They sit on the top edge of the
        right cup, not on its face — two small circles on the face of a pale
        oval read unmistakably as a pair of eyes.
      */}
      <mesh
        geometry={geo.crown}
        position={[endX + 0.16, cupY + 0.52, -0.12]}
        castShadow
      >
        <Std {...ALU} />
      </mesh>
      <mesh geometry={geo.button} position={[endX + 0.16, cupY + 0.54, 0.14]}>
        <Std {...ALU_DARK} />
      </mesh>
    </group>
  );
}

// ----------------------------------------------------------------- camera

/**
 * Mirrorless body with a lens. The rear screen carries a real photograph, which
 * is the point at which the 3D gear and the portfolio become the same object
 * rather than two decorations sharing a page.
 */
export function CameraBody({ screen }: { screen?: THREE.Texture }) {
  const geo = useMemo(
    () => ({
      body: roundedBox(1.5, 1.12, 0.78, 0.12),
      top: roundedBox(1.2, 0.18, 0.5, 0.06),
      grip: roundedBox(0.34, 1.0, 0.52, 0.14),
      mount: new THREE.CylinderGeometry(0.42, 0.42, 0.12, 48),
      barrel: new THREE.CylinderGeometry(0.38, 0.42, 0.82, 48),
      ring: new THREE.CylinderGeometry(0.425, 0.425, 0.13, 48),
      hood: new THREE.CylinderGeometry(0.44, 0.4, 0.1, 48),
      glass: new THREE.CylinderGeometry(0.33, 0.33, 0.03, 48),
      dial: new THREE.CylinderGeometry(0.16, 0.16, 0.07, 32),
      shutter: new THREE.CylinderGeometry(0.075, 0.075, 0.05, 24),
      shoe: roundedBox(0.34, 0.06, 0.26, 0.02),
      evf: roundedBox(0.42, 0.26, 0.3, 0.06),
      screenPlate: roundedBox(1.28, 0.86, 0.03, 0.04),
      screen: new THREE.PlaneGeometry(1.18, 0.76),
    }),
    [],
  );

  return (
    <group>
      <mesh geometry={geo.body} castShadow receiveShadow>
        <Std {...SHELL_DARK} />
      </mesh>
      <mesh geometry={geo.top} position={[-0.1, 0.62, -0.02]} castShadow>
        <Std {...SHELL_DARK} />
      </mesh>
      <mesh geometry={geo.grip} position={[0.7, -0.03, 0.02]} castShadow>
        <Std {...RUBBER} />
      </mesh>

      {/* Viewfinder hump, hot shoe, mode dial and shutter release. */}
      <mesh geometry={geo.evf} position={[-0.34, 0.76, -0.04]} castShadow>
        <Std {...SHELL_DARK} />
      </mesh>
      <mesh geometry={geo.shoe} position={[-0.34, 0.93, -0.04]}>
        <Std {...ALU_DARK} />
      </mesh>
      <mesh geometry={geo.dial} position={[0.42, 0.75, -0.05]} castShadow>
        <Std {...ALU_DARK} />
      </mesh>
      <mesh geometry={geo.shutter} position={[0.7, 0.74, 0.16]} castShadow>
        <Std {...ALU} />
      </mesh>

      {/* Lens assembly, pointing forward along +Z. */}
      <group position={[-0.1, -0.02, 0.39]}>
        <mesh geometry={geo.mount} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.05]} castShadow>
          <Std {...ALU_DARK} />
        </mesh>
        <mesh geometry={geo.barrel} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.5]} castShadow>
          <Std {...SHELL_DARK} />
        </mesh>
        <mesh geometry={geo.ring} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.34]} castShadow>
          <Std color="#141412" roughness={0.9} metalness={0} />
        </mesh>
        <mesh geometry={geo.hood} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.94]} castShadow>
          <Std {...ALU_DARK} />
        </mesh>
        <mesh geometry={geo.glass} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.97]}>
          <Std {...GLASS} />
        </mesh>
      </group>

      {/* Rear screen, facing -Z. */}
      <group position={[0, -0.02, -0.4]} rotation={[0, Math.PI, 0]}>
        <mesh geometry={geo.screenPlate} position={[0, 0, -0.01]}>
          <Std color="#111110" roughness={0.6} metalness={0} />
        </mesh>
        <mesh geometry={geo.screen} position={[0, 0, 0.012]}>
          {/*
            One material, never two. Swapping between two <meshBasicMaterial>
            elements in a conditional does not remount them — React sees the
            same element type and only applies the props of the new branch, so
            the placeholder's dark `color` survives and multiplies the
            photograph down to black. Setting both props every time avoids it.

            toneMapped off keeps the photograph reading as a lit panel rather
            than a print sitting in the room.
          */}
          <meshBasicMaterial
            // The key matters. A material compiled without a map has no
            // USE_MAP define in its shader, and assigning `.map` afterwards
            // does not recompile it — the texture is simply ignored. Keying on
            // the texture's presence remounts the material so it is built with
            // the map from the start.
            key={screen ? "photo" : "blank"}
            map={screen ?? null}
            color={screen ? "#ffffff" : "#2b2b28"}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- SD card

export function SdCard() {
  const geo = useMemo(() => {
    const body = extrudeSlab(sdCardShape(1.5, 1.85, 0.09, 0.34), 0.1, 0.018, 16);
    const label = extrudeSlab(roundedRectShape(1.24, 0.86, 0.05), 0.012, 0.004, 12);
    const contact = roundedBox(0.11, 0.34, 0.02, 0.012);
    const notch = roundedBox(0.08, 0.2, 0.06, 0.02);
    return { body, label, contact, notch };
  }, []);

  return (
    <group>
      <mesh geometry={geo.body} castShadow receiveShadow>
        <Std color="#2a2926" roughness={0.62} metalness={0.05} />
      </mesh>
      {/* Printed label panel. */}
      <mesh geometry={geo.label} position={[0.02, 0.36, 0.056]}>
        <Std color="#e9e6e0" roughness={0.8} metalness={0} />
      </mesh>
      {/* Contact fingers along the bottom edge. */}
      {[-0.5, -0.32, -0.14, 0.04, 0.22, 0.4, 0.58].map((x, i) => (
        <mesh key={i} geometry={geo.contact} position={[x, -0.68, 0.048]}>
          <Std {...GOLD} />
        </mesh>
      ))}
      {/* Write-protect switch. */}
      <mesh geometry={geo.notch} position={[-0.75, 0.28, 0]}>
        <Std color="#d8d5cf" roughness={0.7} metalness={0} />
      </mesh>
    </group>
  );
}

// ----------------------------------------------------------- card reader

export function CardReader() {
  const geo = useMemo(
    () => ({
      body: roundedBox(1.9, 0.92, 0.28, 0.1),
      slot: roundedBox(1.12, 0.14, 0.16, 0.03),
      usb: roundedBox(0.5, 0.24, 0.1, 0.045),
      usbTip: roundedBox(0.34, 0.15, 0.06, 0.028),
      led: new THREE.CylinderGeometry(0.045, 0.045, 0.02, 20),
    }),
    [],
  );

  return (
    <group>
      <mesh geometry={geo.body} castShadow receiveShadow>
        <Std {...ALU} />
      </mesh>
      {/* Card slot, recessed into the front face. */}
      <mesh geometry={geo.slot} position={[0, -0.12, 0.09]}>
        <Std color="#131311" roughness={0.9} metalness={0} />
      </mesh>
      <mesh geometry={geo.led} position={[0.72, 0.24, 0.145]} rotation={[Math.PI / 2, 0, 0]}>
        <Std color="#4a4a45" roughness={0.4} metalness={0.2} />
      </mesh>
      {/* USB-C plug on the left end. */}
      <group position={[-1.12, 0, 0]}>
        <mesh geometry={geo.usb} castShadow>
          <Std {...ALU_DARK} />
        </mesh>
        <mesh geometry={geo.usbTip} position={[-0.32, 0, 0]} castShadow>
          <Std {...ALU} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- MacBook

/**
 * Open laptop, lid raised past vertical the way one actually sits on a desk.
 *
 * Like the camera, its screen carries a real photograph — this is where the
 * footage ends up, so showing a frame from the portfolio on it is the honest
 * thing to put there.
 */
export function MacBook({ screen }: { screen?: THREE.Texture }) {
  const geo = useMemo(
    () => ({
      base: roundedBox(2.6, 0.085, 1.78, 0.055),
      lid: roundedBox(2.56, 1.68, 0.06, 0.05),
      display: new THREE.PlaneGeometry(2.4, 1.52),
      keyboard: roundedBox(2.16, 0.012, 0.86, 0.03),
      trackpad: roundedBox(0.92, 0.01, 0.6, 0.03),
      key: roundedBox(0.13, 0.014, 0.13, 0.02),
      foot: new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16),
      hinge: new THREE.CylinderGeometry(0.045, 0.045, 2.5, 20),
    }),
    [],
  );

  // Individual keys, laid out once. Six rows reads as a keyboard without the
  // cost of modelling a real layout.
  const keys = useMemo(() => {
    const out: [number, number][] = [];
    const cols = 14;
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push([(c - (cols - 1) / 2) * 0.148, (r - (rows - 1) / 2) * 0.15]);
      }
    }
    return out;
  }, []);

  /*
   * Lid angle, in radians about X.
   *
   * 0 is straight up. Negative leans the lid back, which is where a laptop in
   * use actually sits — roughly 105° from the base. Anything approaching -PI/2
   * folds it flat, and past that it swings below the base and the whole thing
   * reads as a tray rather than a laptop.
   */
  const LID = -0.28;

  return (
    <group>
      {/* Base. */}
      <mesh geometry={geo.base} castShadow receiveShadow>
        <Std {...ALU} />
      </mesh>

      {/* Keyboard well, keys and trackpad, sunk into the top face. */}
      <mesh geometry={geo.keyboard} position={[0, 0.046, -0.28]}>
        <Std color="#1e1e1c" roughness={0.85} metalness={0.1} />
      </mesh>
      <group position={[0, 0.055, -0.28]}>
        {keys.map(([x, z], i) => (
          <mesh key={i} geometry={geo.key} position={[x, 0, z]}>
            <Std color="#2c2c29" roughness={0.8} metalness={0.05} />
          </mesh>
        ))}
      </group>
      <mesh geometry={geo.trackpad} position={[0, 0.047, 0.5]}>
        <Std color="#b8b5af" roughness={0.35} metalness={0.5} />
      </mesh>

      {/* Hinge, and the lid pivoting from the back edge. */}
      <mesh
        geometry={geo.hinge}
        position={[0, 0.02, -0.88]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <Std {...ALU_DARK} />
      </mesh>

      <group position={[0, 0.02, -0.88]} rotation={[LID, 0, 0]}>
        <mesh geometry={geo.lid} position={[0, 0.84, 0]} castShadow receiveShadow>
          <Std {...ALU} />
        </mesh>
        {/* Bezel and the photograph itself, sitting just proud of the lid. */}
        <mesh geometry={geo.display} position={[0, 0.84, 0.033]}>
          <Std color="#0d0d0c" roughness={0.35} metalness={0} />
        </mesh>
        <mesh geometry={geo.display} position={[0, 0.84, 0.035]} scale={[0.94, 0.93, 1]}>
          {/* Same keying rule as the camera screen: a material built without a
              map never gains one, so it has to remount when the texture lands. */}
          <meshBasicMaterial
            key={screen ? "photo" : "blank"}
            map={screen ?? null}
            color={screen ? "#ffffff" : "#232320"}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Feet. */}
      {[
        [-1.1, -0.7],
        [1.1, -0.7],
        [-1.1, 0.72],
        [1.1, 0.72],
      ].map(([x, z], i) => (
        <mesh key={i} geometry={geo.foot} position={[x, -0.05, z]}>
          <Std color="#141412" roughness={0.9} metalness={0} />
        </mesh>
      ))}
    </group>
  );
}
