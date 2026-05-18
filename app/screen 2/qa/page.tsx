"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import VoteBars from "@/components/VoteBars";
import ExplosionAnimation from "@/components/ExplosionAnimation";
import { loadState, setPhase, setActiveKeyword, revealRound, onStateChange, type GameState } from "@/lib/client-state";
import { BLACK_BOX_BANK, getActiveBoxes, getKeywordFrequencies, type BlackBox } from "@/lib/data";

const PHASES: GameState["phase"][] = ["pre_vote", "testing", "blasted"];
const PHASE_LABELS: Record<string, string> = {
  pre_vote: "拆弹预测",
  testing: "AI 实测",
  blasted: "爆破揭晓",
};

export default function ScreenQAPage() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState(() => loadState());
  const [showExplosion, setShowExplosion] = useState(false);

  useEffect(() => {
    return onStateChange((s) => {
      setState(s);
      if (s.phase === "blasted") {
        setShowExplosion(true);
      }
    });
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const keyword = state.activeKeyword;
  const boxEntry = keyword ? BLACK_BOX_BANK[keyword] : null;
  const dynamicBox = !boxEntry && keyword
    ? state.activeBoxes.find(b => b.keyword === keyword)
    : null;
  const box: BlackBox | null = boxEntry
    ? {
        keyword: keyword || "",
        question: boxEntry.q,
        emoji: boxEntry.emoji,
        options: boxEntry.options,
        correct: boxEntry.correct,
        optionLean: boxEntry.option_lean,
        truth: boxEntry.truth,
        proStance: boxEntry["正方"],
        conStance: boxEntry["反方"],
        testQuestion: boxEntry.test_question,
        testConclusion: boxEntry.test_conclusion,
        freq: 0,
      }
    : dynamicBox ?? null;
  const round = keyword ? state.rounds[keyword] : null;
  const phase = state.phase;
  const activeBoxes = state.activeBoxes.length > 0
    ? state.activeBoxes
    : getActiveBoxes(getKeywordFrequencies(state.worries));

  const currentPhaseIdx = PHASES.indexOf(phase);

  useEffect(() => {
    if (!keyword && activeBoxes.length > 0) {
      const newState = setActiveKeyword(state, activeBoxes[0].keyword);
      setState(newState);
    }
  }, [keyword, activeBoxes, state]);

  const handleNextPhase = useCallback(() => {
    const idx = PHASES.indexOf(phase);
    if (idx < PHASES.length - 1) {
      const next = PHASES[idx + 1];
      const newState = setPhase(state, next);
      setState(newState);
      if (next === "blasted" && keyword) {
        setShowExplosion(true);
        revealRound(state, keyword);
      }
    }
  }, [phase, state, keyword]);

  if (!hydrated) {
    return <div className="min-h-screen bg-white" />;
  }

  // Select topic for screen
  if (!keyword || !box) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-black text-[#1D2129] mb-4">💣 黑箱爆破</h1>
        <p className="text-[#6B7187] mb-8">选择话题开始</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
          {activeBoxes.map((b) => (
            <button
              key={b.keyword}
              onClick={() => {
                const newState = setActiveKeyword(state, b.keyword);
                setState(newState);
              }}
              className="p-4 bg-white border border-[#E5E7EB] rounded-xl text-left hover:border-[#0052D9] shadow-[0_2px_12px_rgba(0,82,217,0.08)] transition-all"
            >
              <span className="text-2xl">{b.emoji}</span>
              <p className="text-sm font-bold text-[#1D2129] mt-2">{b.question}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{box.emoji}</span>
          <div>
            <h1 className="text-xl font-black text-[#1D2129]">{box.question}</h1>
            <p className="text-sm text-[#6B7187]">阶段 {currentPhaseIdx + 1}/3 · {PHASE_LABELS[phase]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#6B7187]">#{keyword}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-3xl space-y-6">
          {/* Pre-vote — show voting bars */}
          {phase === "pre_vote" && round && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,82,217,0.08)]"
            >
              <h3 className="text-lg font-bold text-[#1D2129] mb-4">📊 预测投票实时分布</h3>
              <VoteBars votes={round.pre} />
            </motion.div>
          )}

          {/* Testing — show test progress and results */}
          {phase === "testing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <h3 className="text-2xl font-bold text-[#1D2129] mb-2">🧪 AI 实测进行中</h3>
              <p className="text-[#6B7187] text-lg max-w-lg mx-auto whitespace-pre-wrap">
                {box.testQuestion}
              </p>
              {state.testResults[keyword] && (
                <div className="mt-6 p-6 bg-white border border-[#E5E7EB] rounded-2xl shadow-[0_2px_12px_rgba(0,82,217,0.08)]">
                  <p className="text-4xl font-black text-[#0052D9]">
                    {state.testResults[keyword].score}
                  </p>
                  <p className="text-[#6B7187] text-sm mt-1">全场均分</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Blasted — show truth with voting results */}
          {phase === "blasted" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="text-6xl mb-4">💣</div>
              <h2 className="text-3xl font-black text-[#1D2129]">正确答案：{["A", "B", "C", "D"][box.correct]}</h2>
              <p className="text-xl text-[#6B7187] mt-2">{box.options[box.correct]}</p>

              {round && (
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 mt-4 shadow-[0_2px_12px_rgba(0,82,217,0.08)]">
                  <VoteBars votes={round.pre} correctIndex={box.correct} showCorrect />
                </div>
              )}

              <div className="mt-4 p-6 bg-[#FFF9E6] border border-[#FF7D00]/20 rounded-2xl max-w-lg mx-auto">
                <p className="text-lg text-[#1D2129] leading-relaxed">{box.truth}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Control bar */}
      <div className="p-6 border-t border-[#E5E7EB] flex justify-center">
        {currentPhaseIdx < PHASES.length - 1 && (
          <button
            onClick={handleNextPhase}
            className="px-8 py-3 bg-[#0052D9] text-white font-bold rounded-xl text-lg hover:bg-[#366EF4] transition-colors"
          >
            ⏭ 进入下一阶段
          </button>
        )}
        {phase === "blasted" && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (activeBoxes.length > 1) {
                  const currentIdx = activeBoxes.findIndex((b) => b.keyword === keyword);
                  const nextBox = activeBoxes[(currentIdx + 1) % activeBoxes.length];
                  const newState = setActiveKeyword(state, nextBox.keyword);
                  const resetState = setPhase(newState, "pre_vote");
                  setState(resetState);
                }
              }}
              className="px-6 py-3 bg-[#E8F3FF] text-[#0052D9] font-bold rounded-xl"
            >
              🔄 其他黑箱
            </button>
            <button
              onClick={() => {
                setPhase(state, "pre_vote");
                setState((s) => ({ ...s, phase: "pre_vote" }));
              }}
              className="px-6 py-3 bg-[#FFF0ED] text-[#D54941] font-bold rounded-xl"
            >
              🔄 重置
            </button>
          </div>
        )}
      </div>

      {/* Explosion */}
      <ExplosionAnimation show={showExplosion} onComplete={() => setShowExplosion(false)}>
        <div className="text-center">
          <p className="text-5xl mb-4">💣</p>
          <p className="text-3xl font-black text-white">黑箱已爆破！</p>
          <p className="text-2xl font-bold text-[#0052D9] mt-3">
            正确答案：{["A", "B", "C", "D"][box.correct]}
          </p>
          <p className="text-lg text-white/60 mt-2 px-4">{box.options[box.correct]}</p>
        </div>
      </ExplosionAnimation>
    </div>
  );
}
