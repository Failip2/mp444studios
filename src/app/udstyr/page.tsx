import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Photo } from "@/components/Photo";
import { Floating } from "@/components/Floating";
import { PageHeader } from "@/components/PageHeader";
import { gear, gearCount } from "@/content/equipment";
import { photo } from "@/lib/media";

export const metadata: Metadata = {
  title: "Udstyr",
  description:
    "Det fulde udstyr mp444studios arbejder med — kameraer, optik, video rig, lys, stativer og lyd.",
  alternates: { canonical: "/udstyr" },
};

export default function EquipmentPage() {
  return (
    <>
      <PageHeader
        eyebrow="Udstyr"
        title={
          <>
            Værktøjet
            <br />
            bag billedet
          </>
        }
        lead="Alt hvad jeg arbejder med, samlet ét sted. Hver linje er en rigtig ting der kommer med ud — ikke en ønskeliste."
        meta={[
          { label: "Stykker udstyr", value: String(gearCount) },
          { label: "Kategorier", value: String(gear.length) },
        ]}
      />

      <div className="gutter mx-auto max-w-[1600px] pb-[clamp(4rem,14vh,10rem)]">
        {gear.map((section, si) => (
          <section
            key={section.id}
            id={section.id}
            className="border-t border-hairline pb-[clamp(4rem,10vh,8rem)] pt-[clamp(3rem,7vh,5rem)]"
          >
            <div className="grid gap-x-10 gap-y-12 md:grid-cols-12">
              {/* Left rail: number, name, blurb, and the section's hero object. */}
              <div className="md:col-span-5">
                <div className="flex items-baseline gap-5">
                  <span className="label tabular-nums">
                    {String(si + 1).padStart(2, "0")}
                  </span>
                  <h2
                    className="text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-[-0.035em]"
                    data-reveal
                  >
                    {section.title}
                  </h2>
                </div>

                {section.blurb && (
                  <p
                    className="measure mt-5 text-[0.9375rem] leading-relaxed text-ink-muted"
                    data-reveal
                    style={{ "--reveal-delay": "80ms" } as CSSProperties}
                  >
                    {section.blurb}
                  </p>
                )}

                {section.heroSlug && (
                  <div
                    className="mt-10 md:sticky md:top-28"
                    data-reveal
                    style={{ "--reveal-delay": "140ms" } as CSSProperties}
                  >
                    <Floating
                      mass={2.2}
                      push={0.5}
                      stiffness={175}
                      damping={18}
                      sag={5}
                      tilt={0.00014}
                      className="overflow-hidden rounded-[3px] bg-paper-raised"
                    >
                      <Photo
                        photo={photo("equipment", section.heroSlug)}
                        alt={section.title}
                        sizes="(min-width: 768px) 38vw, 92vw"
                      />
                    </Floating>
                  </div>
                )}
              </div>

              {/* Right: the spec list itself. */}
              <div className="md:col-span-6 md:col-start-7">
                {section.groups.map((g, gi) => (
                  <div key={gi} className={gi > 0 ? "mt-14" : ""}>
                    {g.heading && <p className="label mb-6">{g.heading}</p>}
                    <ul>
                      {g.items.map((item, ii) => {
                        const Row = (
                          <>
                            <span className="label w-[7.5rem] shrink-0 pt-1 text-ink-faint">
                              {item.brand}
                            </span>
                            <span className="flex-1">
                              <span className="text-[0.9375rem] leading-snug">{item.model}</span>
                              {item.note && (
                                <span className="mt-1 block text-[0.8125rem] text-ink-faint">
                                  {item.note}
                                </span>
                              )}
                            </span>
                            {item.href && (
                              <span
                                aria-hidden="true"
                                className="shrink-0 pt-1 text-ink-faint opacity-0 transition-all duration-500 [transition-timing-function:var(--ease-material)] group-hover:translate-x-1 group-hover:opacity-100"
                              >
                                ↗
                              </span>
                            )}
                          </>
                        );

                        return (
                          <li
                            key={`${item.brand}-${item.model}`}
                            data-reveal
                            style={{ "--reveal-delay": `${Math.min(ii, 8) * 45}ms` } as CSSProperties}
                          >
                            {item.href ? (
                              <a
                                href={item.href}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="group flex gap-5 border-b border-hairline py-4 transition-colors duration-300 hover:bg-paper-raised"
                              >
                                {Row}
                              </a>
                            ) : (
                              <div className="flex gap-5 border-b border-hairline py-4">{Row}</div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
