"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Worry } from "@/lib/data";

export default function WorryTicker({ worries }: { worries: Worry[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (worries.length === 0) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % worries.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [worries.length]);

  if (!worries.length) return null;

  const current = worries[index];

  return (
    <div className="relative h-20 overflow-hidden rounded-xl bg-white border border-[#E5E7EB] shadow-[0_2px_12px_rgba(0,82,217,0.06)]">
      <AnimatePresence mode="wait">
        <motion.div
          key={`${current.time}-${index}`}
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -28, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center gap-3 px-4"
        >
          <span className="text-lg flex-shrink-0">
            {["😰", "😣", "🤔", "😤", "🫣", "😬", "💭", "🫠"][index % 8]}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] text-[#1D2129] font-medium truncate">{current.text}</p>
            <p className="text-[11px] text-[#A9AEB8] mt-0.5">{current.time}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Progress dots */}
      <div className="absolute bottom-2 right-3 flex gap-1">
        {worries.slice(0, 8).map((_, i) => (
          <span
            key={i}
            className={`w-1 h-1 rounded-full transition-colors ${
              i === index ? "bg-[#0052D9]" : "bg-[#E5E7EB]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
