import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle2, X, FileJson, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { saveRankedResponse } from "@/lib/candidate-store";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Upload — Redrob Ranker" }] }),
  component: UploadPage,
});

const RANK_ENDPOINT = "http://127.0.0.1:8000/rank";

function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [stage, setStage] = useState<"idle" | "processing" | "done" | "error">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const onFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    setFiles(prev => [...prev, ...Array.from(list)]);
  }, []);

  const start = async () => {
    const file = files[0];
    if (!file) {
      toast.error("Please select a JSON or JSONL file");
      return;
    }
    setStage("processing");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(RANK_ENDPOINT, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      saveRankedResponse(data);
      setStage("done");
      toast.success("Ranking complete");
      setTimeout(() => navigate({ to: "/candidates" }), 600);
    } catch (err: any) {
      console.error(err);
      setStage("error");
      toast.error(err?.message ?? "Failed to reach ranking engine. Is the API running at 127.0.0.1:8000?");
    }
  };

  return (
    <AppShell>
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold">Upload Candidates</h1>
          <p className="text-muted-foreground text-sm mt-1">Drop a JSON or JSONL candidate pool. Sent to <span className="font-mono text-cyber">POST /rank</span>.</p>
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
            <h3 className="font-display text-lg font-semibold">Drag & drop files</h3>
            <p className="text-sm text-muted-foreground mt-1">JSON, JSONL</p>
            <Button
              onClick={() => inputRef.current?.click()}
              className="mt-5 bg-foreground text-background hover:bg-foreground/90"
            >
              Browse files
            </Button>
            <input
              ref={inputRef} type="file" multiple hidden
              accept=".json,.jsonl,application/json"
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>
        </motion.div>

        {/* File list */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-6 glass rounded-2xl p-4 space-y-2"
            >
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 group">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-cyber">
                    {f.name.endsWith(".json") || f.name.endsWith(".jsonl") ? <FileJson className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <button
                    onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger"
                    disabled={stage === "processing"}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="text-sm text-muted-foreground">{files.length} file{files.length !== 1 && "s"} ready</div>
                <Button
                  onClick={start} disabled={stage === "processing" || stage === "done"}
                  className="bg-gradient-to-r from-cyber to-neon text-background font-semibold hover:opacity-90"
                >
                  {stage === "processing" && <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scoring...</>}
                  {stage === "done" && <><CheckCircle2 className="h-4 w-4 mr-1" /> Complete</>}
                  {(stage === "idle" || stage === "error") && "Run Ranking Engine"}
                </Button>
              </div>

              {stage === "processing" && (
                <div className="pt-2 flex items-center gap-3 text-xs text-muted-foreground font-mono">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyber" />
                  Posting to {RANK_ENDPOINT} · waiting for ranked response...
                </div>
              )}
              {stage === "error" && (
                <div className="pt-2 text-xs text-danger font-mono">
                  Request failed. Check the backend at 127.0.0.1:8000 and try again.
                </div>
              )}
              {stage === "done" && (
                <div className="pt-2 text-xs text-success font-mono">Done · redirecting to results</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
