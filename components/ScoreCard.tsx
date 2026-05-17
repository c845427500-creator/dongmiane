"use client";

import { motion } from "framer-motion";
import { Trophy, Medal, Sparkles } from "lucide-react";

interface ScoreProps {
  logic: number;
  content: number;
  fluency: number;
  comment: string;
  truth?: string;
  mechanism?: string;
  streaming?: string;
}

function ScoreBar({ label, value, color, delay }: { label: string; value: number; color: string; delay: number }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <motion.span
          className="text-sm font-bold"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.8 }}
        >
          {value}
          <span className="text-[10px] font-normal text-slate-400">/100</span>
        </motion.span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function ScoreCard({ logic, content, fluency, comment, truth, mechanism, streaming }: ScoreProps) {
  if (streaming) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles size={24} className="text-[#0052D9]" />
          </motion.div>
          <p className="text-sm text-slate-500">AI 正在分析你的回答...</p>
        </div>
        <p className="text-sm text-slate-600 whitespace-pre-wrap">{streaming}</p>
      </div>
    );
  }

  const avg = Math.round((logic + content + fluency) / 3);
  const grade = avg >= 85 ? "A" : avg >= 75 ? "B" : avg >= 60 ? "C" : "D";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-lg"
    >
      {/* Grade badge */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Trophy size={20} className="text-[#0052D9]" />
          <span className="text-sm font-bold text-slate-800">AI 评分报告</span>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.5 }}
          className="flex items-center gap-1.5"
        >
          <Medal size={20} className="text-amber-500" />
          <span className="text-2xl font-black text-[#0052D9]">{avg}</span>
          <span className="text-sm font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">{grade}</span>
        </motion.div>
      </div>

      {/* Score bars */}
      <ScoreBar label="逻辑条理" value={logic} color="#0052D9" delay={0.1} />
      <ScoreBar label="内容匹配" value={content} color="#007BFF" delay={0.3} />
      <ScoreBar label="表达流畅" value={fluency} color="#00A3FF" delay={0.5} />

      {/* Comment */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-4 p-3.5 bg-slate-50 rounded-xl text-sm text-slate-700 leading-relaxed"
      >
        {comment}
      </motion.p>

      {/* Truth & Mechanism */}
      {truth && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-3 p-3.5 bg-[#E8F3FF] rounded-xl border border-[#0052D9]/10"
        >
          <p className="text-[11px] font-bold text-[#0052D9] mb-1">💡 真相解读</p>
          <p className="text-xs text-slate-700 leading-relaxed">{truth}</p>
        </motion.div>
      )}

      {mechanism && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="mt-2 p-3.5 bg-slate-50 rounded-xl border border-slate-100"
        >
          <p className="text-[11px] font-bold text-slate-600 mb-1">🔧 机制解释</p>
          <p className="text-xs text-slate-600 leading-relaxed">{mechanism}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
