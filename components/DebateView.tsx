"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, MessageSquare, Loader2, AlertCircle, Quote } from "lucide-react";
import { generateDebate } from "@/lib/deepseek-client";

interface Props {
  topic: string;
  proStance: string;
  conStance: string;
  keyword: string;
}

export default function DebateView({ topic, proStance, conStance, keyword }: Props) {
  const [debate, setDebate] = useState<{ pro: string; con: string; goldenQuote: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDebate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateDebate(topic, proStance, conStance);
      setDebate(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "生成失败";
      setError(msg === "NO_API_KEY" ? "请先配置 API Key" : msg);
    } finally {
      setLoading(false);
    }
  }, [topic, proStance, conStance]);

  useEffect(() => {
    loadDebate();
  }, [loadDebate]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Swords size={20} className="text-[#0052D9]" />
        <h3 className="text-base font-bold text-slate-800">AI 辩论进行中</h3>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="text-[#0052D9] animate-spin" />
          <span className="ml-3 text-sm text-slate-500">AI 正在生成辩论...</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={18} className="text-red-400" />
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={loadDebate}
            className="ml-auto text-xs text-red-500 underline"
          >
            重试
          </button>
        </div>
      )}

      {/* Debate content */}
      <AnimatePresence>
        {debate && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex gap-3 p-4 bg-green-50 rounded-xl border border-green-100"
            >
              <MessageSquare size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-green-600 mb-1">✅ 正方</p>
                <p className="text-sm text-green-800 leading-relaxed">{debate.pro}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex gap-3 p-4 bg-red-50 rounded-xl border border-red-100"
            >
              <MessageSquare size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-bold text-red-600 mb-1">🔴 反方</p>
                <p className="text-sm text-red-800 leading-relaxed">{debate.con}</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex gap-2.5 p-4 bg-[#E8F3FF] rounded-xl border border-[#0052D9]/10"
            >
              <Quote size={18} className="text-[#0052D9] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#0052D9] font-medium italic">「{debate.goldenQuote}」</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
