import Link from "next/link";
import { contactLink, nav, site, telHref } from "@/content/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-[clamp(8rem,22vh,18rem)] border-t border-hairline">
      <div className="gutter py-[clamp(3rem,8vh,6rem)]">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="max-w-md">
            <p className="display text-[clamp(2rem,6vw,4rem)] leading-[0.9]">
              Lad os lave
              <br />
              noget sammen.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={`mailto:${site.email}`}
                className="link-underline self-start text-[0.9375rem] text-ink-muted hover:text-ink"
              >
                {site.email}
              </a>
              <a
                href={telHref}
                className="link-underline self-start text-[0.9375rem] text-ink-muted hover:text-ink"
              >
                {site.phone}
              </a>
            </div>
          </div>

          <div className="flex gap-16 sm:gap-24">
            <nav aria-label="Sidefod">
              <p className="label mb-4">Sider</p>
              <ul className="space-y-2.5">
                {[...nav, contactLink].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="link-underline text-[0.875rem] text-ink-muted hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="label mb-4">Andet sted</p>
              <ul className="space-y-2.5">
                {site.socials.map((s) => (
                  <li key={s.href}>
                    <a
                      href={s.href}
                      target={s.href.startsWith("http") ? "_blank" : undefined}
                      rel={s.href.startsWith("http") ? "noreferrer noopener" : undefined}
                      className="link-underline text-[0.875rem] text-ink-muted hover:text-ink"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="label">
            © {year} {site.name}
          </p>
          <p className="label">
            {site.city}, {site.country}
          </p>
        </div>
      </div>
    </footer>
  );
}
