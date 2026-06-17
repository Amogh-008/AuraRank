import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, Upload, BarChart3, Shield, Zap } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/candidates", label: "Candidates", icon: Users },
  { to: "/upload", label: "Upload", icon: Upload },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex w-full">
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="relative h-9 w-9 rounded-lg bg-gradient-to-br from-cyber to-neon flex items-center justify-center glow-cyber">
            <Shield className="h-5 w-5 text-background" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-sm font-bold tracking-tight">REDROB</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Ranker AI</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                  active
                    ? "bg-sidebar-accent text-cyber"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-cyber"
                  />
                )}
                <Icon className="h-4 w-4" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <div className="glass rounded-xl p-3 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3.5 w-3.5 text-cyber" />
              <span className="font-semibold">Engine online</span>
            </div>
            <p className="text-muted-foreground">100K candidate pool indexed</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 flex items-center justify-between px-4 border-b border-border glass-strong">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-cyber to-neon flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-background" />
            </div>
            <span className="font-bold text-sm">REDROB</span>
          </div>
          <nav className="flex gap-1">
            {nav.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className={`p-2 rounded-md ${active ? "text-cyber bg-accent" : "text-muted-foreground"}`}>
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
