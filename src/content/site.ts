/** Global site facts. Everything user-facing on this site is Danish. */

export const site = {
  name: "mp444studios",
  /** Used for <title> suffixes and structured data. */
  legalName: "mp444studios",
  tagline: "Foto & videoproduktion",
  description:
    "mp444studios er fotograf og videograf Filip Raeburn fra Aarhus. Foto og video til små og mellemstore begivenheder, kommercielle opgaver og kreative projekter.",
  /** Override at build time with NEXT_PUBLIC_SITE_URL when the domain changes. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://mp444studios.com",
  locale: "da_DK",
  email: "filip.raeburn@gmail.com",
  /** Displayed as written; the tel: link is derived by stripping spaces. */
  phone: "+45 53 86 83 00",
  city: "Aarhus",
  country: "Danmark",
  socials: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/filip-raeburn-61211433b/" },
    { label: "E-mail", href: "mailto:filip.raeburn@gmail.com" },
  ],
} as const;

export const nav = [
  { label: "Portfolio", href: "/portfolio" },
  { label: "Udstyr", href: "/udstyr" },
  { label: "Om", href: "/om-os" },
] as const;

/** Kept out of `nav` because it is rendered as a button, not a menu item. */
export const contactLink = { label: "Kontakt", href: "/kontakt" } as const;

/** tel: hrefs must not contain spaces. */
export const telHref = `tel:${site.phone.replace(/\s+/g, "")}`;
