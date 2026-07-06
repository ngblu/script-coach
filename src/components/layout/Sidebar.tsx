"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  Settings,
  Menu,
  X,
  ChevronRight,
  Brain,
  Target,
  Layers,
  Upload,
  Phone,
  Swords,
  LayoutGrid,
  BookOpen,
  TrendingUp,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  header: string | null;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    header: null,
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/leads", label: "Leads", icon: Target },
    ],
  },
  {
    header: "INTELLIGENCE",
    items: [
      { href: "/brains", label: "Brains", icon: Brain },
      { href: "/verticals", label: "Verticals", icon: Layers },
      { href: "/ingest", label: "Feed the Brains", icon: Upload },
      { href: "/interview", label: "Seed the Brain", icon: Plus },
    ],
  },
  {
    header: "EXECUTION",
    items: [
      { href: "/live", label: "Live Coach", icon: Phone },
      { href: "/practice", label: "Practice", icon: Swords },
      { href: "/playbooks", label: "Playbooks", icon: BookOpen },
      { href: "/coaching-cards", label: "Coaching Cards", icon: LayoutGrid },
    ],
  },
  {
    header: "ANALYSIS",
    items: [
      { href: "/analytics", label: "Analytics", icon: TrendingUp },
      { href: "/compliance", label: "Compliance", icon: Scale },
    ],
  },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    if (open) {
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }
  }, [open]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 flex items-center justify-center rounded-lg bg-surface border border-border text-text-secondary hover:text-primary transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={close}
          aria-label="Close navigation menu"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && close()}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Main navigation"
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 bg-surface border-r border-border flex flex-col w-56",
          "transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex flex-col px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0">
              <text x="0" y="22" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="26" fontStyle="italic" fill="#00A8E8" letterSpacing="-1">555</text>
            </svg>
            <span className="font-bold text-sm tracking-tight text-white leading-none">DIGITAL</span>
          </div>
          <p className="text-[9px] text-text-muted mt-1.5 leading-tight">
            WEBSITES THAT <span className="text-[#00A8E8] font-medium">GET YOU</span> MORE BUSINESS
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {navSections.map((section, si) => (
            <div key={si} className="space-y-1">
              {section.header && (
                <p className="px-3 pt-1 pb-0.5 text-[9px] font-bold text-text-muted tracking-widest">
                  {section.header}
                </p>
              )}
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {isActive && (
                      <ChevronRight className="w-3 h-3 ml-auto opacity-60" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="px-3 pb-4 space-y-1">
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover border border-transparent"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <p className="text-xs text-text-muted">
            555 Digital
          </p>
        </div>
      </aside>

      {/* Desktop spacer */}
      <div className="hidden lg:block w-56 shrink-0" />
    </>
  );
}
