"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, BarChart2, Users, BookOpen, UserRound } from "lucide-react";

const links = [
  { href: "/",       label: "Home",     Icon: Home },
  { href: "/talk",   label: "Talk",     Icon: MessageCircle },
  { href: "/insights", label: "Insights", Icon: BarChart2 },
  { href: "/forum",  label: "Circle",   Icon: Users },
  { href: "/read", label: "Read", Icon: BookOpen },
  { href: "/profile", label: "Profile", Icon: UserRound },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="ip-nav" aria-label="Main navigation">
      <Link href="/" className="ip-brand">
        <span className="ip-brand-mark" aria-hidden="true" />
        <span>
          The Invisible Patient
        </span>
      </Link>
      <div className="ip-nav-links">
        {links.map(({ href, label, Icon }) => {
          const active =
            pathname === href ||
            (href === "/read" && pathname.startsWith("/read/"));
          return (
            <Link key={href} href={href}
              aria-label={label}
              className={`ip-nav-link ${active ? "ip-nav-link-active" : ""}`}>
              <Icon size={16} strokeWidth={1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
