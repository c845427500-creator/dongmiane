"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, RefreshCw, Shuffle, Key, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import WorryTicker from "@/components/WorryTicker";
import BottomNav from "@/components/BottomNav";
import ApiKeyModal from "@/components/ApiKeyModal";
import {
  loadState,
  addWorry,
  setActiveBoxes,
  setActiveKeyword,
  onStateChange,
  resetState,
} from "@/lib/client-state";
import {
  PRESET_POOL,
  BLACK_BOX_BANK,
  getKeywordFrequencies,
  getActiveBoxes,
  generateLocalBlackBox,
  isSimilarToAny,
} from "@/lib/data";
import { matchTopic, generateEmpathy, generateDynamicBlackBox, type TopicMatchResult } from "@/lib/deepseek-client";

export default function HomePage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState(() => loadState());
  const [inputText, setInputText] = useState("");
  const [matching, setMatching] = useState(false);
  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [matchResult, setMatchResult] = useState<TopicMatchResult | null>(null);
  const [empathyText, setEmpathyText] = useState("");
  const [showEmpathy, setShowEmpathy] = useState(false);
  const [presetOffset, setPresetOffset] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return onStateChange((s) => {
      setState(s);
    });
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const keywords = getKeywordFrequencies(state.worries);
  const totalWorries = state.worries.length;

  const handleSubmit = useCallback(async () => {
    const text = inputText.trim();
    if (!text) return;

    setMatching(true);
    setMatchResult(null);
    setEmpathyText("");
    setShowEmpathy(false);
    const newState = addWorry(state, text);
    setState(newState);
    setInputText("");

    // AI empathy + topic matching + dynamic black box — all in parallel
    const [empathyResult, matchResultData, dynamicResult] = await Promise.allSettled([
      generateEmpathy(text),
      matchTopic(text),
      generateDynamicBlackBox(text),
    ]);

    // Empathy
    if (empathyResult.status === "fulfilled" && empathyResult.value) {
      setEmpathyText(empathyResult.value);
      setShowEmpathy(true);
    }

    // Collect all boxes: predefined matches + AI-generated custom box
    let matchedBoxes: typeof state.activeBoxes = [];
    const matchTopics: string[] = [];

    if (matchResultData.status === "fulfilled") {
      const topics = matchResultData.value.matched_topics || [];
      matchTopics.push(...topics);
      matchedBoxes = topics
        .filter((t) => BLACK_BOX_BANK[t])
        .map((t) => {
          const entry = BLACK_BOX_BANK[t];
          return {
            keyword: t,
            question: entry.q,
            emoji: entry.emoji,
            options: entry.options,
            correct: entry.correct,
            optionLean: entry.option_lean,
            truth: entry.truth,
            proStance: entry["正方"],
            conStance: entry["反方"],
            testQuestion: entry.test_question,
            testConclusion: entry.test_conclusion,
            freq: 0,
          };
        });
    } else {
      // Fallback to keyword-based matching
      const freshKeywords = getKeywordFrequencies(newState.worries);
      matchedBoxes = getActiveBoxes(freshKeywords);
    }

    // AI-generated custom black box (always attempted in parallel)
    if (dynamicResult.status === "fulfilled" && dynamicResult.value) {
      const d = dynamicResult.value;
      const dynBox = {
        keyword: d.keyword,
        question: d.question,
        emoji: d.emoji,
        options: d.options,
        correct: d.correct,
        optionLean: d.option_lean,
        truth: d.truth,
        proStance: d.proStance,
        conStance: d.conStance,
        testQuestion: d.test_question,
        testConclusion: d.test_conclusion,
        freq: 0,
      };
      // Avoid duplicate with predefined match
      const existingKeys = new Set(matchedBoxes.map((b) => b.keyword));
      if (!existingKeys.has(d.keyword)) {
        matchedBoxes.push(dynBox);
      }
      matchTopics.push(d.keyword);
    }

    // Ultimate fallback: local template-based black box (no API key needed)
    if (matchedBoxes.length === 0) {
      const local = generateLocalBlackBox(text);
      matchedBoxes = [local];
      matchTopics.push(local.keyword);
    }

    // Show match result
    setMatchResult({
      matched_topics: matchTopics,
      guidance: matchedBoxes.length > 1
        ? `懂面鹅发现了 ${matchedBoxes.length} 个和你担忧相关的黑箱，去拆开看看吧`
        : `懂面鹅为你的担忧生成了一个专属黑箱：${matchedBoxes[0]?.question || ""}`,
    });

    if (matchedBoxes.length > 0) {
      const existing = newState.activeBoxes || [];
      const existingKeys = existing.map((b) => b.keyword);
      const newOnes = matchedBoxes.filter((b) => !isSimilarToAny(b.keyword, existingKeys));
      const merged = [...existing, ...newOnes];
      const updatedState = setActiveBoxes(newState, merged);
      setState(updatedState);
    }

    setMatching(false);
  }, [inputText, state]);

  const handlePreset = (text: string) => {
    setInputText(text);
    inputRef.current?.focus();
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="min-h-screen pb-24 relative bg-white">
      {/* Hero 浅蓝→白渐变 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[320px] -z-10"
        style={{ background: "linear-gradient(180deg, #E8F3FF 0%, #FFFFFF 100%)" }}
      />

      <div className="pt-10 px-5 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-5xl animate-penguin-bounce inline-block">🐧</span>
          <div className="flex-1">
            <h1 className="text-[28px] font-bold tracking-tight leading-tight" style={{ color: "#1D2129" }}>懂面鹅</h1>
            <p className="text-xs tracking-wide mt-0.5" style={{ color: "#6B7187" }}>拆穿 AI 面试那些不能说的秘密</p>
          </div>
          <button
            onClick={() => setApiKeyModal(true)}
            className="p-2 rounded-full hover:bg-[#E8F3FF] transition-colors"
            title="配置 API Key"
          >
            <Key size={18} className="text-[#6B7187]" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-center gap-6 px-4 py-4 bg-white rounded-xl border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,82,217,0.06)]">
          <div className="text-center">
            <p className="text-2xl font-black text-[#0052D9] tabular-nums">{totalWorries}</p>
            <p className="text-[10px] text-[#6B7187] mt-0.5">条心里话</p>
          </div>
          <div className="w-px h-8 bg-[#E5E7EB]" />
          <div className="text-center">
            <p className="text-2xl font-black text-[#FF7D00] tabular-nums">{keywords.length}</p>
            <p className="text-[10px] text-[#6B7187] mt-0.5">个关键词</p>
          </div>
          <div className="w-px h-8 bg-[#E5E7EB]" />
          <div className="text-center">
            <p className="text-2xl font-black text-[#00B42A] tabular-nums">{Object.keys(state.rounds).filter(k => state.rounds[k]?.revealed).length}</p>
            <p className="text-[10px] text-[#6B7187] mt-0.5">已拆黑箱</p>
          </div>
        </div>
      </div>

      <div className="px-5 mb-4">
        <WorryTicker worries={state.worries} />
      </div>

      {/* Welcome / empty state — shown when no active interaction */}
      <AnimatePresence>
        {!matching && !matchResult && !showEmpathy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-5 mb-5"
          >
            <div className="text-center py-6">
              <motion.div
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="text-5xl mb-3 inline-block"
              >
                🐧
              </motion.div>
              <p className="text-sm font-semibold text-[#1D2129] mb-1">来，说说你在担心什么</p>
              <p className="text-xs text-[#6B7187]">每个 AI 面试的焦虑背后，都藏着一个可以拆开的黑箱</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Match Result */}
      <AnimatePresence>
        {matchResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-5 mb-4"
          >
            <div className="relative flex items-start gap-2.5 px-3.5 py-2.5 bg-[#E8F3FF] border border-[#B5C7FF] rounded-lg">
              <Bot size={14} className="text-[#0052D9] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold tracking-tight" style={{ color: "#0052D9" }}>
                  懂面鹅感知到的话题：{matchResult.matched_topics?.join("、") || "暂时没线索"}
                </p>
                {matchResult.guidance && (
                  <p className="text-[11px] mt-0.5" style={{ color: "#6B7187" }}>{matchResult.guidance}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matching indicator */}
      <AnimatePresence>
        {matching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-5 mb-4"
          >
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-lg">
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1, 0.85] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-[#0052D9]"
              />
              <span className="text-[11px] tracking-tight" style={{ color: "#6B7187" }}>懂面鹅正在读你的心事...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empathy response + CTA to /qa */}
      <AnimatePresence>
        {showEmpathy && empathyText && !matching && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="px-5 mb-4"
          >
            <div className="bg-[#E8F3FF] border border-[#B5C7FF] rounded-lg p-4">
              <div className="flex items-start gap-2.5">
                <span className="text-2xl mt-0.5">🐧</span>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed" style={{ color: "#1D2129" }}>{empathyText}</p>
                </div>
              </div>
            </div>
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                // Reset active keyword so the user always starts at Phase 1 (selection grid)
                const reset = setActiveKeyword(state, "");
                setState(reset);
                router.push("/qa");
              }}
              className="w-full mt-3 py-3 bg-[#0052D9] text-white font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#366EF4] transition-colors"
              style={{ height: 44 }}
            >
              拆个黑箱，看看到底怎么回事
              <ArrowRight size={16} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>


      <div className="px-5 mb-4">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[11px] font-semibold tracking-wide" style={{ color: "#6B7187" }}>
            💡 没灵感？戳一个
          </p>
          <div className="flex items-center gap-1.5">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setPresetOffset((o) => (o + 3) % PRESET_POOL.length)}
              className="flex items-center gap-1 px-2 py-1 bg-white border border-[#E5E7EB] rounded-full text-[10px] font-medium hover:border-[#0052D9] hover:text-[#0052D9] transition-colors"
              style={{ color: "#6B7187" }}
              title="换一批"
            >
              <Shuffle size={10} />
              换一批
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                const fresh = resetState();
                setState(fresh);
                setMatchResult(null);
              }}
              className="flex items-center gap-1 px-2 py-1 bg-white border border-[#E5E7EB] rounded-full text-[10px] font-medium hover:border-[#D54941] hover:text-[#D54941] transition-colors"
              style={{ color: "#6B7187" }}
              title="清空重来"
            >
              <RefreshCw size={10} />
              清空
            </motion.button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {Array.from({ length: 6 }, (_, i) => PRESET_POOL[(presetOffset + i) % PRESET_POOL.length]).map((preset, i) => (
            <motion.button
              key={`${presetOffset}-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePreset(preset.full)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-full text-xs hover:border-[#0052D9] hover:text-[#0052D9] transition-colors"
              style={{ color: "#6B7187" }}
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
            placeholder="AI 面试到底哪里让你不放心？说说看…"
            className="flex-1 px-4 py-3 bg-white border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:border-[#0052D9] focus:ring-2 focus:ring-[#0052D9]/15 transition-all"
            style={{ height: 44, color: "#1D2129" }}
          />
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleSubmit}
            disabled={!inputText.trim()}
            className="px-5 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{
              height: 44,
              background: inputText.trim() ? "#0052D9" : "#B5C7FF",
            }}
          >
            <Send size={18} />
          </motion.button>
        </div>
      </div>

      <BottomNav />

      <ApiKeyModal open={apiKeyModal} onClose={() => setApiKeyModal(false)} />
    </div>
  );
}
