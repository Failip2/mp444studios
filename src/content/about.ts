/**
 * "Om" — the studio story, the person behind it, and the CV.
 *
 * Written in first person singular. mp444studios is one photographer, so the
 * old plural voice ("vi er to...") would now be inaccurate rather than just a
 * stylistic choice.
 */

export const about = {
  lead: "Fotograf og videograf i Aarhus. Her kan du læse om mp444studios, om historien bag, og se mit CV.",

  story: {
    title: "Historien bag",
    paragraphs: [
      "mp444studios startede som en gymnasieinteresse og blev til noget mere. I dag studerer og arbejder jeg i Aarhus, og laver foto og video for dem der har brug for at få en historie fortalt ordentligt.",
      "Jeg har arbejdet med foto og video siden jeg var barn, og har gjort det professionelt siden 2023. Jeg står selv for det hele — planlægning, optagelse og redigering — hvilket betyder at det I aftaler med mig, er det I får.",
      "Jeg arbejder med lys, farve og fortælling for at lave film og billeder med dybde. mp444studios passer især til jer der skal bruge en fotograf eller videograf til små og mellemstore begivenheder.",
    ],
  },

  team: [
    {
      name: "Filip Raeburn",
      role: "Fotograf & videograf",
      /** Slug in the `team` media group. */
      photo: "filip",
      bio: "Arbejder med lys, farver og fortælling for at skabe film og billeder med dybde. Står for planlægning, optagelse og redigering.",
      cv: { href: "/docs/filip-cv.pdf", label: "CV — Videoproduktion" },
      links: [{ label: "LinkedIn", href: "https://www.linkedin.com/in/filip-raeburn-61211433b/" }],
    },
  ],

  /** Shown as a small stat row under the story. */
  facts: [
    { label: "Base", value: "Aarhus" },
    { label: "Professionelt siden", value: "2023" },
    { label: "Disciplin", value: "Foto & video" },
  ],
} as const;
