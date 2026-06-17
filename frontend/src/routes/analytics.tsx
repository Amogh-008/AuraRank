import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { loadRankedResponse } from "@/lib/candidate-store";
import type { RankedCandidate } from "@/lib/types";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Redrob Ranker" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [results, setResults] = useState<RankedCandidate[]>([]);

  useEffect(() => {
    setResults(loadRankedResponse()?.results ?? []);
  }, []);

  const distribution = useMemo(() => {
    return [50, 60, 70, 80, 90].map(min => ({
      bucket: `${min}-${min + 9}`,
      count: results.filter(c => c.final_score >= min && c.final_score < min + 10).length,
    }));
  }, [results]);

  const skillHeat = useMemo(() => {
    const counts: Record<string, number> = {};
    results.forEach(c => (c.candidate_data.profile.skills ?? []).forEach(s => {
      counts[s] = (counts[s] || 0) + 1;
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, [results]);

  const top3 = results.slice(0, 3);
  const radarData = (
    [
      ["skills_score", "Skills"],
      ["career_score", "Career"],
      ["role_fit_score", "Role Fit"],
      ["behavioral_score", "Behavioral"],
      ["location_score", "Location"],
    ] as const
  ).map(([k, label]) => {
    const row: Record<string, number | string> = { dim: label };
    top3.forEach((c, i) => { row[`c${i}`] = (c as any)[k] ?? 0; });
    return row;
  });

  const max = Math.max(1, ...skillHeat.map(([, c]) => c));

  if (results.length === 0) {
    return (
      <AppShell>
        <div className="p-6 md:p-10 max-w-3xl mx-auto">
          <h1 className="font-display text-3xl font-bold">Analytics</h1>
          <div className="glass rounded-2xl p-12 text-center mt-6">
            <h2 className="font-display text-lg font-semibold">No data yet</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-5">
              Run the ranking engine to populate analytics.
            </p>
            <Button asChild className="bg-gradient-to-r from-cyber to-neon text-background font-semibold">
              <Link to="/upload">Upload candidates</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Signals across {results.length} ranked candidates.</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6">
          <h2 className="font-display font-semibold mb-1">Final Score Distribution</h2>
          <p className="text-xs text-muted-foreground mb-4">Histogram of final scores across all ranked candidates.</p>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={distribution}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.18 175)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.78 0.18 175)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis dataKey="bucket" stroke="oklch(0.65 0.03 255)" fontSize={11} />
                <YAxis stroke="oklch(0.65 0.03 255)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.025 262)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="count" stroke="oklch(0.78 0.18 175)" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6">
            <h2 className="font-display font-semibold mb-1">Skills Heatmap</h2>
            <p className="text-xs text-muted-foreground mb-4">Frequency of skills across the shortlist.</p>
            {skillHeat.length === 0 ? (
              <div className="text-sm text-muted-foreground">No skills data available.</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {skillHeat.map(([skill, count]) => {
                  const intensity = count / max;
                  return (
                    <div
                      key={skill}
                      className="rounded-lg p-3 border text-center"
                      style={{
                        background: `oklch(0.78 0.18 175 / ${0.05 + intensity * 0.35})`,
                        borderColor: `oklch(0.78 0.18 175 / ${0.15 + intensity * 0.4})`,
                      }}
                    >
                      <div className="text-xs font-medium truncate">{skill}</div>
                      <div className="font-mono text-cyber text-sm font-bold mt-0.5">{count}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6">
            <h2 className="font-display font-semibold mb-1">Top 3 Comparison</h2>
            <p className="text-xs text-muted-foreground mb-4">Dimension-by-dimension breakdown.</p>
            <div className="h-64">
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="oklch(1 0 0 / 0.08)" />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: "oklch(0.65 0.03 255)", fontSize: 10 }} />
                  <PolarRadiusAxis stroke="oklch(1 0 0 / 0.1)" tick={false} />
                  <Radar dataKey="c0" stroke="oklch(0.78 0.18 175)" fill="oklch(0.78 0.18 175)" fillOpacity={0.3} />
                  <Radar dataKey="c1" stroke="oklch(0.7 0.22 290)" fill="oklch(0.7 0.22 290)" fillOpacity={0.2} />
                  <Radar dataKey="c2" stroke="oklch(0.82 0.17 85)" fill="oklch(0.82 0.17 85)" fillOpacity={0.15} />
                  <Tooltip contentStyle={{ background: "oklch(0.18 0.025 262)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs">
              {top3.map((c, i) => (
                <div key={c.id} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: ["oklch(0.78 0.18 175)", "oklch(0.7 0.22 290)", "oklch(0.82 0.17 85)"][i] }} />
                  <span className="text-muted-foreground">#{c.rank} {c.candidate_data.profile.anonymized_name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6">
          <h2 className="font-display font-semibold mb-1">Top 10 Candidates</h2>
          <p className="text-xs text-muted-foreground mb-4">Final scores side-by-side.</p>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={results.slice(0, 10).map(c => ({
                name: c.candidate_data.profile.anonymized_name.split(" ")[0],
                score: Math.round(c.final_score),
              }))}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="oklch(0.65 0.03 255)" fontSize={11} />
                <YAxis stroke="oklch(0.65 0.03 255)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.18 0.025 262)", border: "1px solid oklch(1 0 0 / 0.1)", borderRadius: 8 }} />
                <Bar dataKey="score" fill="oklch(0.78 0.18 175)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </AppShell>
  );
}
