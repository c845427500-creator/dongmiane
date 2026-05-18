"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Sparkles, Target, Lightbulb, ChevronDown, ChevronUp, Wand2, Star, TrendingUp } from "lucide-react";
import type { TestResult } from "@/lib/data";
import type { InterviewScoreResult } from "@/lib/deepseek-client";

interface ScoreProps {
  logic: number;
  content: number;
  fluency: number;
  comment: string;
  truth?: string;
  mechanism?: string;
  streaming?: string;
  // BBSI 4-dimension
  bbsiResult?: TestResult;
  // Flexible interview scoring (non-BBSI)
  interviewResult?: InterviewScoreResult;
  onRewrite?: () => void;
  rewriteLoading?: boolean;
  rewriteResult?: { rewritten: string; diff: { original: string; rewritten: string; reason: string }[] } | null;
}

const DIM_LABELS: Record<string, string> = {
  logical_thinking: "逻辑思维",
  problem_solving: "问题解决",
  communication_collaboration: "沟通协作",
  value_alignment: "价值观匹配",
};

const DIM_ICONS: Record<string, string> = {
  logical_thinking: "🧠",
  problem_solving: "🔧",
  communication_collaboration: "🤝",
  value_alignment: "⭐",
};

const BARS_LEVELS: Record<number, { label: string; color: string; bg: string }> = {
  10: { label: "卓越", color: "#0052D9", bg: "#F2F3FF" },
  6: { label: "良好", color: "#366EF4", bg: "#E8F3FF" },
  3: { label: "基础", color: "#E37318", bg: "#FFF1E9" },
  0: { label: "不足", color: "#D54941", bg: "#FFF0ED" },
};

function scoreToGrade(score: number): { grade: string; color: string; bg: string } {
  if (score >= 90) return { grade: "A", color: "#00B42A", bg: "#E8FFEA" };
  if (score >= 80) return { grade: "B", color: "#0052D9", bg: "#F2F3FF" };
  if (score >= 70) return { grade: "C", color: "#0096FF", bg: "#E8F3FF" };
  if (score >= 60) return { grade: "D", color: "#FF7D00", bg: "#FFF1E9" };
  if (score >= 40) return { grade: "E", color: "#F5319D", bg: "#FFF0F5" };
  return { grade: "F", color: "#D54941", bg: "#FFF0ED" };
}

function BBSIScoreBar({
  dimKey,
  score,
  evidence,
  bars_match,
  delay,
}: {
  dimKey: string;
  score: number;
  evidence?: string;
  bars_match?: string;
  delay: number;
}) {
  const level = BARS_LEVELS[score] || BARS_LEVELS[0];
  const pct = (score / 10) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="mb-3"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{DIM_ICONS[dimKey]}</span>
          <span className="text-xs font-semibold text-slate-700">{DIM_LABELS[dimKey] || dimKey}</span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: level.color, background: level.bg }}
          >
            {level.label}
          </span>
        </div>
        <motion.span
          className="text-sm font-black"
          style={{ color: level.color }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.3, type: "spring" }}
        >
          {score}
          <span className="text-[10px] font-normal text-slate-400">/10</span>
        </motion.span>
      </div>
      <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
        <motion.div
          className="h-full rounded-sm"
          style={{ background: level.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, delay, ease: "easeOut" }}
        />
      </div>
      {evidence && (
        <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
          <span className="text-slate-300">证据：</span>
          「{evidence.length > 60 ? evidence.slice(0, 60) + "..." : evidence}」
        </p>
      )}
      {bars_match && (
        <p className="text-[10px] text-slate-400 mt-0.5">BARS: {bars_match}</p>
      )}
    </motion.div>
  );
}

