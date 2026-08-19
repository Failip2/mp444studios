/**
 * The three bodies of work. `group` and `coverSlug` point into the generated
 * media manifest, so adding photos is purely a matter of dropping files into
 * source/photos/<group> and re-running `npm run media`.
 */

export type Category = {
  slug: string;
  /** Group key inside the media manifest. */
  group: string;
  title: string;
  subtitle: string;
  /** Two or three sentences, shown above the gallery. */
  intro: string;
  coverSlug: string;
  /** Small caps label pairs rendered as a spec block, product-page style. */
  spec: { label: string; value: string }[];
};

export const categories: Category[] = [
  {
    slug: "kommercielt",
    group: "commercial",
    title: "Kommercielt",
    subtitle: "Historier & øjeblikke",
    intro:
      "Produkt, portræt og brand. Opgaver hvor billedet skal bære en identitet videre — planlagt lys, kontrolleret komposition og en gennemgående tone fra første frame til sidste.",
    coverSlug: "commercial-cover",
    spec: [
      { label: "Format", value: "Foto & video" },
      { label: "Levering", value: "Redigeret, farvesat" },
      { label: "Typisk omfang", value: "Halv til hel dag" },
    ],
  },
  {
    slug: "events",
    group: "events",
    title: "Events",
    subtitle: "Sammenkomster & fortællinger",
    intro:
      "Bryllupper, koncerter, receptioner. Jeg arbejder diskret og hurtigt, og leverer et sæt billeder der husker dagen som den føltes — ikke bare som den så ud.",
    coverSlug: "events-cover",
    spec: [
      { label: "Format", value: "Reportage" },
      { label: "Levering", value: "Fuldt sæt + udvalg" },
      { label: "Typisk omfang", value: "4 til 12 timer" },
    ],
  },
  {
    slug: "kreativt",
    group: "creative",
    title: "Kreativt",
    subtitle: "Personlige projekter & kunstnerisk arbejde",
    intro:
      "Frit arbejde. Her afprøver jeg lys, farve og fortælling uden brief — og det er som regel herfra idéerne til de betalte opgaver kommer.",
    coverSlug: "creative-cover",
    spec: [
      { label: "Format", value: "Frit arbejde" },
      { label: "Levering", value: "Løbende" },
      { label: "Typisk omfang", value: "Uden brief" },
    ],
  },
];

export const byslug = (slug: string) => categories.find((c) => c.slug === slug);
