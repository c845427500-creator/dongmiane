"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Share2, BookOpen, Lock } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import HandbookCard from "@/components/HandbookCard";
import { loadState, onStateChange } from "@/lib/client-state";
import { BLACK_BOX_BANK, getActiveBoxes, getKeywordFrequencies } from "@/lib/data";

export default function HandbookPage() {
  const [state, setState] = useState(() => loadState());
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    return onStateChange((s) => setState(s));
  }, []);

  const boxes = state.activeBoxes.length > 0
    ? state.activeBoxes
    : getActiveBoxes(getKeywordFrequencies(state.worries));

  const handleShare = async () => {
    const url = `${window.location.origin}/handbook`;
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      {/* Header */}
      <div className="pt-8 px-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-[#0052D9]">📖 干货手册</h1>
            <p className="text-xs text-slate-500 mt-1">AI 面试真相与应对实操</p>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F3FF] text-[#0052D9] rounded-full text-xs font-bold"
          >
            {shared ? "已复制!" : (
              <>
                <Share2 size={14} /> 分享手册
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mb-4">
        <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl">
          <BookOpen size={16} className="text-[#0052D9]" />
          <span className="text-sm font-bold text-slate-800">
            {state.handbookClaimed.length} / {boxes.length} 卡片已解锁
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="px-5 space-y-3">
        {boxes.length === 0 && (
          <div className="text-center py-16">
            <Lock size={48} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">还没有干货卡片</p>
            <p className="text-xs text-slate-300 mt-1">完成一轮黑箱爆破后解锁</p>
          </div>
        )}

        {boxes.map((box) => (
          <HandbookCard
            key={box.keyword}
            keyword={box.keyword}
            emoji={box.emoji}
            title={box.question}
            truth={box.truth}
            testConclusion={box.testConclusion}
            proStance={box.proStance}
            conStance={box.conStance}
            unlocked={state.handbookClaimed.includes(box.keyword)}
            isActive={activeCard === box.keyword}
            onClick={() => setActiveCard(activeCard === box.keyword ? null : box.keyword)}
          />
        ))}

        {/* Cards not yet in active boxes but in bank */}
        {boxes.length === 0 && state.handbookClaimed.length > 0 && (
          Object.entries(BLACK_BOX_BANK)
            .filter(([kw]) => state.handbookClaimed.includes(kw))
            .map(([kw, info]) => (
              <HandbookCard
                key={kw}
                keyword={kw}
                emoji={info.emoji}
                title={info.q}
                truth={info.truth}
                testConclusion={info.test_conclusion}
                proStance={info["正方"]}
                conStance={info["反方"]}
                unlocked={true}
                isActive={activeCard === kw}
                onClick={() => setActiveCard(activeCard === kw ? null : kw)}
              />
            ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
