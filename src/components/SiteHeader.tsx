"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { contactLink, nav, site } from "@/content/site";

/**
 * A header that gets out of the way.
 *
 * It floats over the page with no background until you scroll, then fades a
 * blurred sheet in behind itself. Scrolling down hides it entirely; the moment
 * you scroll up it comes back. On a site that is mostly full-bleed photography,
 * a permanent bar would be the only thing competing with the work.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // The sheet is portalled, which cannot happen during SSR.
  const [mounted, setMounted] = useState(false);
  const lastY = useRef(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    lastY.current = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY.current;
        setSolid(y > 24);
        // Ignore sub-pixel jitter and rubber-banding at the very top.
        if (Math.abs(delta) > 6 && y > 120) setHidden(delta > 0);
        if (y <= 120) setHidden(false);
        lastY.current = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile sheet on navigation, and lock the page behind it.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-40 transition-transform duration-500",
        "[transition-timing-function:var(--ease-material)]",
        hidden && !menuOpen ? "-translate-y-full" : "translate-y-0",
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-0 -z-10 transition-opacity duration-500",
          "bg-paper/80 backdrop-blur-xl",
          solid && !menuOpen ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
      <div className="gutter flex h-[72px] items-center justify-between">
        <Link
          href="/"
          className="text-[0.9375rem] font-medium tracking-[-0.02em] lowercase"
          aria-label={`${site.name} — forside`}
        >
          {site.name}
        </Link>

        <nav className="hidden items-center gap-9 md:flex" aria-label="Hovedmenu">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={[
                "link-underline text-[0.8125rem] tracking-[0.02em] transition-colors duration-300",
                isActive(item.href) ? "text-ink" : "text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={contactLink.href}
            aria-current={isActive(contactLink.href) ? "page" : undefined}
            className="rounded-full border border-hairline px-4 py-2 text-[0.8125rem] transition-colors duration-300 hover:border-ink hover:bg-ink hover:text-paper"
          >
            {contactLink.label}
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobilmenu"
          className="-mr-2 flex h-11 w-11 items-center justify-center md:hidden"
        >
          <span className="sr-only">{menuOpen ? "Luk menu" : "Åbn menu"}</span>
          <span className="relative block h-3 w-6" aria-hidden="true">
            <span
              className={[
                "absolute left-0 block h-px w-full bg-ink transition-all duration-400",
                "[transition-timing-function:var(--ease-material)]",
                menuOpen ? "top-1.5 rotate-45" : "top-0",
              ].join(" ")}
            />
            <span
              className={[
                "absolute left-0 block h-px w-full bg-ink transition-all duration-400",
                "[transition-timing-function:var(--ease-material)]",
                menuOpen ? "top-1.5 -rotate-45" : "top-3",
              ].join(" ")}
            />
          </span>
        </button>
      </div>

      {/* The sheet lives on <body>, not inside this header. The header carries a
          transform for its show/hide animation, and a transformed ancestor
          becomes the containing block for position:fixed — which would pin a
          full-screen sheet inside a 72px bar. */}
      {mounted &&
        createPortal(
          <div
            id="mobilmenu"
            hidden={!menuOpen}
            className="gutter fixed inset-0 z-30 flex flex-col justify-center gap-2 bg-paper md:hidden"
          >
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="title py-3">
                {item.label}
              </Link>
            ))}
            <Link href={contactLink.href} className="title py-3">
              {contactLink.label}
            </Link>
          </div>,
          document.body,
        )}
    </header>
  );
}
