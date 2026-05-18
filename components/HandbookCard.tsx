"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, BookOpen, Lightbulb, FlaskConical, Sparkles, Brain } from "lucide-react";

interface Props {
  keyword: string;
  emoji: string;
  title: string;
  truth: string;
  testConclusion: string;
  proStance: string;
  conStance: string;
  unlocked: boolean;
  isActive?: boolean;
  onClick?: () => void;
  userVote?: number;
  correctAnswer?: number;
  options?: string[];
  testResult?: import("@/lib/data").TestResult;
  aiConclusion?: string;
  aiConclusionLoading?: boolean;
}

// 11 distinct color palettes — one per black box topic
const CARD_COLORS: Record<string, {
  accent: string;
  accentSoft: string;
  accentBorder: string;
  accentText: string;
  bar: string;
}> = {
  "歧视": { accent: "#F97316", accentSoft: "#FFF7ED", accentBorder: "#FED7AA", accentText: "#C2410C", bar: "#F97316" },
  "双非": { accent: "#7C3AED", accentSoft: "#F5F3FF", accentBorder: "#DDD6FE", accentText: "#6D28D9", bar: "#7C3AED" },
  "公平": { accent: "#10B981", accentSoft: "#ECFDF5", accentBorder: "#A7F3D0", accentText: "#047857", bar: "#10B981" },
  "内向": { accent: "#14B8A6", accentSoft: "#F0FDFA", accentBorder: "#99F6E4", accentText: "#0F766E", bar: "#14B8A6" },
  "算法": { accent: "#6366F1", accentSoft: "#EEF2FF", accentBorder: "#C7D2FE", accentText: "#4338CA", bar: "#6366F1" },
  "申诉": { accent: "#F43F5E", accentSoft: "#FFF1F2", accentBorder: "#FECDD3", accentText: "#BE123C", bar: "#F43F5E" },
  "紧张": { accent: "#F59E0B", accentSoft: "#FFFBEB", accentBorder: "#FDE68A", accentText: "#B45309", bar: "#F59E0B" },
  "透明": { accent: "#0EA5E9", accentSoft: "#F0F9FF", accentBorder: "#BAE6FD", accentText: "#0369A1", bar: "#0EA5E9" },
  "偏见": { accent: "#D946EF", accentSoft: "#FDF4FF", accentBorder: "#F0ABFC", accentText: "#A21CAF", bar: "#D946EF" },
  "长相": { accent: "#FB7185", accentSoft: "#FFF1F2", accentBorder: "#FECDD3", accentText: "#BE123C", bar: "#FB7185" },
  "能力": { accent: "#0052D9", accentSoft: "#E8F3FF", accentBorder: "#B5C7FF", accentText: "#003CAB", bar: "#0052D9" },
};

const FALLBACK_COLORS = [
  { accent: "#F97316", accentSoft: "#FFF7ED", accentBorder: "#FED7AA", accentText: "#C2410C", bar: "#F97316" },
  { accent: "#6366F1", accentSoft: "#EEF2FF", accentBorder: "#C7D2FE", accentText: "#4338CA", bar: "#6366F1" },
  { accent: "#10B981", accentSoft: "#ECFDF5", accentBorder: "#A7F3D0", accentText: "#047857", bar: "#10B981" },
  { accent: "#D946EF", accentSoft: "#FDF4FF", accentBorder: "#F0ABFC", accentText: "#A21CAF", bar: "#D946EF" },
  { accent: "#14B8A6", accentSoft: "#F0FDFA", accentBorder: "#99F6E4", accentText: "#0F766E", bar: "#14B8A6" },
];

