"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key } from "lucide-react";
import { setApiKey, getApiKey } from "@/lib/deepseek-client";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ open, onClose }: Props) {
  const [apiKeyInput, setApiKeyInput] = useState("");

  const currentKey = typeof window !== "undefined" ? getApiKey() : "";

  const handleSetApiKey = () => {
    setApiKey(apiKeyInput.trim());
    setApiKeyInput("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-t-lg p-6 pb-10"
          >
            <div className="flex items-center gap-2 mb-4">
              <Key size={20} className="text-[#0052D9]" />
              <h3 className="font-semibold text-[#1D2129]">配置 API Key</h3>
            </div>

            {currentKey && (
              <div className="mb-3 px-3 py-2 bg-green-50 border border-green-100 rounded-sm text-xs text-green-700">
                已配置 Key（{currentKey.slice(0, 8)}...）
              </div>
            )}

            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-3 bg-[#F5F7FA] rounded-lg text-sm text-[#1D2129] placeholder-[#A9AEB8] focus:outline-none focus:ring-2 focus:ring-[#0052D9]/20 mb-3"
              style={{ border: "1px solid #E5E7EB" }}
            />

            <p className="text-[11px] text-[#6B7187] mb-4 leading-relaxed">
              Key 只存在你的浏览器里。懂面鹅用它直连 DeepSeek，跑 BBSI 四维评分和个性化黑箱拆解。
            </p>

            <button
              onClick={handleSetApiKey}
              className="w-full py-3 bg-[#0052D9] text-white font-semibold rounded-lg hover:bg-[#366EF4] transition-colors"
            >
              {currentKey ? "更换 Key" : "接入大模型"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
