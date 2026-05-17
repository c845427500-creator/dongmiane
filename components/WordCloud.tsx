"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface WordItem {
  text: string;
  freq: number;
}

interface PositionedWord extends WordItem {
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
  duration: number;
}

export default function WordCloud({ words }: { words: WordItem[] }) {
  const positioned = useMemo(() => {
    if (!words.length) return [];
    const maxFreq = Math.max(...words.map((w) => w.freq), 1);
    const placed: { x: number; y: number; r: number }[] = [];
    const result: PositionedWord[] = [];

    const containerW = 340;
    const containerH = 260;

    const sorted = [...words].sort((a, b) => b.freq - a.freq).slice(0, 20);

    for (const w of sorted) {
      const ratio = w.freq / maxFreq;
      const size = 12 + ratio * 22;
      const radius = size * 2.5;

      let placedOk = false;
      for (let attempt = 0; attempt < 300; attempt++) {
        const angle = attempt * 0.3;
        const r = 8 * attempt * 0.3;
        const x = containerW / 2 + Math.cos(angle) * r;
        const y = containerH / 2 + Math.sin(angle) * r;

        const cx = Math.max(size * 2, Math.min(containerW - size * 2, x));
        const cy = Math.max(size, Math.min(containerH - size, y));

        const overlap = placed.some(
          (p) => Math.hypot(p.x - cx, p.y - cy) < p.r + radius * 0.9
        );

        if (!overlap) {
          placed.push({ x: cx, y: cy, r: radius });
          result.push({
            text: w.text,
            freq: w.freq,
            x: cx,
            y: cy,
            size,
            opacity: 0.5 + ratio * 0.5,
            delay: Math.random() * 2,
            duration: 2.5 + Math.random() * 2,
          });
          placedOk = true;
          break;
        }
      }
      if (!placedOk) {
        result.push({
          text: w.text,
          freq: w.freq,
          x: Math.random() * (containerW - 60) + 30,
          y: Math.random() * (containerH - 40) + 20,
          size: 14 + (w.freq / maxFreq) * 18,
          opacity: 0.5,
          delay: Math.random() * 2,
          duration: 3,
        });
      }
    }

    return result;
  }, [words]);

  if (!positioned.length) {
    return (
      <div className="flex items-center justify-center h-[260px] text-slate-400 text-sm">
        等待大家提交担忧...
      </div>
    );
  }

  return (
    <div className="relative h-[260px] w-full overflow-hidden">
      {positioned.map((word, i) => (
        <motion.span
          key={word.text + i}
          className="absolute inline-block font-bold text-[#0052D9] select-none"
          style={{
            left: word.x,
            top: word.y,
            fontSize: word.size,
            opacity: word.opacity,
          }}
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{
            opacity: [word.opacity, word.opacity * 1.2, word.opacity],
            y: [word.y - 3, word.y + 3, word.y - 3],
            scale: 1,
          }}
          transition={{
            opacity: { duration: 0.5, delay: word.delay },
            scale: { duration: 0.5, delay: word.delay },
            y: {
              duration: word.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: word.delay + 0.5,
            },
          }}
        >
          {word.text}
        </motion.span>
      ))}
    </div>
  );
}
