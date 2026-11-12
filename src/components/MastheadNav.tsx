"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Games" },
  { href: "/write", label: "Post yours" },
  { href: "/patron", label: "Patron desk" },
  { href: "/ledger", label: "Ledger" },
];

export function MastheadNav() {
  const pathname = usePathname();
  const isCurrent = (href: string) => (href === "/" ? pathname === "/" || pathname.startsWith("/p/") : pathname.startsWith(href));

  return (
    <nav className="masthead__nav" aria-label="Sections">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} aria-current={isCurrent(link.href) ? "page" : undefined}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
