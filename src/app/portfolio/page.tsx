import type { Metadata } from "next";
import { CategoryCard } from "@/components/CategoryCard";
import { PageHeader } from "@/components/PageHeader";
import { categories } from "@/content/portfolio";
import { group, photo } from "@/lib/media";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Kommercielt arbejde, events og kreative projekter fra mp444studios — foto og video fra Aarhus.",
  alternates: { canonical: "/portfolio" },
};

export default function PortfolioPage() {
  const total = categories.reduce((n, c) => n + group(c.group).length, 0);

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title={
          <>
            Tre slags
            <br />
            opgaver
          </>
        }
        lead="Det meste af arbejdet falder i tre kategorier. De deler håndværk, men ikke tempo — et bryllup og et produktshoot stiller helt forskellige krav."
        meta={[
          { label: "Billeder", value: String(total) },
          { label: "Kategorier", value: String(categories.length) },
        ]}
      />

      <section className="gutter mx-auto max-w-[1600px] pb-[clamp(4rem,14vh,10rem)]">
        <div className="grid gap-x-10 gap-y-28 md:grid-cols-3">
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
    </>
  );
}
