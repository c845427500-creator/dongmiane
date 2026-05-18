"use client";

import { motion } from "framer-motion";
import { Eye, EyeOff, ChevronRight } from "lucide-react";

interface DimensionBreakdown {
  dimension: string;
  what_ai_saw: string[];
  what_ai_missed: string[];
  reveal: string;
}

interface Props {
  breakdowns: DimensionBreakdown[];
  overallReveal: string;
  loading?: boolean;
}

const DIM_EMOJI: Record<string, string> = {
  "逻辑思维": "🧠",
  "问题解决": "🔧",
  "沟通协作": "🤝",
  "价值观匹配": "⭐",
};

export default function BlackBoxReveal({ breakdowns, overallReveal, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white border border-[#E8E8E8] rounded-md p-5">
        <div className="flex items-center gap-2 mb-3">
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Eye size={18} className="text-[#0052D9]" />
          </motion.div>
          <span className="text-sm font-semibold text-slate-800">AI 正在拆解黑箱...</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!breakdowns || breakdowns.length === 0) {
    return (
      <div className="bg-white border border-[#E8E8E8] rounded-md p-5 text-center">
        <EyeOff size={24} className="text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-400">暂无可展示的黑箱拆解数据</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[#E8E8E8] rounded-md p-5 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Eye size={18} className="text-[#0052D9]" />
        <span className="text-sm font-semibold text-slate-800">你的专属黑箱拆解</span>
        <span className="text-[10px] text-slate-400 ml-auto">
          基于你的回答逐维度分析
        </span>
      </div>

      {/* Dimension breakdowns */}
      <div className="space-y-0">
        {breakdowns.map((bd, i) => (
          <motion.div
            key={bd.dimension}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.12 }}
            className="relative pl-4 pb-4 last:pb-0"
          >
            {/* Timeline line */}
            {i < breakdowns.length - 1 && (
              <div className="absolute left-[7px] top-6 bottom-0 w-px bg-[#E8E8E8]" />
            )}

            {/* Dot */}
            <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-[#0052D9] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>

            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{DIM_EMOJI[bd.dimension] || "📊"}</span>
              <span className="text-xs font-semibold text-slate-800">{bd.dimension}</span>
            </div>

            {/* What AI Saw */}
            {bd.what_ai_saw && bd.what_ai_saw.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-green-600 font-semibold mb-1">✅ AI 读到的正面信号</p>
                <div className="space-y-0.5">
                  {bd.what_ai_saw.map((s, j) => (
                    <div key={j} className="flex items-start gap-1 text-[11px] text-green-800">
                      <ChevronRight size={10} className="mt-0.5 flex-shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* What AI Missed */}
            {bd.what_ai_missed && bd.what_ai_missed.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] text-amber-600 font-semibold mb-1">⚠️ AI 没读到的信号</p>
                <div className="space-y-0.5">
                  {bd.what_ai_missed.map((s, j) => (
                    <div key={j} className="flex items-start gap-1 text-[11px] text-amber-800">
                      <ChevronRight size={10} className="mt-0.5 flex-shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reveal */}
            {bd.reveal && (
              <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2 rounded-sm border border-[#E8E8E8]">
                💡 {bd.reveal}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Overall reveal */}
      {overallReveal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 p-3.5 bg-gradient-to-r from-[#F2F3FF] to-[#E8F3FF] rounded-sm border border-[#0052D9]/10"
        >
          <p className="text-[11px] font-semibold text-[#0052D9] mb-1">🔍 总体揭秘</p>
          <p className="text-xs text-slate-700 leading-relaxed">{overallReveal}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
