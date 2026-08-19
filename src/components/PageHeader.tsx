import type { CSSProperties, ReactNode } from "react";

/**
 * Shared page opener: a lot of empty space, a small label, one large line, and
 * an optional spec row. Every inner page starts the same way, so the site reads
 * as one object rather than five.
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  meta,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  lead?: string;
  meta?: { label: string; value: string }[];
}) {
  return (
    <header className="gutter mx-auto max-w-[1600px] pb-[clamp(3rem,9vh,7rem)] pt-[clamp(9rem,22vh,16rem)]">
      <p className="label mb-10" data-reveal>
        {eyebrow}
      </p>
      <h1
        className="display max-w-[16ch]"
        data-reveal
        style={{ "--reveal-delay": "70ms" } as CSSProperties}
      >
        {title}
      </h1>

      {(lead || meta) && (
        <div className="mt-16 grid gap-x-10 gap-y-12 md:grid-cols-12">
          {meta && (
            <dl
              className="flex gap-12 md:col-span-4 md:flex-col md:gap-7"
              data-reveal
              style={{ "--reveal-delay": "240ms" } as CSSProperties}
            >
              {meta.map((m) => (
                <div key={m.label}>
                  <dt className="label mb-2">{m.label}</dt>
                  <dd className="text-[1.25rem] font-medium tracking-[-0.03em] tabular-nums">
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {lead && (
            <p
              className="measure text-[clamp(1rem,1.7vw,1.1875rem)] leading-relaxed text-ink-muted md:col-span-7 md:col-start-6"
              data-reveal
              style={{ "--reveal-delay": "160ms" } as CSSProperties}
            >
              {lead}
            </p>
          )}
        </div>
      )}
    </header>
  );
}
