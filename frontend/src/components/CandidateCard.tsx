import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { ChevronDown, MapPin, Briefcase, AlertTriangle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { RankedCandidate } from "@/lib/types";

export function CandidateCard({ candidate, index }: { candidate: RankedCandidate; index: number }) {
  const [open, setOpen] = useState(false);
  const p = candidate.candidate_data.profile;
  const score = Math.round(candidate.final_score);
  const scoreColor = score >= 85 ? "text-cyber" : score >= 70 ? "text-warn" : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4) }}
      className="relative rounded-2xl glass overflow-hidden hover:border-cyber/40 transition-colors"
    >
      {/* Header (click to expand) */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left p-5 flex items-start gap-4"
      >
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold font-display text-lg ${
            candidate.rank <= 3 ? "bg-gradient-to-br from-cyber to-neon text-background glow-cyber" : "glass text-foreground"
          }`}>
            #{candidate.rank}
          </div>
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-accent to-muted flex items-center justify-center text-base font-semibold">
            {initials(p.anonymized_name)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base truncate">{p.anonymized_name}</h3>
                {candidate.is_honeypot && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-danger/15 text-danger border border-danger/30">
                    <AlertTriangle className="h-3 w-3" /> Honeypot
                  </span>
                )}
                {candidate.rank <= 3 && <Sparkles className="h-3.5 w-3.5 text-cyber" />}
              </div>
              <div className="text-sm text-muted-foreground truncate">{p.current_title}</div>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> {p.years_of_experience}y experience
                </span>
                {p.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {p.location}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className={`font-display text-3xl font-bold tabular-nums ${scoreColor}`}>{score}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Final Score</div>
              </div>
              <motion.div animate={{ rotate: open ? 180 : 0 }} className="text-muted-foreground">
                <ChevronDown className="h-5 w-5" />
              </motion.div>
            </div>
          </div>

          <div className="mt-3 h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-cyber to-neon"
            />
          </div>
        </div>
      </button>

      {/* Expanded section */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="expand"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-5 space-y-5">
              {/* Meta row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Meta label="Location" value={p.location ?? "—"} />
                <Meta label="Experience" value={`${p.years_of_experience} years`} />
                <Meta label="Honeypot" value={candidate.is_honeypot ? "Detected" : "Clean"} />
              </div>

              {/* Score breakdown */}
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Score Breakdown</div>
                <div className="space-y-3">
                  <Score label="Career Score" value={candidate.career_score} />
                  <Score label="Behavioral Score" value={candidate.behavioral_score} />
                  <Score label="Role Fit Score" value={candidate.role_fit_score} />
                </div>
              </div>

              {/* Skills */}
              {p.skills && p.skills.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.skills.map((s, i) => (
                      <Badge key={`${s}-${i}`} className="bg-cyber/10 text-cyber border border-cyber/20 font-normal">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {p.summary && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Profile Summary</div>
                  <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">{p.summary}</p>
                </div>
              )}

              {/* Red flags */}
              {candidate.red_flags.length > 0 && (
                <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-danger" />
                    <h3 className="text-sm font-semibold text-danger">Red Flags</h3>
                  </div>
                  <ul className="space-y-1 text-sm text-foreground/80">
                    {candidate.red_flags.map((f, i) => (
                      <li key={i} className="flex gap-2"><span className="text-danger">•</span>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-1 truncate">{value}</div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  const v = Math.round(value);
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-foreground/80">{label}</span>
        <span className="font-mono font-semibold text-cyber">{v}</span>
      </div>
      <Progress value={v} className="h-1.5 bg-muted/60" />
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "?";
}
