import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Gallery } from "@/components/Gallery";
import { PageHeader } from "@/components/PageHeader";
import { categories, byslug } from "@/content/portfolio";
import { group, seededShuffle } from "@/lib/media";

/** Three known categories, so the routes are fully static. */
export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = byslug(slug);
  if (!category) return {};
  return {
    title: category.title,
    description: category.intro,
    alternates: { canonical: `/portfolio/${category.slug}` },
    openGraph: { title: category.title, description: category.intro },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = byslug(slug);
  if (!category) notFound();

  // Mixed rather than camera order, so portrait and landscape alternate and the
  // page does not open on a run of near-identical frames from one sequence.
  // Seeded by slug so the order is stable between server and client.
  const photos = seededShuffle(
    group(category.group),
    [...category.slug].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7),
  );

  const others = categories.filter((c) => c.slug !== category.slug);

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <Link href="/portfolio" className="link-underline hover:text-ink">
              Portfolio
            </Link>
            {" · "}
            {category.subtitle}
          </>
        }
        title={category.title}
        lead={category.intro}
        meta={[
          { label: "Billeder", value: String(photos.length) },
          ...category.spec.map((s) => ({ label: s.label, value: s.value })),
        ]}
      />

      <section className="gutter mx-auto max-w-[1600px] pb-[clamp(5rem,14vh,10rem)]">
        <Gallery photos={photos} categoryTitle={category.title} />
      </section>

      <nav className="gutter mx-auto max-w-[1600px]" aria-label="Andre kategorier">
        <div className="rule mb-12" data-reveal />
        <p className="label mb-8" data-reveal>
          Videre
        </p>
        <ul className="grid gap-6 sm:grid-cols-2">
          {others.map((o, i) => (
            <li key={o.slug} data-reveal style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}>
              <Link
                href={`/portfolio/${o.slug}`}
                className="group flex items-baseline justify-between gap-6 border-t border-hairline py-8"
              >
                <span className="title text-[clamp(1.5rem,3.5vw,2.5rem)]">{o.title}</span>
                <span className="label transition-transform duration-500 [transition-timing-function:var(--ease-material)] group-hover:translate-x-1.5">
                  {group(o.group).length} billeder →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
