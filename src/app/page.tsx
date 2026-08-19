import Link from "next/link";
import { HeroStage } from "@/components/HeroStage";
import { CategoryCard } from "@/components/CategoryCard";
import { FilmShowcase } from "@/components/FilmShowcase";
import { PhotoStrip } from "@/components/PhotoStrip";
import { Photo } from "@/components/Photo";
import { Floating } from "@/components/Floating";
import { categories } from "@/content/portfolio";
import { gearCount } from "@/content/equipment";
import { about } from "@/content/about";
import { film, stripPhotos } from "@/content/home";
import { group, photo, portfolioCount, seededShuffle } from "@/lib/media";
import { contactLink, site } from "@/content/site";

export default function HomePage() {
  const total = portfolioCount(categories.map((c) => c.group));

  // Cycled on the camera's rear screen in the 3D hero, so the gear and the
  // work are literally the same object rather than two things sharing a page.
  // The WebP rendition is used rather than the AVIF one because a WebGL texture
  // upload goes through an <img> decode, where WebP is the safer bet.
  const screenSrcs = seededShuffle(
    [...group("commercial"), ...group("events"), ...group("creative")],
    77123,
  )
    .slice(0, 5)
    .map((p) => p.webp[0]?.src ?? p.avif[0]!.src);

  // The selected-work row, named explicitly in content rather than sampled, so
  // the front page shows the frames that were actually chosen for it.
  const strip = stripPhotos.map((s) => photo(s.group, s.slug));

  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden">
        <HeroStage screenSrcs={screenSrcs} />

        {/* Pointer-transparent so the objects behind stay grabbable across the
            full width; the controls opt back in individually. */}
        <div className="gutter pointer-events-none relative z-10 mx-auto w-full max-w-[1600px] pb-[38vh] pt-40 text-center lg:pb-40">
          <p className="label mb-8" data-reveal>
            {site.city} · {site.country}
          </p>
          {/* Sized to sit inside the clear centre column between the rails, so
              the type never has to compete with a photograph. */}
          <h1
            className="mx-auto max-w-[min(11ch,44vw)] text-[clamp(2.5rem,7vw,7rem)] font-medium leading-[0.88] tracking-[-0.045em]"
            data-reveal
            style={{ "--reveal-delay": "80ms" } as React.CSSProperties}
          >
            Billeder med
            <br />
            vægt
          </h1>
          <p
            className="mx-auto mt-10 max-w-[46ch] text-balance text-[clamp(0.9375rem,1.6vw,1.125rem)] leading-relaxed text-ink-muted"
            data-reveal
            style={{ "--reveal-delay": "200ms" } as React.CSSProperties}
          >
            {site.name} er fotograf og videograf Filip Raeburn fra {site.city}. Foto og video
            til begivenheder, brands og alt derimellem.
          </p>
          <div
            className="mt-12 flex flex-wrap items-center justify-center gap-4"
            data-reveal
            style={{ "--reveal-delay": "300ms" } as React.CSSProperties}
          >
            <Link
              href="/portfolio"
              className="pointer-events-auto rounded-full bg-ink px-7 py-3.5 text-[0.875rem] text-paper transition-transform duration-500 [transition-timing-function:var(--ease-weight)] hover:scale-[1.03]"
            >
              Se arbejdet
            </Link>
            <Link
              href={contactLink.href}
              className="pointer-events-auto rounded-full border border-hairline px-7 py-3.5 text-[0.875rem] transition-colors duration-300 hover:border-ink"
            >
              Skriv til mig
            </Link>
          </div>
        </div>

        <p className="label pointer-events-none absolute bottom-8 left-1/2 hidden -translate-x-1/2 lg:block">
          Træk i tingene
        </p>
      </section>

      {/* ----------------------------------------------------- statement */}
      <section className="gutter mx-auto max-w-[1600px] py-[clamp(6rem,18vh,14rem)]">
        <div className="rule mb-16" data-reveal />
        <div className="grid gap-16 md:grid-cols-12">
          <p className="label md:col-span-3" data-reveal>
            Hvad jeg laver
          </p>
          <div className="md:col-span-9">
            <p
              className="text-[clamp(1.5rem,3.4vw,2.75rem)] font-medium leading-[1.15] tracking-[-0.03em]"
              data-reveal
            >
              Jeg arbejder med lys, farve og fortælling — og leverer indhold der fanger
              stemning, detalje og det øjeblik der faktisk skete.
            </p>
            <dl className="mt-16 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
              {[
                { k: "Billeder online", v: String(total) },
                { k: "Stykker udstyr", v: String(gearCount) },
                { k: "Professionelt siden", v: "2023" },
                { k: "Base", v: site.city },
              ].map((stat, i) => (
                <div
                  key={stat.k}
                  data-reveal
                  style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties}
                >
                  <dt className="label mb-3">{stat.k}</dt>
                  <dd className="text-[clamp(1.75rem,3.5vw,2.75rem)] font-medium tracking-[-0.04em] tabular-nums">
                    {stat.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- categories */}
      <section className="gutter mx-auto max-w-[1600px] pb-[clamp(6rem,16vh,12rem)]">
        <div className="rule mb-16" data-reveal />
        <div className="mb-20 grid gap-8 md:grid-cols-12">
          <p className="label md:col-span-3" data-reveal>
            Portfolio
          </p>
          <h2 className="title md:col-span-9" data-reveal>
            Tre slags opgaver
          </h2>
        </div>

        <div className="grid gap-x-10 gap-y-24 md:grid-cols-3">
          {categories.map((c, i) => (
            <CategoryCard
              key={c.slug}
              category={c}
              cover={photo("covers", c.coverSlug)}
              count={group(c.group).length}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- film */}
      <section className="gutter mx-auto max-w-[1600px] pb-[clamp(6rem,16vh,12rem)]">
        <div className="rule mb-16" data-reveal />
        <div className="mb-16 grid gap-8 md:grid-cols-12">
          <p className="label md:col-span-3" data-reveal>
            {film.eyebrow}
          </p>
          <h2 className="title md:col-span-9" data-reveal>
            {film.lead}
          </h2>
        </div>

        <div data-reveal>
          <FilmShowcase
            poster={photo("events", film.posterSlug)}
            src={film.src}
            title={film.title}
            meta={[...film.meta]}
          />
        </div>
      </section>

      {/* --------------------------------------------------------- strip */}
      <section className="pb-[clamp(6rem,16vh,12rem)]">
        <div className="gutter mx-auto max-w-[1600px]">
          <div className="rule mb-16" data-reveal />
          <div className="mb-12 flex flex-wrap items-baseline justify-between gap-4">
            <p className="label" data-reveal>
              Et udsnit
            </p>
            <Link
              href="/portfolio"
              className="link-underline text-[0.9375rem] text-ink-muted hover:text-ink"
              data-reveal
            >
              Se hele portfolioen
            </Link>
          </div>
        </div>

        <div data-reveal>
          <PhotoStrip photos={strip} />
        </div>
      </section>

      {/* ------------------------------------------------------------ om */}
      <section className="gutter mx-auto max-w-[1600px] pb-[clamp(4rem,12vh,8rem)]">
        <div className="rule mb-16" data-reveal />
        {/*
          The About page used to be reachable only from the nav, which on a site
          this visual meant it was never reached. Giving the person behind the
          work a real presence on the front page is both a better route in and a
          better introduction than a menu item.
        */}
        <Link href="/om-os" className="group grid gap-x-10 gap-y-10 md:grid-cols-12">
          <div className="md:col-span-4" data-reveal>
            <Floating
              mass={2.4}
              push={0.6}
              stiffness={180}
              damping={18}
              sag={5}
              tilt={0.00015}
              className="overflow-hidden rounded-[3px] bg-paper-raised"
            >
              <Photo
                photo={photo("team", about.team[0].photo)}
                alt={`Portræt af ${about.team[0].name}`}
                sizes="(min-width: 768px) 30vw, 88vw"
                ratio={0.86}
                imgClassName="transition-transform duration-[1.4s] [transition-timing-function:var(--ease-material)] group-hover:scale-[1.04]"
              />
            </Floating>
          </div>

          <div
            className="md:col-span-7 md:col-start-6"
            data-reveal
            style={{ "--reveal-delay": "120ms" } as React.CSSProperties}
          >
            <p className="label mb-8">Om</p>
            <p className="title">
              {about.team[0].name}
              <span className="block text-ink-faint">{about.team[0].role}</span>
            </p>
            <p className="measure mt-8 text-[clamp(1rem,1.7vw,1.1875rem)] leading-relaxed text-ink-muted">
              {about.team[0].bio}
            </p>
            <span className="mt-10 inline-flex items-center gap-3 rounded-full border border-hairline px-6 py-3 text-[0.875rem] transition-colors duration-300 group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
              Læs mere om mp444studios
              <span
                aria-hidden="true"
                className="transition-transform duration-500 [transition-timing-function:var(--ease-material)] group-hover:translate-x-1"
              >
                →
              </span>
            </span>
          </div>
        </Link>
      </section>
    </>
  );
}