function getCardColors(keyword: string, index: number) {
  if (CARD_COLORS[keyword]) return CARD_COLORS[keyword];
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export default function HandbookCard({
  keyword,
  emoji,
  title,
  truth,
  testConclusion,
  proStance,
  conStance,
  unlocked,
  isActive,
  onClick,
  userVote,
  correctAnswer,
  options,
  testResult,
  aiConclusion,
  aiConclusionLoading,
}: Props) {
  // Use a stable index from the keyword for deterministic color assignment
  const colorIndex = keyword.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colors = getCardColors(keyword, colorIndex);

  return (
    <motion.div
      layout
      className="relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button
        onClick={onClick}
        disabled={!unlocked}
        whileTap={unlocked ? { scale: 0.97 } : {}}
        whileHover={unlocked ? { y: -2 } : {}}
        className={`w-full text-left rounded-xl overflow-hidden transition-shadow duration-200 ${
          unlocked
            ? "bg-white cursor-pointer"
            : "bg-slate-100 cursor-not-allowed"
        }`}
        style={{
          boxShadow: isActive && unlocked
            ? `0 4px 20px ${colors.accent}25`
            : unlocked
            ? "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)"
            : "0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        {/* Colored top accent bar */}
        <div
          className="h-1 w-full"
          style={{ background: unlocked ? colors.bar : "#CBD5E1" }}
        />

        {/* Card header */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Emoji circle */}
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{
                background: unlocked ? colors.accentSoft : "#F1F5F9",
              }}
            >
              {emoji}
            </div>

            <div className="flex-1 min-w-0">
              <h4
                className="font-semibold text-sm leading-snug truncate"
                style={{ color: unlocked ? "#1E293B" : "#94A3B8" }}
              >
                {title}
              </h4>
              <div className="flex items-center gap-1.5 mt-1">
                {unlocked ? (
                  <>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        background: colors.accentSoft,
                        color: colors.accentText,
                      }}
                    >
                      #{keyword}
                    </span>
                    <Sparkles size={10} style={{ color: colors.accent }} />
                  </>
                ) : (
                  <span className="text-[10px] text-slate-400">#{keyword} · 未拆开</span>
                )}
              </div>
            </div>

            {/* Status icon */}
            <div className="flex-shrink-0 mt-0.5">
              {unlocked ? (
                <BookOpen size={16} style={{ color: colors.accent }} />
              ) : (
                <Lock size={16} className="text-slate-300" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {isActive && unlocked && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {/* Truth */}
                <div
                  className="flex gap-2.5 p-3 rounded-lg"
                  style={{ background: colors.accentSoft, border: `1px solid ${colors.accentBorder}` }}
                >
                  <Lightbulb size={15} style={{ color: colors.accent }} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p
                      className="text-[10px] font-bold mb-1"
                      style={{ color: colors.accentText }}
                    >
                      ❌ 常见误解 vs ✅ 真实情况
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: "#334155" }}>
                      {truth}
                    </p>
                  </div>
                </div>

                {/* Test conclusion */}
                <div
                  className="flex gap-2.5 p-3 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${colors.accentSoft}, #F8FAFC)`,
                    border: `1px solid ${colors.accentBorder}50`,
                  }}
                >
                  <FlaskConical size={15} style={{ color: colors.accent }} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p
                      className="text-[10px] font-bold mb-1"
                      style={{ color: colors.accentText }}
                    >
                      🧪 通用实测结论
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: "#334155" }}>
                      {testConclusion}
                    </p>
                  </div>
                </div>

                {/* AI Personalized Conclusion */}
                {(testResult || aiConclusion || aiConclusionLoading) && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex gap-2.5 p-3 rounded-lg"
                    style={{
                      background: `linear-gradient(135deg, #F2F3FF, #FFF7ED)`,
                      border: `1px solid ${colors.accentBorder}60`,
                    }}
                  >
                    <Brain size={15} className="text-[#0052D9] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-[#0052D9] mb-1">
                        🎯 你的专属实测分析
                      </p>
                      {aiConclusionLoading ? (
                        <div className="flex items-center gap-2 py-2">
                          <motion.div
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                            className="w-3 h-3 rounded-full bg-[#0052D9]"
                          />
                          <span className="text-[10px] text-slate-400">基于你的实测数据生成专属分析...</span>
                        </div>
                      ) : aiConclusion ? (
                        <p className="text-xs leading-relaxed" style={{ color: "#334155" }}>
                          {aiConclusion}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-400">正在准备...</p>
                      )}
                    </div>
                  </motion.div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Locked overlay (subtle pattern) */}
        {!unlocked && (
          <div className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(148,163,184,0.04) 4px, rgba(148,163,184,0.04) 8px)",
            }}
          />
        )}
      </motion.button>
    </motion.div>
  );
}
