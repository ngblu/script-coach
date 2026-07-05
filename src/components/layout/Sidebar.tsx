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
  Sparkles,
  Brain,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/interview", label: "Seed the Brain", icon: Brain },
  { href: "/", label: "New Script", icon: Plus },
  { href: "/leads", label: "Leads", icon: Target },
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
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-text-primary">
            Script Coach
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group",
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
