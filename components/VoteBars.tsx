"use client";

import { motion } from "framer-motion";

const LABELS = ["A", "B", "C", "D"];
const COLORS = ["#0052D9", "#007BFF", "#FF7D00", "#FF4757"];

interface Props {
  votes: Record<string, number>;
  correctIndex?: number;
  showCorrect?: boolean;
}

export default function VoteBars({ votes, correctIndex, showCorrect }: Props) {
  const maxVotes = Math.max(1, ...Object.values(votes));

  return (
    <div className="space-y-2.5">
      {LABELS.map((label, idx) => {
        const count = votes[idx] || 0;
        const pct = maxVotes > 0 ? (count / maxVotes) * 100 : 0;
        const isCorrect = showCorrect && idx === correctIndex;

        return (
          <div key={label} className="flex items-center gap-3">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              isCorrect
                ? "bg-green-400 text-white"
                : "bg-slate-200 text-slate-500"
            }`}>
              {label}
            </span>
            <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
              <motion.div
                className={`h-full rounded-lg ${isCorrect ? "bg-green-400" : ""}`}
                style={{ background: isCorrect ? undefined : "linear-gradient(90deg, #0052D9, #007BFF)" }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
              <motion.span
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {count} 人
              </motion.span>
            </div>
            {isCorrect && <span className="text-xs font-bold text-green-500">✓ 正确</span>}
          </div>
        );
      })}
    </div>
  );
}
