import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
    Users,
    Trophy,
    Target,
    ShieldAlert,
    Sparkles,
    ArrowUpRight,
  } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { loadRankedResponse } from "@/lib/candidate-store";
import type { RankedCandidate } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Dashboard — Redrob Ranker",
      },
      {
        name: "description",
        content:
          "AI-powered candidate ranking dashboard for elite hiring teams.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [results, setResults] = useState<RankedCandidate[]>([]);
  const [count, setCount] = useState(0);
  const [honeypots, setHoneypots] = useState(0);

  useEffect(() => {
    const r = loadRankedResponse();

    setResults(r?.results ?? []);
    setCount(r?.count ?? 0);
    setHoneypots((r as any)?.honeypots ?? 0);
  }, []);

const stats = useMemo(
  () => ({
    total: count || results.length,
    ranked: results.length,

    topScore: results[0]
      ? Math.round(results[0].final_score * 100)
      : 0,

    honeypots: honeypots,
  }),
  [results, count, honeypots]
);

  const top5 = results.slice(0, 5);

  return (
    <AppShell>
      <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl glass-strong p-8 md:p-10 grid-bg"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyber/10 via-transparent to-neon/10 pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs font-medium mb-4">
                <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <span className="text-muted-foreground">
                  Engine status ·
                </span>
                <span className="text-foreground">
                  {results.length > 0
                    ? "Results ready"
                    : "Awaiting upload"}
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                Top talent,{" "}
                <span className="text-gradient-cyber">
                  ranked.
                </span>
              </h1>

              <p className="mt-2 text-muted-foreground max-w-xl">
                {results.length > 0
                  ? `${results.length} candidates scored across 5 dimensions. Honeypots filtered. Decisions, accelerated.`
                  : "Upload a candidate pool to run the AI ranking engine."}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                asChild
                variant="secondary"
                className="glass border-border"
              >
                <Link to="/upload">
                  New pipeline
                </Link>
              </Button>

              <Button
                asChild
                className="bg-gradient-to-r from-cyber to-neon text-background hover:opacity-90 glow-cyber font-semibold"
              >
                <Link to="/candidates">
                  View shortlist
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>

          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Candidates"
            value={stats.total.toLocaleString()}
            sublabel="In pool"
            icon={<Users className="h-5 w-5" />}
            delay={0.05}
          />

          <StatCard
            label="Ranked"
            value={stats.ranked}
            sublabel="After filtering"
            icon={<Trophy className="h-5 w-5" />}
            accent="neon"
            delay={0.1}
          />

          <StatCard
            label="Top Match"
            value={`${stats.topScore}%`}
            sublabel="Highest final score"
            icon={<Target className="h-5 w-5" />}
            accent="success"
            delay={0.15}
          />

          <StatCard
            label="Honeypots"
            value={stats.honeypots}
            sublabel="Detected"
            icon={<ShieldAlert className="h-5 w-5" />}
            accent="danger"
            delay={0.2}
          />
        </div>

        {/* Top picks preview */}
        <section>
          <div className="flex items-center justify-between mb-4">

            <div>
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyber" />
                Top 5 Matches
              </h2>

              <p className="text-sm text-muted-foreground">
                Highest-scoring candidates from the latest run.
              </p>
            </div>

            {results.length > 0 && (
              <Link
                to="/candidates"
                className="text-sm text-cyber hover:underline"
              >
                View all →
              </Link>
            )}
          </div>

          {top5.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
              No ranked candidates yet.
              {" "}
              <Link
                to="/upload"
                className="text-cyber hover:underline"
              >
                Upload a pool
              </Link>
              {" "}
              to get started.
            </div>
          ) : (
            <div className="grid gap-3">
              {top5.map((c, i) => {
                const p = c.candidate_data.profile;

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="glass rounded-xl p-4 flex items-center gap-4 hover:border-cyber/30 transition-all"
                  >
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                        i === 0
                          ? "bg-gradient-to-br from-cyber to-neon text-background"
                          : "glass"
                      }`}
                    >
                      #{c.rank}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">
                        {p.anonymized_name}
                      </div>

                      <div className="text-xs text-muted-foreground truncate">
                        {p.current_title} · {p.years_of_experience}y
                      </div>
                    </div>

                    <div className="font-mono font-bold text-cyber tabular-nums">
  {Math.round(c.final_score * 100)}%
</div>

                      <div className="text-[10px] text-muted-foreground uppercase">
                        Final
                      </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </AppShell>
  );
}