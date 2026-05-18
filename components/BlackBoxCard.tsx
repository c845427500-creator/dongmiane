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
    setSelected(idx);
    onVote?.(idx);
  };

  return (
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-[#0052D9]/5 rounded-3xl blur-2xl animate-pulse-glow" />

      <div className="relative bg-white border border-slate-200 rounded-2xl p-5 shadow-lg overflow-hidden">
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
                disabled={false}
                onClick={() => handleSelect(idx)}
                className={`w-full text-left p-3.5 rounded-xl border-2 text-sm transition-all ${
                  isCorrect
                    ? "border-green-400 bg-green-50"
                    : isWrong
                    ? "border-red-300 bg-red-50"
                    : isSelected
                    ? "border-[#0052D9] bg-[#E8F3FF]"
                    : "border-slate-100 bg-slate-50 hover:border-slate-300"
                } cursor-pointer`}
                whileTap={{ scale: 0.98 }}
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
              className="mt-4 pt-4 border-t border-slate-100 space-y-3"
            >
              {/* Pre-vote connection: 你的判断 vs 真相 */}
              {userVote !== undefined && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-3.5 bg-[#F2F3FF] rounded-xl border border-[#0052D9]/10"
                >
                  <p className="text-[11px] font-bold text-[#0052D9] mb-2">你的判断 vs 真相</p>
                  <div className="flex gap-3">
                    <div className="flex-1 text-center p-2.5 rounded-lg"
                      style={{ background: userVote === box.correct ? "#F0FDF4" : "#FFF7ED", border: `1px solid ${userVote === box.correct ? "#BBF7D0" : "#FED7AA"}` }}>
                      <p className="text-[10px] text-slate-500 mb-1">你选了</p>
                      <p className="text-lg font-bold" style={{ color: userVote === box.correct ? "#16A34A" : "#F97316" }}>{["A", "B", "C", "D"][userVote]}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{box.options[userVote]}</p>
                    </div>
                    <div className="flex items-center text-slate-300">
                      <span className="text-lg">→</span>
                    </div>
                    <div className="flex-1 text-center p-2.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0]">
                      <p className="text-[10px] text-green-700 mb-1">正确答案</p>
                      <p className="text-lg font-bold text-green-600">{["A", "B", "C", "D"][box.correct]}</p>
                      <p className="text-[10px] text-green-700 mt-0.5 line-clamp-1">{box.options[box.correct]}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 真相解析：常见误解 vs 真实情况 */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-2.5 p-3.5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100"
              >
                <Lightbulb size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-amber-700 mb-1">❌ 常见误解 vs ✅ 真实情况</p>
                  <p className="text-sm text-amber-900 leading-relaxed">{box.truth}</p>
                </div>
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
