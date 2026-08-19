"use client";

import type { ReactNode } from "react";
import { usePhysics } from "./usePhysics";
import type { BodyOptions } from "@/lib/physics";

/**
 * Wraps children in a physics body.
 *
 * The wrapper is the thing that moves, so it must be the element carrying the
 * shadow (`.material`) — otherwise the shadow would stay behind while the
 * object slid out from under it.
 */
export function Floating({
  children,
  className = "",
  as: Tag = "div",
  ...physics
}: BodyOptions & {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "article" | "figure";
}) {
  const ref = usePhysics<HTMLDivElement>(physics);
  return (
    <Tag
      ref={ref as never}
      className={`material ${physics.draggable ? "cursor-grab active:cursor-grabbing touch-none" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}
