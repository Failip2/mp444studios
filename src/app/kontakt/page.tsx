import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ContactForm } from "@/components/ContactForm";
import { Photo } from "@/components/Photo";
import { Floating } from "@/components/Floating";
import { site, telHref } from "@/content/site";
import { photo } from "@/lib/media";

export const metadata: Metadata = {
  title: "Kontakt",
  description: `Kontakt mp444studios — ${site.email}, ${site.phone}. Foto og video i ${site.city}.`,
  alternates: { canonical: "/kontakt" },
};

/**
 * The direct routes first, the form second.
 *
 * Someone who already knows what they want should not have to fill in a form to
 * get an address, and a phone number is worth more than a textarea to anyone
 * deciding whether a real person is on the other end.
 */
const direct = [
  { label: "E-mail", value: site.email, href: `mailto:${site.email}` },
  { label: "Telefon", value: site.phone, href: telHref },
  { label: "Sted", value: `${site.city}, ${site.country}`, href: null },
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Kontakt"
        title={
          <>
            Lad os tale
            <br />
            om opgaven
          </>
        }
        lead="Skriv eller ring. Fortæl kort hvad det drejer sig om, hvornår det ligger, og hvor — så vender jeg tilbage med et bud."
      />

      <section className="gutter mx-auto max-w-[1600px] pb-[clamp(5rem,14vh,10rem)]">
        <div className="rule mb-16" data-reveal />

        <div className="grid gap-x-10 gap-y-20 md:grid-cols-12">
          {/* Left rail: the direct routes and a portrait. */}
          <div className="md:col-span-4">
            <dl>
              {direct.map((row, i) => (
                <div
                  key={row.label}
                  className="border-t border-hairline py-5"
                  data-reveal
                  style={{ "--reveal-delay": `${i * 70}ms` } as CSSProperties}
                >
                  <dt className="label mb-2">{row.label}</dt>
                  <dd className="text-[clamp(1rem,1.5vw,1.125rem)]">
                    {row.href ? (
                      <a href={row.href} className="link-underline hover:text-ink">
                        {row.value}
                      </a>
                    ) : (
                      <span className="text-ink-muted">{row.value}</span>
                    )}
                  </dd>
                </div>
              ))}
              <div
                className="border-t border-hairline py-5"
                data-reveal
                style={{ "--reveal-delay": "210ms" } as CSSProperties}
              >
                <dt className="label mb-2">Andet sted</dt>
                <dd className="flex flex-wrap gap-x-6 gap-y-2">
                  {site.socials.map((s) => (
                    <a
                      key={s.href}
                      href={s.href}
                      target={s.href.startsWith("http") ? "_blank" : undefined}
                      rel={s.href.startsWith("http") ? "noreferrer noopener" : undefined}
                      className="link-underline text-[0.9375rem] text-ink-muted hover:text-ink"
                    >
                      {s.label}
                    </a>
                  ))}
                </dd>
              </div>
            </dl>

            <div
              className="mt-14 max-w-[320px]"
              data-reveal
              style={{ "--reveal-delay": "280ms" } as CSSProperties}
            >
              <Floating
                mass={2.2}
                push={0.6}
                stiffness={180}
                damping={18}
                sag={5}
                tilt={0.00015}
                draggable
                className="overflow-hidden rounded-[3px] bg-paper-raised"
              >
                <Photo
                  photo={photo("team", "filip")}
                  alt="Portræt af Filip Raeburn"
                  sizes="(min-width: 768px) 26vw, 80vw"
                  ratio={0.86}
                />
              </Floating>
            </div>
          </div>

          {/* Right: the form. */}
          <div
            className="md:col-span-7 md:col-start-6"
            data-reveal
            style={{ "--reveal-delay": "120ms" } as CSSProperties}
          >
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
