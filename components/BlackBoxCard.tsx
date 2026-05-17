"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle, Lightbulb, ShieldAlert, Sparkles } from "lucide-react";
import type { BlackBox } from "@/lib/data";

interface Props {
  box: BlackBox;
  revealed: boolean;
  phase?: string;
  onVote?: (optionIndex: number) => void;
  userVote?: number;
}

export default function BlackBoxCard({ box, revealed, phase, onVote, userVote }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (idx: number) => {
    if (selected !== null || userVote !== undefined) return;
    setSelected(idx);
    onVote?.(idx);
  };

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-[#0052D9]/5 rounded-3xl blur-2xl animate-pulse-glow" />

      <div className="relative bg-white border border-slate-200 rounded-2xl p-5 shadow-lg overflow-hidden">
        {/* Mystery overlay for locked state */}
        {!revealed && phase === "pre_vote" && (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/40 to-slate-900/80 z-10 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-5xl mb-3"
              >
                🔒
              </motion.div>
              <p className="text-white/80 text-sm font-medium">算法黑箱</p>
              <p className="text-white/40 text-xs mt-1">等待揭晓...</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{box.emoji}</span>
          <h3 className="text-lg font-bold text-slate-900 leading-snug">{box.question}</h3>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          {box.options.map((opt, idx) => {
            const isCorrect = revealed && idx === box.correct;
            const isSelected = userVote !== undefined ? userVote === idx : selected === idx;
            const isWrong = revealed && isSelected && !isCorrect;

            return (
              <motion.button
                key={idx}
                disabled={selected !== null || userVote !== undefined}
                onClick={() => handleSelect(idx)}
                className={`w-full text-left p-3.5 rounded-xl border-2 text-sm transition-all ${
                  isCorrect
                    ? "border-green-400 bg-green-50"
                    : isWrong
                    ? "border-red-300 bg-red-50"
                    : isSelected
                    ? "border-[#0052D9] bg-[#E8F3FF]"
                    : "border-slate-100 bg-slate-50 hover:border-slate-300"
                } ${(selected !== null || userVote !== undefined) ? "cursor-default" : "cursor-pointer"}`}
                whileTap={selected === null && userVote === undefined ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCorrect
                      ? "bg-green-400 text-white"
                      : isWrong
                      ? "bg-red-400 text-white"
                      : isSelected
                      ? "bg-[#0052D9] text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}>
                    {["A", "B", "C", "D"][idx]}
                  </span>
                  <span className={`${isCorrect ? "text-green-800 font-medium" : isWrong ? "text-red-700" : "text-slate-700"}`}>
                    {opt}
                  </span>
                  {isCorrect && <CheckCircle size={18} className="text-green-500 ml-auto" />}
                  {isWrong && <ShieldAlert size={18} className="text-red-400 ml-auto" />}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Truth reveal */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-slate-100"
            >
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 rounded-xl border border-amber-100">
                <Lightbulb size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 leading-relaxed">{box.truth}</p>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div className="flex-1 p-3 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-[11px] text-green-600 font-bold mb-1">✅ 正方</p>
                  <p className="text-xs text-green-800">{box.proStance}</p>
                </div>
                <div className="flex-1 p-3 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-[11px] text-red-600 font-bold mb-1">🔴 反方</p>
                  <p className="text-xs text-red-800">{box.conStance}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
