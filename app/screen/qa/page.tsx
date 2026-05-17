"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VoteBars from "@/components/VoteBars";
import DebateView from "@/components/DebateView";
import ExplosionAnimation from "@/components/ExplosionAnimation";
import { loadState, setPhase, setActiveKeyword, revealRound, onStateChange } from "@/lib/client-state";
import { BLACK_BOX_BANK, getActiveBoxes, getKeywordFrequencies } from "@/lib/data";

const PHASES = ["pre_vote", "debating", "testing", "post_vote", "blasted"] as const;
const PHASE_LABELS: Record<string, string> = {
  pre_vote: "拆弹预测",
  debating: "辩论进行中",
  testing: "AI 实证",
  post_vote: "立场反转",
  blasted: "爆破揭晓",
};

export default function ScreenQAPage() {
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

  const keyword = state.activeKeyword;
  const box = keyword ? BLACK_BOX_BANK[keyword] : null;
  const round = keyword ? state.rounds[keyword] : null;
  const phase = state.phase;
  const activeBoxes = state.activeBoxes;

  const currentPhaseIdx = PHASES.indexOf(phase);

  // Auto-set active keyword from boxes
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

  // Select topic for screen
  if (!keyword || !box) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-[#001a45] flex flex-col items-center justify-center p-8">
        <h1 className="text-3xl font-black text-white mb-4">💣 黑箱爆破</h1>
        <p className="text-slate-400 mb-8">选择话题开始</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
          {activeBoxes.map((b) => (
            <button
              key={b.keyword}
              onClick={() => {
                const newState = setActiveKeyword(state, b.keyword);
                setState(newState);
              }}
              className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-left hover:border-[#0052D9] transition-colors"
            >
              <span className="text-2xl">{b.emoji}</span>
              <p className="text-sm font-bold text-white mt-2">{b.question}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-[#001a45] flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{box.emoji}</span>
          <div>
            <h1 className="text-xl font-black text-white">{box.q}</h1>
            <p className="text-sm text-slate-400">阶段 {currentPhaseIdx + 1}/5 · {PHASE_LABELS[phase]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">#{keyword}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-3xl space-y-6">
          {/* Pre-vote — show voting bars */}
          {(phase === "pre_vote" || phase === "debating") && round && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-white mb-4">📊 预测投票实时分布</h3>
              <VoteBars votes={round.pre} />
            </motion.div>
          )}

          {/* Debating — show debate content */}
          {phase === "debating" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6"
            >
              <DebateView
                topic={box.q}
                proStance={box["正方"]}
                conStance={box["反方"]}
                keyword={keyword}
              />
            </motion.div>
          )}

          {/* Testing — show test results */}
          {phase === "testing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <h3 className="text-2xl font-bold text-white mb-2">🧪 AI 实测进行中</h3>
              <p className="text-slate-400 text-lg max-w-lg mx-auto whitespace-pre-wrap">
                {box.test_question}
              </p>
              {state.testResults[keyword] && (
                <div className="mt-6 p-6 bg-slate-800/50 border border-slate-700 rounded-2xl">
                  <p className="text-4xl font-black text-[#0052D9]">
                    {state.testResults[keyword].score}
                  </p>
                  <p className="text-slate-400 text-sm mt-1">全场均分</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Post-vote — show vote comparison */}
          {phase === "post_vote" && round && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">🔄 立场反转统计</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-slate-400 mb-2">预测投票</p>
                    <VoteBars votes={round.pre} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-2">反转投票</p>
                    <VoteBars votes={round.post} />
                  </div>
                </div>
              </div>
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
              <h2 className="text-3xl font-black text-white">正确答案：{["A", "B", "C", "D"][box.correct]}</h2>
              <p className="text-xl text-slate-300 mt-2">{box.options[box.correct]}</p>

              {round && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mt-4">
                  <VoteBars votes={round.pre} correctIndex={box.correct} showCorrect />
                </div>
              )}

              <div className="mt-4 p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl max-w-lg mx-auto">
                <p className="text-lg text-amber-300 leading-relaxed">{box.truth}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Control bar */}
      <div className="p-6 border-t border-slate-800 flex justify-center">
        {currentPhaseIdx < PHASES.length - 1 && (
          <button
            onClick={handleNextPhase}
            className="px-8 py-3 bg-[#0052D9] text-white font-bold rounded-xl text-lg hover:bg-[#0045B8] transition-colors"
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
              className="px-6 py-3 bg-slate-700 text-white font-bold rounded-xl"
            >
              🔄 其他黑箱
            </button>
            <button
              onClick={() => {
                setPhase(state, "pre_vote");
                setState((s) => ({ ...s, phase: "pre_vote" }));
              }}
              className="px-6 py-3 bg-red-500/20 text-red-400 font-bold rounded-xl"
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
