"use client";

import { motion } from "framer-motion";
import { Lock, BookOpen, Lightbulb, TestTube, Swords } from "lucide-react";

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
}: Props) {
  return (
    <motion.button
      onClick={onClick}
      disabled={!unlocked}
      whileTap={unlocked ? { scale: 0.98 } : {}}
      className={`w-full text-left rounded-2xl border-2 transition-all overflow-hidden ${
        isActive
          ? "border-[#0052D9] shadow-lg shadow-[#0052D9]/10"
          : unlocked
          ? "border-slate-200 bg-white hover:border-slate-300"
          : "border-slate-100 bg-slate-50 cursor-not-allowed"
      }`}
    >
      {/* Card header */}
      <div className="p-4 flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-800 text-sm truncate">{title}</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {unlocked ? `#${keyword} · 已解锁` : `#${keyword} · 锁定`}
          </p>
        </div>
        {unlocked ? (
          <BookOpen size={18} className="text-[#0052D9] flex-shrink-0" />
        ) : (
          <Lock size={18} className="text-slate-300 flex-shrink-0" />
        )}
      </div>

      {/* Expanded content */}
      {isActive && unlocked && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3"
        >
          {/* Truth */}
          <div className="flex gap-2.5 p-3 bg-amber-50 rounded-xl">
            <Lightbulb size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-amber-600 mb-1">❌ 常见误解 vs ✅ 真实情况</p>
              <p className="text-xs text-amber-800 leading-relaxed">{truth}</p>
            </div>
          </div>

          {/* Test conclusion */}
          <div className="flex gap-2.5 p-3 bg-[#E8F3FF] rounded-xl">
            <TestTube size={16} className="text-[#0052D9] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-[#0052D9] mb-1">🧪 AI 实测验证结论</p>
              <p className="text-xs text-slate-700 leading-relaxed">{testConclusion}</p>
            </div>
          </div>

          {/* Debate stances */}
          <div className="flex gap-2.5 p-3 bg-slate-50 rounded-xl">
            <Swords size={16} className="text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-slate-600 mb-1">💡 双重视角</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-[10px] text-green-600 font-bold mb-0.5">✅ {proStance}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-red-600 font-bold mb-0.5">🔴 {conStance}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.button>
  );
}
