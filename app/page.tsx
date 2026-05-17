"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, TrendingUp, Users, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import WordCloud from "@/components/WordCloud";
import WorryTicker from "@/components/WorryTicker";
import BottomNav from "@/components/BottomNav";
import {
  loadState,
  addWorry,
  setActiveKeyword,
  setActiveBoxes,
  onStateChange,
} from "@/lib/client-state";
import {
  PRESET_POOL,
  getKeywordFrequencies,
  getActiveBoxes,
  type Worry,
} from "@/lib/data";

export default function HomePage() {
  const router = useRouter();
  const [state, setState] = useState(() => loadState());
  const [inputText, setInputText] = useState("");
  const [latestWorry, setLatestWorry] = useState<Worry | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return onStateChange((s) => {
      setState(s);
      setLatestWorry(s.worries[0] || null);
    });
  }, []);

  const keywords = getKeywordFrequencies(state.worries);
  const totalWorries = state.worries.length;

  const handleSubmit = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    const newState = addWorry(state, text);
    setState(newState);
    setLatestWorry(newState.worries[0] || null);
    setInputText("");
    const freshKeywords = getKeywordFrequencies(newState.worries);
    const boxes = getActiveBoxes(freshKeywords);
    if (boxes.length > 0) {
      setActiveBoxes(newState, boxes);
    }
  }, [inputText, state]);

  const handlePreset = (text: string) => {
    setInputText(text);
    inputRef.current?.focus();
  };

  const handleKeywordClick = (kw: string) => {
    const newState = setActiveKeyword(state, kw);
    const boxes = getActiveBoxes(getKeywordFrequencies(newState.worries));
    setActiveBoxes(newState, boxes);
    setState(newState);
    router.push("/qa");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#E8F3FF] via-white to-white pb-24">
      <div className="pt-8 px-5 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">🐧</span>
          <div>
            <h1 className="text-2xl font-black text-[#0052D9] tracking-tight">懂面鹅</h1>
            <p className="text-xs text-slate-500">你的 AI 面试专属解惑官</p>
          </div>
        </div>
      </div>

      <div className="px-5 mb-4">
        <div className="flex items-center gap-4 px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-1.5">
            <Users size={16} className="text-[#0052D9]" />
            <span className="text-sm font-bold text-slate-800">{totalWorries}</span>
            <span className="text-xs text-slate-400">条担忧</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-1.5">
            <TrendingUp size={16} className="text-[#0052D9]" />
            <span className="text-sm font-bold text-slate-800">{keywords.length}</span>
            <span className="text-xs text-slate-400">个关键词</span>
          </div>
        </div>
      </div>

      <div className="px-5 mb-4">
        <WordCloud words={keywords.map(([k, v]) => ({ text: k, freq: v }))} />
      </div>

      <div className="px-5 mb-4">
        <WorryTicker worries={state.worries} />
      </div>

      <AnimatePresence>
        {latestWorry && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="px-5 mb-4 overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-[#E8F3FF] rounded-xl border border-[#0052D9]/10">
              <Sparkles size={14} className="text-[#0052D9]" />
              <span className="text-xs text-slate-500">{latestWorry.time}</span>
              <span className="text-xs text-[#0052D9] font-medium truncate">{latestWorry.text}</span>
              <span className="text-[10px] text-slate-400">刚提交了一条担心</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="px-5 mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_POOL.slice(0, 6).map((preset, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePreset(preset.full)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:border-[#0052D9] hover:text-[#0052D9] transition-colors"
            >
              <span>{preset.emoji}</span>
              <span>{preset.label}</span>
            </motion.button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="说说你对 AI 面试的担忧..."
            className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0052D9] focus:ring-2 focus:ring-[#0052D9]/10 transition-all"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSubmit}
            disabled={!inputText.trim()}
            className="px-4 py-3 bg-[#0052D9] disabled:bg-slate-300 text-white rounded-xl transition-colors"
          >
            <Send size={18} />
          </motion.button>
        </div>
      </div>

      {state.activeBoxes.length > 0 && (
        <div className="px-5 mb-4">
          <h3 className="text-sm font-bold text-slate-800 mb-3">🔍 已匹配的黑箱话题</h3>
          <div className="space-y-2">
            {state.activeBoxes.slice(0, 3).map((box) => (
              <motion.button
                key={box.keyword}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleKeywordClick(box.keyword)}
                className="w-full flex items-center gap-3 p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl text-left hover:from-slate-800 hover:to-slate-700 transition-all"
              >
                <span className="text-xl">{box.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{box.question}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{box.freq} 人关注</p>
                </div>
                <span className="text-[#0052D9] text-xs font-bold bg-white/10 px-2 py-1 rounded-full">
                  去爆破 →
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
