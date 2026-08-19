"use client";

import Link from "next/link";
import { Photo } from "./Photo";
import { Floating } from "./Floating";
import type { Category } from "@/content/portfolio";
import type { Photo as PhotoData } from "@/lib/media-types";

/**
 * One body of work, presented the way a shop presents a single product: the
 * object floating in white, a name, and a short spec block underneath.
 *
 * The image sits in a physics body so it lifts off the page under the cursor
 * while the text stays exactly where it is — motion on the object, never on the
 * words.
 */
export function CategoryCard({
  category,
  cover,
  count,
  index,
}: {
  category: Category;
  cover: PhotoData;
  count: number;
  index: number;
}) {
  return (
    <Link
      href={`/portfolio/${category.slug}`}
      className="group block"
      data-reveal
      style={{ "--reveal-delay": `${index * 110}ms` } as React.CSSProperties}
    >
      <Floating
        mass={1.6 + index * 0.4}
        push={0.55}
        stiffness={190}
        damping={19}
        sag={5}
        tilt={0.00016}
        className="overflow-hidden rounded-[3px] bg-paper-raised"
      >
        <Photo
          photo={cover}
          alt={`${category.title} — ${category.subtitle}`}
          sizes="(min-width: 768px) 30vw, 90vw"
          ratio={0.78}
          imgClassName="transition-transform duration-[1.4s] [transition-timing-function:var(--ease-material)] group-hover:scale-[1.04]"
        />
      </Floating>

      <div className="mt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h3 className="text-[clamp(1.25rem,2vw,1.75rem)] font-medium tracking-[-0.03em]">
            {category.title}
          </h3>
          <span className="label tabular-nums">{count}</span>
        </div>
        <p className="mt-2 text-[0.9375rem] text-ink-muted">{category.subtitle}</p>

        <dl className="mt-7 space-y-0">
          {category.spec.map((s) => (
            <div
              key={s.label}
              className="flex items-baseline justify-between gap-4 border-t border-hairline py-2.5"
            >
              <dt className="label">{s.label}</dt>
              <dd className="text-[0.8125rem] text-ink-muted">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Link>
  );
}
