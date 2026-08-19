import * as THREE from "three";

/**
 * Geometry helpers for the hero objects.
 *
 * Everything in the 3D scene is generated in code — there are no model files to
 * download, which keeps the page self-contained and means the objects inherit
 * the site's palette rather than fighting it.
 *
 * Real products have no sharp edges, and neither should these: almost every
 * form here is an extruded rounded profile with a bevel, because a bevel is
 * what catches the key light and makes a shape read as a manufactured object
 * instead of a primitive.
 */

/** A rectangle with equal corner radii, centred on the origin. */
export function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);
  const s = new THREE.Shape();
  s.moveTo(-w + r, -h);
  s.lineTo(w - r, -h);
  s.quadraticCurveTo(w, -h, w, -h + r);
  s.lineTo(w, h - r);
  s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(-w + r, h);
  s.quadraticCurveTo(-w, h, -w, h - r);
  s.lineTo(-w, -h + r);
  s.quadraticCurveTo(-w, -h, -w + r, -h);
  return s;
}

/**
 * The SD card outline: a rounded rectangle with the top-left corner cut off.
 * That chamfer is the single detail that makes the shape instantly readable at
 * thumbnail size, so it is worth modelling rather than faking with a texture.
 */
export function sdCardShape(width: number, height: number, radius: number, cut: number): THREE.Shape {
  const w = width / 2;
  const h = height / 2;
  const r = radius;
  const s = new THREE.Shape();
  s.moveTo(-w + r, -h);
  s.lineTo(w - r, -h);
  s.quadraticCurveTo(w, -h, w, -h + r);
  s.lineTo(w, h - r);
  s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(-w + cut, h);
  s.lineTo(-w, h - cut);
  s.lineTo(-w, -h + r);
  s.quadraticCurveTo(-w, -h, -w + r, -h);
  return s;
}

/**
 * Extrudes a shape into a slab with bevelled faces, then recentres it on the
 * origin so the caller can position by centre rather than by corner.
 */
export function extrudeSlab(
  shape: THREE.Shape,
  depth: number,
  bevel = Math.min(depth * 0.3, 0.02),
  curveSegments = 24,
): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(depth - bevel * 2, 0.001),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}

/** A box with every edge rounded. Depth runs along +Z before any rotation. */
export function roundedBox(
  width: number,
  height: number,
  depth: number,
  radius = 0.06,
): THREE.BufferGeometry {
  return extrudeSlab(roundedRectShape(width, height, radius), depth);
}

/**
 * A flat band swept along a circular arc — the AirPods Max headband.
 *
 * A plain torus has a circular tube, which reads as a wire. Sweeping a
 * rectangular profile instead gives the flat, wide strap the real product has.
 */
export function arcBand(
  radius: number,
  thickness: number,
  width: number,
  startAngle: number,
  endAngle: number,
  segments = 64,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(
    Array.from({ length: segments + 1 }, (_, i) => {
      const t = startAngle + ((endAngle - startAngle) * i) / segments;
      return new THREE.Vector3(Math.cos(t) * radius, Math.sin(t) * radius, 0);
    }),
  );
  // The arc lies in XY, so the tube's binormal is Z. Scaling Z turns the round
  // cross-section into a flat oval — a strap rather than a rod — without
  // disturbing the sweep.
  const geo = new THREE.TubeGeometry(curve, segments, thickness, 12, false);
  geo.scale(1, 1, width / thickness);
  geo.computeVertexNormals();
  return geo;
}

/** Disposes every geometry in a record, for effect cleanup. */
export function disposeAll(record: Record<string, THREE.BufferGeometry>) {
  for (const g of Object.values(record)) g.dispose();
}
