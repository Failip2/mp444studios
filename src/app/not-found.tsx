import Link from "next/link";
import { nav } from "@/content/site";

export default function NotFound() {
  return (
    <section className="gutter mx-auto flex min-h-[70svh] max-w-[1600px] flex-col justify-center py-40">
      <p className="label mb-8">404</p>
      <h1 className="display max-w-[14ch]">Den side findes ikke</h1>
      <p className="measure mt-10 text-[1.0625rem] leading-relaxed text-ink-muted">
        Linket er enten forældet eller skrevet forkert. Prøv en af siderne herunder.
      </p>
      <ul className="mt-14 max-w-2xl">
        {[{ label: "Forside", href: "/" }, ...nav].map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex items-baseline justify-between gap-6 border-t border-hairline py-6"
            >
              <span className="text-[clamp(1.25rem,3vw,2rem)] font-medium tracking-[-0.03em]">
                {item.label}
              </span>
              <span
                aria-hidden="true"
                className="label transition-transform duration-500 [transition-timing-function:var(--ease-material)] group-hover:translate-x-1.5"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
