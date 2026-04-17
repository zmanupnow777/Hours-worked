"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/sessions", label: "Sessions" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
  { href: "/settings", label: "Settings" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <div className="nav__brand">
        <p className="eyebrow">Hours Worked</p>
        <h1>Remote billing OS</h1>
        <p className="muted">Separate timers, cleaner invoices, no spreadsheet drag.</p>
      </div>
      <div className="nav__links">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link key={link.href} href={link.href} className={active ? "nav__link nav__link--active" : "nav__link"}>
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
