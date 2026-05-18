"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import WordCloud from "@/components/WordCloud";
import WorryTicker from "@/components/WorryTicker";
import { loadState, onStateChange } from "@/lib/client-state";
import { getKeywordFrequencies } from "@/lib/data";

export default function ScreenHomePage() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState(() => loadState());

  useEffect(() => {
    return onStateChange((s) => setState(s));
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <div className="min-h-screen bg-white" />;
  }

  const keywords = getKeywordFrequencies(state.worries);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <span className="text-6xl mb-4 block">🐧</span>
        <h1 className="text-4xl font-black text-[#1D2129] tracking-wider">懂面鹅</h1>
        <p className="text-lg text-[#6B7187] mt-2 tracking-widest">你的 AI 面试专属解惑官</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-8 mb-8"
      >
        <div className="text-center">
          <p className="text-4xl font-black text-[#0052D9]">{state.worries.length}</p>
          <p className="text-sm text-[#6B7187]">累计心里话</p>
        </div>
        <div className="w-px h-12 bg-[#E5E7EB]" />
        <div className="text-center">
          <p className="text-4xl font-black text-[#0052D9]">{keywords.length}</p>
          <p className="text-sm text-[#6B7187]">关键词</p>
        </div>
      </motion.div>

      {/* Word Cloud */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-2xl mb-8"
      >
        <WordCloud words={keywords.map(([k, v]) => ({ text: k, freq: v }))} />
      </motion.div>

      {/* Ticker */}
      <div className="w-full max-w-2xl">
        <WorryTicker worries={state.worries} />
      </div>

      {/* QR hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 text-sm text-[#6B7187]"
      >
        扫码说出你的 AI 面试担忧
      </motion.p>
    </div>
  );
}
