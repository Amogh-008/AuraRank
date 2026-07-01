import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CandidateCard } from "@/components/CandidateCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  SlidersHorizontal,
  Upload as UploadIcon,
  Download,
} from "lucide-react";
import type { RankedCandidate } from "@/lib/types";
import { loadRankedResponse } from "@/lib/candidate-store";

export const Route = createFileRoute("/candidates")({
  head: () => ({
    meta: [{ title: "Candidates — Redrob Ranker" }],
  }),
  component: CandidatesPage,
});

function CandidatesPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "top" | "honeypot">("all");
  const [candidates, setCandidates] = useState<RankedCandidate[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const r = loadRankedResponse();
    setCandidates(r?.results ?? []);
    setCount(r?.count ?? 0);
  }, []);

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (filter === "top" && c.final_score < 0.85) return false;
      if (filter === "honeypot" && !c.is_honeypot) return false;

      if (!q) return true;

      const s = q.toLowerCase();
      const p = c.candidate_data.profile;

      return (
        p.anonymized_name.toLowerCase().includes(s) ||
        p.current_title.toLowerCase().includes(s) ||
        (p.skills ?? []).some((k) => k.toLowerCase().includes(s))
      );
    });
  }, [q, filter, candidates]);

  const downloadCSV = () => {
    if (!filtered.length) return;

    const headers = [
      "Rank",
      "Candidate ID",
      "Name",
      "Current Title",
      "Experience",
      "Location",
      "Final Score",
      "Career Score",
      "Behavioral Score",
      "Role Fit Score",
      "Skills Score",
      "Location Score",
      "Honeypot",
    ];

    const rows = filtered.map((c) => {
      const p = c.candidate_data.profile;

      return [
        c.rank,
        c.id,
        p.anonymized_name,
        p.current_title,
        p.years_of_experience,
        p.location ?? "",
        `${(c.final_score * 100).toFixed(2)}%`,
        c.career_score,
        c.behavioral_score,
        c.role_fit_score,
        c.skills_score,
        c.location_score,
        c.is_honeypot ? "Yes" : "No",
      ];
    });

    const csv =
      headers.join(",") +
      "\n" +
      rows
        .map((row) =>
          row
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "ranked_candidates.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold">
            Ranked Candidates
          </h1>

          <p className="text-muted-foreground text-sm mt-1">
            {candidates.length === 0
              ? "No ranked results yet — upload a candidate pool to begin."
              : `${filtered.length} of ${
                  count || candidates.length
                } candidates · sorted by final score`}
          </p>
        </div>

        {candidates.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-cyber to-neon flex items-center justify-center glow-cyber mb-4">
              <UploadIcon className="h-6 w-6 text-background" />
            </div>

            <h2 className="font-display text-lg font-semibold">
              No ranked candidates yet
            </h2>

            <p className="text-sm text-muted-foreground mt-1 mb-5">
              Upload a JSON/JSONL pool to run the ranking engine.
            </p>

            <Button className="bg-gradient-to-r from-cyber to-neon text-background font-semibold">
              <Link to="/upload">Go to upload</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="glass rounded-xl p-3 mb-5 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name, title, or skill..."
                  className="pl-9 bg-transparent border-border focus-visible:ring-cyber"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={downloadCSV}
                  className="bg-gradient-to-r from-cyber to-neon text-background"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>

                {(
                  [
                    ["all", "All"],
                    ["top", "Top 100+"],
                    ["honeypot", "Honeypots"],
                  ] as const
                ).map(([k, l]) => (
                  <Button
                    key={k}
                    variant={filter === k ? "default" : "secondary"}
                    onClick={() => setFilter(k)}
                    className={
                      filter === k
                        ? "bg-cyber text-background hover:bg-cyber/90"
                        : "bg-muted/50"
                    }
                    size="sm"
                  >
                    {l}
                  </Button>
                ))}

                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-muted/50"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {filtered.map((c, i) => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  index={i}
                />
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  No candidates match your filters.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}