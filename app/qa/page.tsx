"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Send, Zap, Settings, Key, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import BlackBoxCard from "@/components/BlackBoxCard";
import ScoreCard from "@/components/ScoreCard";
import VoteBars from "@/components/VoteBars";
import DebateView from "@/components/DebateView";
import ExplosionAnimation from "@/components/ExplosionAnimation";
import {
  loadState,
  setPhase,
  addPreVote,
  addPostVote,
  addTestResult,
  revealRound,
  claimHandbook,
  onStateChange,
  setActiveKeyword,
} from "@/lib/client-state";
import {
  BLACK_BOX_BANK,
  getActiveBoxes,
  getKeywordFrequencies,
  type BlackBox,
  type TestResult,
} from "@/lib/data";
import { scoreAnswerStream, getApiKey, setApiKey } from "@/lib/deepseek-client";

export default function QAPage() {
  const router = useRouter();
  const [state, setState] = useState(() => loadState());
  const [apiKeyModal, setApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [testAnswer, setTestAnswer] = useState("");
  const [scoreResult, setScoreResult] = useState<TestResult | null>(null);
  const [scoreStreaming, setScoreStreaming] = useState("");
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExplosion, setShowExplosion] = useState(false);
  const [userPreVote, setUserPreVote] = useState<number | undefined>();
  const [userPostVote, setUserPostVote] = useState<number | undefined>();
  const testInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return onStateChange((s) => setState(s));
  }, []);

  const keyword = state.activeKeyword;
  const box = keyword ? BLACK_BOX_BANK[keyword] : null;
  const round = keyword ? state.rounds[keyword] : null;
  const phase = state.phase;
  const activeBoxes = state.activeBoxes;

  const currentBox: BlackBox | null = box
    ? {
        keyword: keyword || "",
        question: box.q,
        emoji: box.emoji,
        options: box.options,
        correct: box.correct,
        optionLean: box.option_lean,
        truth: box.truth,
        proStance: box["正方"],
        conStance: box["反方"],
        testQuestion: box.test_question,
        testConclusion: box.test_conclusion,
        freq: 0,
      }
    : null;

  const nextPhase = useCallback(() => {
    const phases: Array<typeof phase> = ["pre_vote", "debating", "testing", "post_vote", "blasted"];
    const idx = phases.indexOf(phase);
    if (idx < phases.length - 1) {
      const next = phases[idx + 1];
      setPhase(state, next);
      setState((s) => ({ ...s, phase: next }));
      if (next === "blasted" && keyword) {
        setShowExplosion(true);
        const newState = revealRound(state, keyword);
        setState(newState);
      }
    }
  }, [phase, state, keyword]);

  const handlePreVote = (optionIndex: number) => {
    if (!keyword || userPreVote !== undefined) return;
    setUserPreVote(optionIndex);
    const newState = addPreVote(state, keyword, optionIndex);
    setState(newState);
  };

  const handlePostVote = (optionIndex: number) => {
    if (!keyword || userPostVote !== undefined) return;
    setUserPostVote(optionIndex);
    const newState = addPostVote(state, keyword, optionIndex);
    setState(newState);
  };

  const handleSubmitTest = async () => {
    if (!testAnswer.trim() || !keyword) return;
    setScoring(true);
    setScoreResult(null);
    setScoreStreaming("");
    setError(null);

    try {
      let fullText = "";
      for await (const chunk of scoreAnswerStream(testAnswer, keyword, "")) {
        if (chunk.comment) {
          fullText += chunk.comment;
          setScoreStreaming(fullText);
        }
      }

      // Parse accumulated JSON
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const result: TestResult = {
          score: Math.round((parsed.logic + parsed.content + parsed.fluency) / 3),
          logic: parsed.logic || 0,
          content: parsed.content || 0,
          fluency: parsed.fluency || 0,
          comment: parsed.comment || "",
          truth: parsed.truth,
          mechanism: parsed.mechanism,
        };
        setScoreResult(result);
        const newState = addTestResult(state, keyword, result);
        setState(newState);
        claimHandbook(newState, keyword);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "评分失败";
      if (msg === "NO_API_KEY") {
        setApiKeyModal(true);
      } else {
        setError(msg);
      }
    } finally {
      setScoring(false);
    }
  };

  const handleSetApiKey = () => {
    setApiKey(apiKeyInput.trim());
    setApiKeyModal(false);
    setApiKeyInput("");
  };

  // Select a keyword to start
  if (!keyword || !box) {
    const available = activeBoxes.length > 0
      ? activeBoxes
      : getActiveBoxes(getKeywordFrequencies(state.worries));

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
        <div className="pt-8 px-5 pb-4">
          <h1 className="text-xl font-black text-[#0052D9]">💣 算法黑箱爆破</h1>
          <p className="text-xs text-slate-500 mt-1">选一个你关心的黑箱话题来爆破</p>
        </div>
        <div className="px-5 space-y-3">
          {available.length === 0 && (
            <div className="text-center py-12">
              <Zap size={48} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">还没匹配到黑箱话题</p>
              <p className="text-xs text-slate-300 mt-1">先去首页提交几条担忧吧</p>
            </div>
          )}
          {available.map((b) => (
            <motion.button
              key={b.keyword}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const newState = setActiveKeyword(state, b.keyword);
                setState(newState);
              }}
              className="w-full flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl text-left hover:border-[#0052D9] hover:shadow-md transition-all"
            >
              <span className="text-2xl">{b.emoji}</span>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">{b.question}</p>
                <p className="text-xs text-slate-400 mt-0.5">#{b.keyword} · {b.freq} 人关注</p>
              </div>
              <ArrowRight size={18} className="text-slate-300" />
            </motion.button>
          ))}
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center gap-3 px-5 py-3">
          <button onClick={() => {
            const newState = setActiveKeyword(state, "");
            setState(newState);
          }}>
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <div className="flex-1">
            <p className="text-[11px] text-[#0052D9] font-bold">
              阶段 {["pre_vote", "debating", "testing", "post_vote", "blasted"].indexOf(phase) + 1}/5
            </p>
            <p className="text-xs text-slate-400">
              {phase === "pre_vote" && "拆弹预测"}
              {phase === "debating" && "辩论进行中"}
              {phase === "testing" && "AI 实证"}
              {phase === "post_vote" && "立场反转"}
              {phase === "blasted" && "爆破揭晓"}
            </p>
          </div>
          <button onClick={() => setApiKeyModal(true)} className="p-2">
            <Settings size={18} className="text-slate-400" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <motion.div
            className="h-full bg-[#0052D9]"
            initial={false}
            animate={{
              width: `${((["pre_vote", "debating", "testing", "post_vote", "blasted"].indexOf(phase) + 1) / 5) * 100}%`,
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle size={16} className="text-red-400" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Phase: pre_vote */}
        {phase === "pre_vote" && currentBox && (
          <>
            <BlackBoxCard
              box={currentBox}
              revealed={false}
              phase={phase}
              onVote={handlePreVote}
              userVote={userPreVote}
            />
            {userPreVote !== undefined && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={nextPhase}
                className="w-full py-3 bg-[#0052D9] text-white font-bold rounded-xl flex items-center justify-center gap-2"
                whileTap={{ scale: 0.98 }}
              >
                进入辩论 <ArrowRight size={18} />
              </motion.button>
            )}
          </>
        )}

        {/* Phase: debating */}
        {phase === "debating" && currentBox && (
          <>
            <DebateView
              topic={box.q}
              proStance={box["正方"]}
              conStance={box["反方"]}
              keyword={keyword}
            />
            {round && (
              <div className="mt-4">
                <p className="text-xs font-bold text-slate-600 mb-2">当前预测分布</p>
                <VoteBars votes={round.pre} />
              </div>
            )}
            <button
              onClick={nextPhase}
              className="w-full py-3 bg-[#0052D9] text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              进入实测 <ArrowRight size={18} />
            </button>
          </>
        )}

        {/* Phase: testing */}
        {phase === "testing" && currentBox && (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-bold text-slate-800 mb-1">🧪 实测题</h3>
              <p className="text-sm text-slate-600 mb-4 whitespace-pre-wrap">{box.test_question}</p>
              <textarea
                ref={testInputRef}
                value={testAnswer}
                onChange={(e) => setTestAnswer(e.target.value)}
                placeholder="在此输入你的回答（建议 150-250 字）..."
                className="w-full h-36 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0052D9] resize-none"
              />
              <button
                onClick={handleSubmitTest}
                disabled={!testAnswer.trim() || scoring}
                className="w-full mt-3 py-3 bg-[#0052D9] disabled:bg-slate-300 text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                {scoring ? "评分中..." : (
                  <>
                    提交回答 <Send size={16} />
                  </>
                )}
              </button>
            </div>
            {scoreStreaming && !scoreResult && (
              <ScoreCard logic={0} content={0} fluency={0} comment="" streaming={scoreStreaming} />
            )}
            {scoreResult && (
              <ScoreCard
                logic={scoreResult.logic}
                content={scoreResult.content}
                fluency={scoreResult.fluency}
                comment={scoreResult.comment}
                truth={scoreResult.truth}
                mechanism={scoreResult.mechanism}
              />
            )}
            {scoreResult && (
              <button
                onClick={nextPhase}
                className="w-full py-3 bg-[#0052D9] text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                进入反转 <ArrowRight size={18} />
              </button>
            )}
          </>
        )}

        {/* Phase: post_vote */}
        {phase === "post_vote" && currentBox && (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="font-bold text-slate-800 mb-2">🔄 立场反转</h3>
              <p className="text-xs text-slate-500 mb-1">你的初始预测：{["A", "B", "C", "D"][userPreVote || 0]}</p>
              <p className="text-xs text-slate-500 mb-4">看完辩论和实测结果，是否改变立场？</p>
              <BlackBoxCard
                box={currentBox}
                revealed={false}
                phase={phase}
                onVote={handlePostVote}
                userVote={userPostVote}
              />
            </div>
            {userPostVote !== undefined && (
              <button
                onClick={nextPhase}
                className="w-full py-3 bg-[#0052D9] text-white font-bold rounded-xl flex items-center justify-center gap-2"
              >
                揭晓答案
              </button>
            )}
          </>
        )}

        {/* Phase: blasted */}
        {phase === "blasted" && currentBox && (
          <>
            <BlackBoxCard
              box={currentBox}
              revealed={true}
              phase={phase}
              userVote={userPreVote}
            />
            {round && (
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-bold text-slate-600 mb-2">预测投票</p>
                  <VoteBars votes={round.pre} correctIndex={box.correct} showCorrect />
                </div>
                {Object.keys(round.post).length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-600 mb-2">反转投票</p>
                    <VoteBars votes={round.post} correctIndex={box.correct} showCorrect />
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => router.push("/handbook")}
              className="w-full py-3 bg-[#0052D9] text-white font-bold rounded-xl flex items-center justify-center gap-2"
            >
              查看干货手册 → <ArrowRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* API Key Modal */}
      <AnimatePresence>
        {apiKeyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center"
            onClick={() => setApiKeyModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-t-3xl p-6 pb-10"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <Key size={20} className="text-[#0052D9]" />
                <h3 className="font-bold text-slate-800">配置 DeepSeek API Key</h3>
              </div>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0052D9] mb-3"
              />
              <p className="text-[11px] text-slate-400 mb-4">
                API Key 仅存储在你的浏览器中，用于直接调用 DeepSeek API 进行评分和辩论生成。
              </p>
              <button
                onClick={handleSetApiKey}
                className="w-full py-3 bg-[#0052D9] text-white font-bold rounded-xl"
              >
                确认
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Explosion overlay */}
      <ExplosionAnimation show={showExplosion} onComplete={() => setShowExplosion(false)}>
        <div className="text-center">
          <p className="text-4xl mb-3">💣</p>
          <p className="text-2xl font-black text-white">黑箱已爆破！</p>
          <p className="text-sm text-white/60 mt-2">正确答案揭晓</p>
        </div>
      </ExplosionAnimation>

      <BottomNav />
    </div>
  );
}
