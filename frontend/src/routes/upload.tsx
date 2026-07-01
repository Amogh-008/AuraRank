import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  CheckCircle2,
  X,
  FileJson,
  Loader2,
  Database,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { saveRankedResponse } from "@/lib/candidate-store";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [{ title: "Upload — Redrob Ranker" }],
  }),
  component: UploadPage,
});
const RANK_10K_ENDPOINT = "http://127.0.0.1:8000/rank-10k";
const RANK_ENDPOINT = "http://127.0.0.1:8000/rank";
const RANK_FULL_ENDPOINT = "http://127.0.0.1:8000/rank-full";


function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [drag, setDrag] = useState(false);
  const [stage, setStage] =
    useState<"idle" | "processing" | "processing-full" | "done" | "error">("idle");

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const onFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    setFiles(prev => [...prev, ...Array.from(list)]);
  }, []);

  // ── Upload small file ──────────────────────────────────────────────────
  const start = async () => {
    const file = files[0];
    if (!file) {
      toast.error("Please select a candidate JSON file.");
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Please paste the Job Description.");
      return;
    }

    setStage("processing");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("job_description", jobDescription);

      const response = await fetch(RANK_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const data = await response.json();
      saveRankedResponse(data);
      setStage("done");
      toast.success("Ranking completed successfully.");
      setTimeout(() => navigate({ to: "/candidates" }), 600);
    } catch (err: any) {
      console.error(err);
      setStage("error");
      toast.error(err?.message ?? "Backend not reachable.");
    }
  };

  // ── Rank full 100K dataset from disk ──────────────────────────────────
  const startFull = async () => {
    if (!jobDescription.trim()) {
      toast.error("Please paste the Job Description first.");
      return;
    }

    setStage("processing-full");

    try {
      const formData = new FormData();
      formData.append("job_description", jobDescription);

      const response = await fetch(RANK_FULL_ENDPOINT, {
        method: "POST",
        body: formData,
        // No timeout — this takes ~1 minute
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      const data = await response.json();
      saveRankedResponse(data);
      setStage("done");
      toast.success(`Ranked ${data.count} candidates from full dataset!`);
      setTimeout(() => navigate({ to: "/candidates" }), 600);
    } catch (err: any) {
      console.error(err);
      setStage("error");
      toast.error(err?.message ?? "Backend not reachable.");
    }
  };

  const isProcessing = stage === "processing" || stage === "processing-full";

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-4xl mx-auto">

        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold">
            Upload Candidates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload candidate dataset and paste the Job Description.
          </p>
        </div>

        {/* Job Description */}
        <div className="glass rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-lg mb-3">Job Description</h2>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the complete Job Description here..."
            className="w-full min-h-[220px] rounded-xl border border-border bg-transparent p-4 resize-none focus:outline-none focus:ring-2 focus:ring-cyber"
          />
          <p className="text-xs text-muted-foreground mt-2">
            This Job Description will be used for semantic matching and dynamic candidate ranking.
          </p>
        </div>

        {/* ── Full Dataset Button ─────────────────────────────────────── */}
        <div className="glass rounded-2xl p-5 mb-6 border border-cyber/30">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyber to-neon flex items-center justify-center shrink-0">
              <Database className="h-5 w-5 text-background" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg">
                Rank Full Dataset (100K)
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Reads <span className="font-mono text-cyber">candidates.jsonl</span> directly
                from disk. No upload needed. Takes ~1 minute.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Button
              onClick={startFull}
              disabled={isProcessing || stage === "done"}
              className="bg-gradient-to-r from-cyber to-neon text-background font-semibold hover:opacity-90"
            >
              {stage === "processing-full" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ranking 100K candidates...
                </>
              ) : stage === "done" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Completed
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Run on Full Dataset
                </>
              )}
            </Button>
            <Button
              onClick={startTenK}
              disabled={isProcessing || stage === "done"}
              className="bg-gradient-to-r from-neon to-cyber text-background font-semibold hover:opacity-90"
            >
              {stage === "processing-full" ? (
                <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Ranking...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />Run on 10K Dataset</>
              )}
            </Button>

            {stage === "processing-full" && (
              <p className="text-xs text-muted-foreground font-mono">
                Phase 1: scoring 100K candidates... Phase 2: semantic re-ranking top 500...
              </p>
            )}
          </div>
        </div>

        {/* ── Divider ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">or upload a smaller file</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {/* Dropzone */}
        <motion.div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); onFiles(e.dataTransfer.files); }}
          animate={{ scale: drag ? 1.01 : 1 }}
          className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center transition-all ${
            drag ? "border-cyber bg-cyber/5 glow-cyber" : "border-border glass"
          }`}
        >
          <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
          <div className="relative">
            <motion.div
              animate={{ y: drag ? -4 : 0 }}
              className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-cyber to-neon flex items-center justify-center glow-cyber mb-4"
            >
              <Upload className="h-7 w-7 text-background" />
            </motion.div>
            <h3 className="font-display text-lg font-semibold">
              Drag & Drop Candidate Dataset
            </h3>
            <p className="text-sm text-muted-foreground mt-1">JSON / JSONL</p>
            <Button
              onClick={() => inputRef.current?.click()}
              className="mt-5 bg-foreground text-background hover:bg-foreground/90"
            >
              Browse Files
            </Button>
            <input
              ref={inputRef}
              hidden
              type="file"
              multiple
              accept=".json,.jsonl,application/json"
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>
        </motion.div>

        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 glass rounded-2xl p-4 space-y-2"
            >
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 group"
                >
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-cyber">
                    {f.name.endsWith(".json") || f.name.endsWith(".jsonl") ? (
                      <FileJson className="h-4 w-4" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(f.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <button
                    onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    disabled={isProcessing}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="pt-4 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {files.length} file{files.length !== 1 && "s"} selected
                </div>
                <Button
                  onClick={start}
                  disabled={isProcessing || stage === "done"}
                  className="bg-gradient-to-r from-cyber to-neon text-background font-semibold hover:opacity-90"
                >
                  {stage === "processing" && (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Ranking...</>
                  )}
                  {stage === "done" && (
                    <><CheckCircle2 className="h-4 w-4 mr-2" />Completed</>
                  )}
                  {(stage === "idle" || stage === "error" || stage === "processing-full") &&
                    "Run Ranking Engine"}
                </Button>
              </div>

              {stage === "processing" && (
                <div className="pt-2 flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyber" />
                  Uploading candidate pool and Job Description...
                </div>
              )}
              {stage === "done" && (
                <div className="pt-2 text-xs text-success font-mono">
                  Ranking complete. Redirecting...
                </div>
              )}
              {stage === "error" && (
                <div className="pt-2 text-xs text-danger font-mono">
                  Backend unavailable. Make sure FastAPI is running on http://127.0.0.1:8000
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AppShell>
  );
}
const startTenK = async () => {
  if (!jobDescription.trim()) { toast.error("Please paste the Job Description first."); return; }
  setStage("processing-full");
  try {
    const formData = new FormData();
    formData.append("job_description", jobDescription);
    const response = await fetch(RANK_10K_ENDPOINT, { method: "POST", body: formData });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    const data = await response.json();
    saveRankedResponse(data);
    setStage("done");
    toast.success(`Ranked ${data.count} candidates!`);
    setTimeout(() => navigate({ to: "/candidates" }), 600);
  } catch (err: any) {
    setStage("error");
    toast.error(err?.message ?? "Backend not reachable.");
  }
};
export default UploadPage;
