"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  BookOpen,
  CalendarCheck2,
  Home,
  MessageCircle,
  UserRound,
  Users,
} from "lucide-react";

const links = [
  { href: "/",       label: "Home",     Icon: Home },
  { href: "/talk",   label: "Talk",     Icon: MessageCircle },
  { href: "/insights", label: "Insights", Icon: BarChart2 },
  { href: "/forum",  label: "Circle",   Icon: Users },
  { href: "/tasks", label: "Tasks", Icon: CalendarCheck2 },
  { href: "/read", label: "Read", Icon: BookOpen },
  { href: "/profile", label: "Profile", Icon: UserRound },
];

export default function Navbar() {
  const pathname = usePathname();
  const navigationTargetRef = useRef<string | null>(null);

  useEffect(() => {
    navigationTargetRef.current = null;
  }, [pathname]);

  function scrollCurrentPage() {
    const routeScroller = document.querySelector<HTMLElement>(
      "[data-route-scroll]"
    );
    if (routeScroller) {
      routeScroller.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
          const exactActive = pathname === href;
          const active =
            exactActive ||
            (href === "/read" && pathname.startsWith("/read/"));

          if (exactActive) {
            return (
              <button
                key={href}
                type="button"
                aria-label={label}
                aria-current="page"
                onClick={scrollCurrentPage}
                className="ip-nav-link ip-nav-link-active"
              >
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
              </button>
            );
          }

          return (
            <Link key={href} href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                if (navigationTargetRef.current) {
                  event.preventDefault();
                } else {
                  navigationTargetRef.current = href;
                }
              }}
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
