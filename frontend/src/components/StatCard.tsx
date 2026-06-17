import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function StatCard({
  label, value, sublabel, icon, accent = "cyber", delay = 0,
}: {
  label: string; value: ReactNode; sublabel?: string; icon: ReactNode;
  accent?: "cyber" | "neon" | "warn" | "danger" | "success"; delay?: number;
}) {
  const glow = {
    cyber: "from-cyber/20 to-transparent",
    neon: "from-neon/20 to-transparent",
    warn: "from-warn/20 to-transparent",
    danger: "from-danger/20 to-transparent",
    success: "from-success/20 to-transparent",
  }[accent];
  const text = {
    cyber: "text-cyber", neon: "text-neon", warn: "text-warn",
    danger: "text-danger", success: "text-success",
  }[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl glass p-5 group hover:border-cyber/30 transition-all"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${glow} opacity-50 pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
          <div className="mt-2 text-3xl font-bold font-display tracking-tight">{value}</div>
          {sublabel && <div className="mt-1 text-xs text-muted-foreground">{sublabel}</div>}
        </div>
        <div className={`h-10 w-10 rounded-xl glass flex items-center justify-center ${text}`}>{icon}</div>
      </div>
    </motion.div>
  );
}