export default function ScoreCard({
  logic,
  content,
  fluency,
  comment,
  truth,
  mechanism,
  streaming,
  bbsiResult,
  interviewResult,
  onRewrite,
  rewriteLoading,
  rewriteResult,
}: ScoreProps) {
  const [showDiff, setShowDiff] = useState(false);

  if (streaming) {
    return (
      <div className="bg-white border border-[#E8E8E8] rounded-md p-5">
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles size={20} className="text-[#0052D9]" />
          </motion.div>
          <p className="text-sm text-slate-500">懂面鹅正在读你的回答...</p>
        </div>
        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{streaming}</p>
      </div>
    );
  }

  // Interview scoring mode (flexible, non-template)
  if (interviewResult) {
    const dims = interviewResult.dimensions || [];
    const dimensionColors = [
      { bar: "#0052D9", bg: "#F2F3FF" },
      { bar: "#366EF4", bg: "#E8F3FF" },
      { bar: "#618DFF", bg: "#F0F4FF" },
      { bar: "#8B5CF6", bg: "#F5F3FF" },
      { bar: "#06B6D4", bg: "#ECFEFF" },
      { bar: "#F59E0B", bg: "#FFFBEB" },
    ];

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[#E8E8E8] rounded-md p-5"
        style={{ boxShadow: "0 1px 10px rgba(0,0,0,0.05), 0 4px 5px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.12)" }}
      >
        {/* Header with big score */}
        <div className="text-center mb-5">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Star size={18} className="text-[#0052D9]" />
            <span className="text-sm font-semibold text-slate-800">面试评分报告</span>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex items-baseline gap-1 mt-1"
          >
            <span className="text-5xl font-black text-[#0052D9]">{interviewResult.score}</span>
            <span className="text-sm text-slate-400">/100</span>
          </motion.div>
        </div>

        {/* Dimensions — 2 per row */}
        {dims.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mb-3">
              <TrendingUp size={12} />
              评分维度
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {dims.map((dim, i) => {
                const color = dimensionColors[i % dimensionColors.length];
                const gradeInfo = scoreToGrade(dim.score);
                return (
                  <motion.div
                    key={dim.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="rounded-xl p-3 border"
                    style={{ background: gradeInfo.bg, borderColor: `${gradeInfo.color}20` }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-slate-600">{dim.name}</span>
                      <motion.span
                        className="text-lg font-black"
                        style={{ color: gradeInfo.color }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.08, type: "spring" }}
                      >
                        {gradeInfo.grade}
                      </motion.span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">{dim.comment}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Overall comment */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-3.5 bg-slate-50 border border-[#E8E8E8] rounded-sm"
        >
          <p className="text-[11px] font-semibold text-slate-600 mb-1">懂面鹅评语</p>
          <p className="text-xs text-slate-700 leading-relaxed">{interviewResult.overall}</p>
        </motion.div>

        {/* Strengths */}
        {interviewResult.strengths && interviewResult.strengths.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-3"
          >
            <p className="text-[11px] font-semibold text-green-600 mb-1.5">做得好的地方</p>
            <div className="space-y-1">
              {interviewResult.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-green-800">
                  <span className="text-green-500 mt-0.5">+</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Improvements */}
        {interviewResult.improvements && interviewResult.improvements.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-3"
          >
            <p className="text-[11px] font-semibold text-amber-600 mb-1.5">可以更好的地方</p>
            <div className="space-y-1">
              {interviewResult.improvements.map((s, i) => (
                <div key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
                  <span className="text-amber-500 mt-0.5">~</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* AI Rewrite Coach — keep for interview mode too */}
        {onRewrite && (
          <div className="mt-3 pt-3 border-t border-[#E8E8E8]">
            {!rewriteResult ? (
              <button
                onClick={onRewrite}
                disabled={rewriteLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#F2F3FF] text-[#0052D9] rounded-sm text-xs font-semibold hover:bg-[#D9E1FF] transition-colors disabled:opacity-50"
              >
                <Wand2 size={14} />
                {rewriteLoading ? "AI 正在改写..." : "AI 帮你改一版高分答案"}
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-600">✨ AI 改写教练</span>
                  <button
                    onClick={() => setShowDiff(!showDiff)}
                    className="flex items-center gap-1 text-[10px] text-[#0052D9]"
                  >
                    {showDiff ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {showDiff ? "收起对比" : "查看逐句对比"}
                  </button>
                </div>
                <div className="p-3 bg-green-50 border border-green-100 rounded-sm">
                  <p className="text-xs text-green-900 leading-relaxed whitespace-pre-wrap">
                    {rewriteResult.rewritten}
                  </p>
                </div>
                {showDiff && rewriteResult.diff.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {rewriteResult.diff.map((d, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 border border-[#E8E8E8] rounded-sm">
                        <div className="flex gap-2 text-[11px]">
                          <span className="text-red-500 flex-shrink-0">原文：</span>
                          <span className="text-red-700">{d.original}</span>
                        </div>
                        <div className="flex gap-2 text-[11px] mt-1">
                          <span className="text-green-500 flex-shrink-0">改写：</span>
                          <span className="text-green-700">{d.rewritten}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">💡 {d.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  // BBSI mode
  if (bbsiResult?.dimensions) {
    const dims = bbsiResult.dimensions;
    const dimEntries = Object.entries(dims) as [string, { score: number; evidence?: string; bars_match?: string }][];

    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-[#E8E8E8] rounded-md p-5"
        style={{ boxShadow: "0 1px 10px rgba(0,0,0,0.05), 0 4px 5px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.12)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[#0052D9]" />
            <span className="text-sm font-semibold text-slate-800">懂面鹅评分卡</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">总分</span>
            <span className="text-xl font-black text-[#0052D9]">{bbsiResult.total_score ?? logic}</span>
            <span className="text-[11px] text-slate-400">/40</span>
          </div>
        </div>

        {/* Tencent Fit badge */}
        {bbsiResult.tencent_fit && (
          <div className="mb-4 px-3 py-1.5 bg-[#F2F3FF] rounded-sm inline-block">
            <span className="text-xs text-[#0052D9] font-semibold">
              和腾讯的契合度：{bbsiResult.tencent_fit}
            </span>
          </div>
        )}

        {/* STAR Assessment */}
        {bbsiResult.star_assessment && (
          <div className="mb-4 p-3 bg-slate-50 border border-[#E8E8E8] rounded-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <Target size={14} className="text-slate-500" />
              <span className="text-[11px] font-semibold text-slate-600">STAR 自查</span>
              <span className="text-[10px] text-slate-400 ml-auto">
                {bbsiResult.star_assessment.completeness}
              </span>
            </div>
            <div className="flex gap-2">
              {(["has_situation", "has_task", "has_action", "has_result"] as const).map((key) => {
                const label = { has_situation: "S", has_task: "T", has_action: "A", has_result: "R" }[key];
                const ok = bbsiResult.star_assessment![key];
                return (
                  <div
                    key={key}
                    className={`flex-1 text-center py-1 rounded-sm text-[10px] font-bold ${
                      ok ? "bg-[#0052D9] text-white" : "bg-slate-200 text-slate-400"
                    }`}
                    title={label}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
            {bbsiResult.star_assessment.star_constraint_applied !== "none" && (
              <p className="mt-1.5 text-[10px] text-amber-600">
                {bbsiResult.star_assessment.star_constraint_applied === "action_missing_capped_3"
                  ? "⚠️ 缺少具体行动（A），所有维度封顶 3 分"
                  : "⚠️ 缺少量化结果（R），所有维度封顶 6 分"}
              </p>
            )}
          </div>
        )}

        {/* 4 Dimension Bars */}
        <div className="mb-3">
          {dimEntries.map(([key, dim], i) => (
            <BBSIScoreBar
              key={key}
              dimKey={key}
              score={dim.score}
              evidence={dim.evidence}
              bars_match={dim.bars_match}
              delay={0.1 + i * 0.15}
            />
          ))}
        </div>

        {/* Overall comment */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-3 p-3 bg-slate-50 border border-[#E8E8E8] rounded-sm text-xs text-slate-700 leading-relaxed"
        >
          {bbsiResult.comment || comment}
        </motion.p>

        {/* Improvement suggestions */}
        {bbsiResult.improvement_suggestions && bbsiResult.improvement_suggestions.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-500">改进建议</p>
            {bbsiResult.improvement_suggestions.map((s, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                <span className="text-[#0052D9] mt-0.5">•</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* AI Rewrite Coach */}
        {onRewrite && (
          <div className="mt-3 pt-3 border-t border-[#E8E8E8]">
            {!rewriteResult ? (
              <button
                onClick={onRewrite}
                disabled={rewriteLoading}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#F2F3FF] text-[#0052D9] rounded-sm text-xs font-semibold hover:bg-[#D9E1FF] transition-colors disabled:opacity-50"
              >
                <Wand2 size={14} />
                {rewriteLoading ? "AI 正在改写..." : "AI 帮你改一版高分答案"}
              </button>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-slate-600">✨ AI 改写教练</span>
                  <button
                    onClick={() => setShowDiff(!showDiff)}
                    className="flex items-center gap-1 text-[10px] text-[#0052D9]"
                  >
                    {showDiff ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {showDiff ? "收起对比" : "查看逐句对比"}
                  </button>
                </div>
                <div className="p-3 bg-green-50 border border-green-100 rounded-sm">
                  <p className="text-xs text-green-900 leading-relaxed whitespace-pre-wrap">
                    {rewriteResult.rewritten}
                  </p>
                </div>
                {showDiff && rewriteResult.diff.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {rewriteResult.diff.map((d, i) => (
                      <div key={i} className="p-2.5 bg-slate-50 border border-[#E8E8E8] rounded-sm">
                        <div className="flex gap-2 text-[11px]">
                          <span className="text-red-500 flex-shrink-0">原文：</span>
                          <span className="text-red-700">{d.original}</span>
                        </div>
                        <div className="flex gap-2 text-[11px] mt-1">
                          <span className="text-green-500 flex-shrink-0">改写：</span>
                          <span className="text-green-700">{d.rewritten}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">💡 {d.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Truth & Mechanism */}
        {truth && (
          <div className="mt-3 p-3 bg-[#F2F3FF] border border-[#0052D9]/10 rounded-sm">
            <p className="text-[11px] font-semibold text-[#0052D9] mb-1 flex items-center gap-1">
              <Lightbulb size={12} /> 真相解读
            </p>
            <p className="text-xs text-slate-700 leading-relaxed">{truth}</p>
          </div>
        )}
        {mechanism && (
          <div className="mt-2 p-3 bg-slate-50 border border-[#E8E8E8] rounded-sm">
            <p className="text-[11px] font-semibold text-slate-600 mb-1">🔧 机制解释</p>
            <p className="text-xs text-slate-600 leading-relaxed">{mechanism}</p>
          </div>
        )}
      </motion.div>
    );
  }

  // Legacy mode (fallback when no BBSI data)
  const avg = Math.round((logic + content + fluency) / 3);
  const grade = avg >= 85 ? "A" : avg >= 75 ? "B" : avg >= 60 ? "C" : "D";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-[#E8E8E8] rounded-md p-5"
      style={{ boxShadow: "0 1px 10px rgba(0,0,0,0.05), 0 4px 5px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.12)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-[#0052D9]" />
          <span className="text-sm font-semibold text-slate-800">AI 评分报告</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xl font-black text-[#0052D9]">{avg}</span>
          <span className="text-sm font-semibold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-sm">{grade}</span>
        </div>
      </div>

      {(["逻辑条理", "内容匹配", "表达流畅"] as const).map((label, i) => {
        const vals = [logic, content, fluency];
        const colors = ["#0052D9", "#366EF4", "#618DFF"];
        return (
          <div key={label} className="mb-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-slate-600">{label}</span>
              <span className="text-sm font-bold" style={{ color: colors[i] }}>
                {vals[i]}<span className="text-[10px] font-normal text-slate-400">/100</span>
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
              <motion.div
                className="h-full rounded-sm"
                style={{ background: colors[i] }}
                initial={{ width: 0 }}
                animate={{ width: `${vals[i]}%` }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.2, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-3 p-3 bg-slate-50 rounded-sm text-xs text-slate-700 leading-relaxed"
      >
        {comment}
      </motion.p>

      {truth && (
        <div className="mt-3 p-3 bg-[#F2F3FF] border border-[#0052D9]/10 rounded-sm">
          <p className="text-[11px] font-semibold text-[#0052D9] mb-1">💡 真相解读</p>
          <p className="text-xs text-slate-700 leading-relaxed">{truth}</p>
        </div>
      )}
      {mechanism && (
        <div className="mt-2 p-3 bg-slate-50 border border-[#E8E8E8] rounded-sm">
          <p className="text-[11px] font-semibold text-slate-600 mb-1">🔧 机制解释</p>
          <p className="text-xs text-slate-600 leading-relaxed">{mechanism}</p>
        </div>
      )}
    </motion.div>
  );
}
