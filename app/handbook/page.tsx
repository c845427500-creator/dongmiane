"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, BookOpen, Lock, Sparkles, Target, TrendingUp, ArrowUp, Download, Camera } from "lucide-react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import HandbookCard from "@/components/HandbookCard";
import { loadState, onStateChange } from "@/lib/client-state";
import { BLACK_BOX_BANK, getActiveBoxes, getKeywordFrequencies } from "@/lib/data";
import { generateHandbook, generateCardConclusion, type HandbookResult } from "@/lib/deepseek-client";

type FilterMode = "all" | "revealed" | "unrevealed";

export default function HandbookPage() {
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState(() => loadState());
  const [activeCard, setActiveCard] = useState<string | null>(null);
  const [shared, setShared] = useState(false);
  const [handbookData, setHandbookData] = useState<HandbookResult | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [cardAIConclusions, setCardAIConclusions] = useState<Record<string, string>>({});
  const [loadingCardAI, setLoadingCardAI] = useState<Record<string, boolean>>({});
  const [showPoster, setShowPoster] = useState(false);
  const posterCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return onStateChange((s) => setState(s));
  }, []);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Scroll listener for back-to-top button
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const boxes = state.activeBoxes.length > 0
    ? state.activeBoxes
    : getActiveBoxes(getKeywordFrequencies(state.worries));

  // Count actually revealed (拆开) black boxes
  const revealedCount = Object.values(state.rounds).filter((r) => r.revealed).length;
  const hasEnoughData = revealedCount >= 2;
  const totalCount = boxes.length || Object.keys(BLACK_BOX_BANK).length;

  // Progress ring values
  const progress = totalCount > 0 ? revealedCount / totalCount : 0;
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference * (1 - progress);

  const isRevealed = (keyword: string) => state.rounds[keyword]?.revealed === true;

  // Filter boxes
  const filteredBoxes = useMemo(() => {
    if (filter === "revealed") return boxes.filter((b) => isRevealed(b.keyword));
    if (filter === "unrevealed") return boxes.filter((b) => !isRevealed(b.keyword));
    return boxes;
  }, [boxes, filter, state.rounds]);

  // Handle card click — trigger AI conclusion
  const handleCardClick = async (keyword: string) => {
    const isActive = activeCard === keyword;
    if (isActive) {
      setActiveCard(null);
      return;
    }
    setActiveCard(keyword);

    // If already loaded or not revealed, skip
    if (cardAIConclusions[keyword] || !isRevealed(keyword)) return;

    const testResult = state.testResults[keyword];
    if (!testResult?.original_answer) return;

    setLoadingCardAI((prev) => ({ ...prev, [keyword]: true }));
    try {
      const box = boxes.find((b) => b.keyword === keyword);
      const result = await generateCardConclusion(keyword, box?.question || keyword, {
        original_answer: testResult.original_answer,
        followup_answers: testResult.followup_answers,
        followup_qa_pairs: testResult.followup_qa_pairs,
        score: testResult.score,
        comment: testResult.comment,
      });
      if (result) {
        setCardAIConclusions((prev) => ({ ...prev, [keyword]: result }));
      }
    } catch {
      // silent
    } finally {
      setLoadingCardAI((prev) => ({ ...prev, [keyword]: false }));
    }
  };

  // Generate personalized handbook
  const handleGenerateHandbook = async () => {
    setLoadingAI(true);
    try {
      const completedTopics = boxes
        .filter((b) => isRevealed(b.keyword))
        .map((b) => ({
          keyword: b.keyword,
          score: state.testResults[b.keyword]?.total_score ?? state.testResults[b.keyword]?.score,
        }));

      const allScores: Record<string, number> = {};
      for (const t of completedTopics) {
        if (t.score !== undefined) {
          allScores[t.keyword] = t.score;
        }
      }

      // Pass test results for more personalized content
      const result = await generateHandbook(completedTopics, allScores);
      setHandbookData(result);
    } catch {
      // Silent fail
    } finally {
      setLoadingAI(false);
    }
  };

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

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // Stagger animation variants
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  if (!hydrated) {
    return <div className="min-h-screen" style={{ background: "#EEE" }} />;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "#EEE" }}>
      {/* Header */}
      <div className="pt-8 px-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">📖 干货手册</h1>
            <p className="text-xs mt-0.5" style={{ color: "rgba(0,0,0,0.5)" }}>
              懂面鹅为你生成了专属的 AI 面试通关手册
            </p>
          </div>
          <div className="flex items-center gap-2">
            {revealedCount > 0 && (
              <button
                onClick={() => setShowPoster(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0052D9] text-white rounded-lg text-xs font-medium hover:bg-[#366EF4] transition-colors"
              >
                <Camera size={14} /> 专属海报
              </button>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors border border-slate-200"
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
            >
              {shared ? (
                "链接复制好啦!"
              ) : (
                <>
                  <Share2 size={14} /> 安利给朋友
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats with Progress Ring */}
      <div className="px-5 mb-4">
        <div className="flex items-center gap-4 p-3 bg-white border border-[#E8E8E8] rounded-lg"
          style={{ boxShadow: "0 1px 10px rgba(0,0,0,0.05)" }}>
          {/* Progress ring */}
          <div className="relative flex-shrink-0">
            <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
              {/* Background circle */}
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="5"
              />
              {/* Progress circle */}
              <circle
                cx="32" cy="32" r="28"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#0052D9" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-slate-700">{revealedCount}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800">
              已拆开 {revealedCount} / {totalCount} 个黑箱
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {progress >= 1
                ? "全部拆开！你是 AI 面试专家 🎉"
                : progress >= 0.5
                ? "过半啦，继续加油 💪"
                : "去实测拆开更多黑箱来解锁卡片"}
            </p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      {boxes.length > 0 && (
        <div className="px-5 mb-4">
          <div className="flex gap-1.5 p-1 bg-white rounded-lg border border-[#E8E8E8]"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
            {([
              ["all", "全部"],
              ["revealed", `已拆开 (${revealedCount})`],
              ["unrevealed", `未拆开 (${totalCount - revealedCount})`],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  filter === mode
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI Personalized Handbook */}
      {hasEnoughData && !handbookData && !loadingAI && (
        <div className="px-5 mb-4">
          <button
            onClick={handleGenerateHandbook}
            className="w-full flex items-center justify-center gap-2 p-3.5 bg-white border border-[#E8E8E8] rounded-lg hover:border-[#0052D9]/30 transition-all"
            style={{ boxShadow: "0 1px 10px rgba(0,0,0,0.05)" }}
          >
            <Sparkles size={16} className="text-[#0052D9]" />
            <span className="text-sm font-semibold text-[#0052D9]">
              生成专属通关攻略
            </span>
            <span className="text-[10px] text-slate-400">
              （基于你 {revealedCount} 个已拆黑箱的实测数据）
            </span>
          </button>
        </div>
      )}

      {/* Loading AI handbook */}
      {loadingAI && (
        <div className="px-5 mb-4">
          <div className="bg-white border border-[#E8E8E8] rounded-lg p-5"
            style={{ boxShadow: "0 1px 10px rgba(0,0,0,0.05)" }}>
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-4 h-4 rounded-full bg-[#0052D9]"
              />
              <span className="text-xs text-slate-400">懂面鹅正在为你写专属攻略...</span>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 bg-slate-50 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Handbook Result */}
      <AnimatePresence>
        {handbookData && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="px-5 mb-4"
          >
            <div className="bg-white border border-[#E8E8E8] rounded-lg p-5"
              style={{ boxShadow: "0 1px 10px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-[#0052D9]" />
                <span className="text-sm font-semibold text-slate-800">你的专属通关攻略</span>
              </div>

              {/* Strength */}
              {handbookData.strength_dimension && (
                <div className="mb-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp size={14} className="text-green-600" />
                    <span className="text-[11px] font-semibold text-green-700">
                      你的高光维度：{handbookData.strength_dimension}
                    </span>
                  </div>
                  <p className="text-xs text-green-800 leading-relaxed">{handbookData.strength_analysis}</p>
                </div>
              )}

              {/* Weakness */}
              {handbookData.weakness_dimension && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Target size={14} className="text-amber-600" />
                    <span className="text-[11px] font-semibold text-amber-700">
                      还能更强的地方：{handbookData.weakness_dimension}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">{handbookData.weakness_analysis}</p>
                </div>
              )}

              {/* Improvement plan */}
              {handbookData.improvement_plan && (
                <div className="mb-3 p-3 bg-[#F2F3FF] border border-[#0052D9]/10 rounded-lg">
                  <p className="text-[11px] font-semibold text-[#0052D9] mb-1">📋 STAR 练习清单</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{handbookData.improvement_plan}</p>
                </div>
              )}

              {/* Value assessment */}
              {handbookData.value_assessment && (
                <div className="mb-3 p-3 bg-slate-50 border border-[#E8E8E8] rounded-lg">
                  <p className="text-[11px] font-semibold text-slate-600 mb-1">⭐ 价值观对齐</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{handbookData.value_assessment}</p>
                </div>
              )}

              {/* Encouragement */}
              {handbookData.encouragement && (
                <div className="p-3 bg-[#0052D9] rounded-lg">
                  <p className="text-xs text-white font-semibold leading-relaxed text-center">
                    {handbookData.encouragement}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards Grid */}
      <div className="px-5">
        {/* Empty state */}
        {boxes.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-4">
              <Lock size={36} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">手册还是空的</p>
            <p className="text-xs text-slate-400 mb-6">
              去首页提交你的 AI 面试担忧，拆解黑箱后就能解锁卡片
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
            >
              去首页拆黑箱
            </Link>
          </motion.div>
        )}

        {/* Filter empty state */}
        {boxes.length > 0 && filteredBoxes.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-3">
              {filter === "revealed" ? (
                <Lock size={28} className="text-slate-300" />
              ) : (
                <BookOpen size={28} className="text-slate-300" />
              )}
            </div>
            <p className="text-sm text-slate-500">
              {filter === "revealed" ? "还没有拆开任何黑箱" : "所有黑箱都已拆开 🎉"}
            </p>
          </motion.div>
        )}

        {/* Card grid */}
        <motion.div
          key={filter}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredBoxes.map((box) => {
              const round = state.rounds[box.keyword];
              const testResult = state.testResults[box.keyword];
              return (
              <HandbookCard
                key={box.keyword}
                keyword={box.keyword}
                emoji={box.emoji}
                title={box.question}
                truth={box.truth}
                testConclusion={box.testConclusion}
                proStance={box.proStance}
                conStance={box.conStance}
                unlocked={isRevealed(box.keyword)}
                isActive={activeCard === box.keyword}
                onClick={() => handleCardClick(box.keyword)}
                userVote={round?.userVote}
                correctAnswer={box.correct}
                options={box.options}
                testResult={testResult}
                aiConclusion={cardAIConclusions[box.keyword]}
                aiConclusionLoading={loadingCardAI[box.keyword]}
              />
            )})}
          </AnimatePresence>

          {/* Fallback for revealed cards not in active boxes */}
          {boxes.length === 0 && revealedCount > 0 && (
            Object.entries(BLACK_BOX_BANK)
              .filter(([kw]) => isRevealed(kw))
              .map(([kw, info]) => {
                const round = state.rounds[kw];
                return (
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
                  onClick={() => handleCardClick(kw)}
                  userVote={round?.userVote}
                  correctAnswer={info.correct}
                  options={info.options}
                />
              )})
          )}
        </motion.div>
      </div>

      {/* Back to top FAB */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed right-5 bottom-24 z-40 w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.1)" }}
          >
            <ArrowUp size={18} className="text-slate-500" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Poster Modal */}
      <AnimatePresence>
        {showPoster && (() => {
          const totalScore = Object.values(state.testResults).reduce((sum, t) => sum + (t.score || t.total_score || 0), 0);
          const avgScore = revealedCount > 0 ? Math.round(totalScore / revealedCount) : 0;
          const topTopics = Object.entries(state.testResults)
            .filter(([kw]) => isRevealed(kw))
            .sort(([, a], [, b]) => (b.score || b.total_score || 0) - (a.score || a.total_score || 0))
            .slice(0, 3)
            .map(([kw]) => kw);

          const handleDownloadPoster = () => {
            const canvas = posterCanvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;
            const w = 400;
            const h = 600;
            canvas.width = w;
            canvas.height = h;

            // Background gradient
            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, "#0052D9");
            grad.addColorStop(0.5, "#366EF4");
            grad.addColorStop(1, "#722ED1");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Decorative circles
            ctx.fillStyle = "rgba(255,255,255,0.08)";
            ctx.beginPath(); ctx.arc(320, 80, 120, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(60, 500, 90, 0, Math.PI * 2); ctx.fill();

            // Title
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 32px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("📖 懂面鹅 · 干货手册", w / 2, 70);

            // Subtitle
            ctx.font = "14px sans-serif";
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.fillText("我的 AI 面试通关记录", w / 2, 100);

            // Stats card
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.beginPath(); ctx.roundRect(30, 130, 340, 100, 16); ctx.fill();
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 48px sans-serif";
            ctx.fillText(String(revealedCount), 120, 195);
            ctx.font = "14px sans-serif";
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.fillText("已拆开黑箱", 120, 215);
            ctx.font = "bold 48px sans-serif";
            ctx.fillStyle = "#FFFFFF";
            ctx.fillText(String(avgScore), 280, 195);
            ctx.font = "14px sans-serif";
            ctx.fillStyle = "rgba(255,255,255,0.7)";
            ctx.fillText("平均评分", 280, 215);

            // Top topics
            if (topTopics.length > 0) {
              ctx.fillStyle = "rgba(255,255,255,0.15)";
              ctx.beginPath(); ctx.roundRect(30, 250, 340, 80, 16); ctx.fill();
              ctx.fillStyle = "#FFFFFF";
              ctx.font = "bold 16px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText("我的高光话题", w / 2, 280);
              ctx.font = "12px sans-serif";
              ctx.fillStyle = "rgba(255,255,255,0.8)";
              topTopics.forEach((kw, i) => {
                ctx.fillText(`#${kw}`, 60 + i * 110, 310);
              });
            }

            // Quote
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.beginPath(); ctx.roundRect(30, 350, 340, 80, 16); ctx.fill();
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "16px sans-serif";
            ctx.textAlign = "center";
            const quotes = [
              "每个黑箱拆开后，都是一次成长",
              "AI 面试不可怕，可怕的是不了解它",
              "知己知彼，百战不殆",
              "拆得越多，懂得越深",
            ];
            ctx.fillText(quotes[revealedCount % quotes.length], w / 2, 395);

            // Footer
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.font = "11px sans-serif";
            ctx.fillText("来自 懂面鹅 dongmiane.vercel.app", w / 2, 560);
            ctx.fillText(new Date().toLocaleDateString("zh-CN"), w / 2, 580);

            // Download
            const link = document.createElement("a");
            link.download = `懂面鹅-干货手册-${new Date().toISOString().slice(0, 10)}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
          };

          return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-5"
            onClick={() => setShowPoster(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
            >
              {/* Poster visual */}
              <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0052D9, #366EF4, #722ED1)" }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/8 rounded-full translate-y-1/3 -translate-x-1/3" />
                <div className="relative z-10 p-6 text-center">
                  <p className="text-2xl mb-1">📖</p>
                  <p className="text-xl font-bold text-white">懂面鹅 · 干货手册</p>
                  <p className="text-xs text-white/60 mt-1">我的 AI 面试通关记录</p>

                  {/* Stats */}
                  <div className="flex gap-3 mt-5">
                    <div className="flex-1 py-3 px-4 bg-white/15 rounded-xl">
                      <p className="text-3xl font-black text-white">{revealedCount}</p>
                      <p className="text-[10px] text-white/60 mt-0.5">已拆开黑箱</p>
                    </div>
                    <div className="flex-1 py-3 px-4 bg-white/15 rounded-xl">
                      <p className="text-3xl font-black text-white">{avgScore}</p>
                      <p className="text-[10px] text-white/60 mt-0.5">平均评分</p>
                    </div>
                  </div>

                  {/* Top topics */}
                  {topTopics.length > 0 && (
                    <div className="mt-3 py-3 px-4 bg-white/10 rounded-xl">
                      <p className="text-[10px] text-white/50 mb-1.5">高光话题</p>
                      <div className="flex gap-2 justify-center">
                        {topTopics.map((kw) => (
                          <span key={kw} className="px-2.5 py-1 bg-white/20 rounded-full text-xs text-white font-medium">
                            #{kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Motto */}
                  <p className="text-sm text-white/70 mt-4 italic">
                    "每个黑箱拆开后，都是一次成长"
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 flex gap-2">
                <button
                  onClick={handleDownloadPoster}
                  className="flex-1 py-2.5 bg-[#0052D9] text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-1.5 hover:bg-[#366EF4] transition-colors"
                >
                  <Download size={14} /> 下载海报
                </button>
                <button
                  onClick={() => setShowPoster(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200 transition-colors"
                >
                  关闭
                </button>
              </div>

              <canvas ref={posterCanvasRef} className="hidden" />
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
