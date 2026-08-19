"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * Client boundary for the 3D hero.
 *
 * Three.js cannot server-render, and there is no reason to ship it to a visitor
 * who will never see it, so the scene is loaded on the client only and only
 * once the browser has told us it can actually run it.
 *
 * Three gates before anything downloads:
 *   - WebGL has to exist,
 *   - the visitor must not have asked for reduced motion,
 *   - and on a narrow screen the layout switches to a single object rather than
 *     trying to fit five into rails that are not there.
 *
 * When any gate fails the hero is simply type on paper, which is a perfectly
 * good hero and costs nothing.
 */

const HeroScene = dynamic(() => import("./three/HeroScene").then((m) => m.HeroScene), {
  ssr: false,
  loading: () => null,
});

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

export function HeroStage({ screenSrcs }: { screenSrcs: string[] }) {
  const [state, setState] = useState<{ show: boolean; compact: boolean }>({
    show: false,
    compact: false,
  });

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 767px)");

    const update = () =>
      setState({ show: !motion.matches && hasWebGL(), compact: narrow.matches });

    update();
    motion.addEventListener("change", update);
    narrow.addEventListener("change", update);
    return () => {
      motion.removeEventListener("change", update);
      narrow.removeEventListener("change", update);
    };
  }, []);

  if (!state.show) return null;
  return <HeroScene screenSrcs={screenSrcs} compact={state.compact} />;
}
