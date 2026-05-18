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
  color: string;
  delay: number;
  duration: number;
}

const PALETTE = [
  "#0052D9", // 蓝
  "#FF7D00", // 橙
  "#00B42A", // 绿
  "#722ED1", // 紫
  "#F5319D", // 粉
  "#0096FF", // 天蓝
  "#D54941", // 红
];

export default function WordCloud({ words }: { words: WordItem[] }) {
  const positioned = useMemo(() => {
    if (!words.length) return [];
    const maxFreq = Math.max(...words.map((w) => w.freq), 1);
    const placed: { x: number; y: number; r: number }[] = [];
    const result: PositionedWord[] = [];

    const containerW = 700;
    const containerH = 520;
    const padding = 16; // minimum gap between circles

    const sorted = [...words].sort((a, b) => b.freq - a.freq).slice(0, 20);

    for (let i = 0; i < sorted.length; i++) {
      const w = sorted[i];
      const ratio = w.freq / maxFreq;
      let size = 22 + ratio * 44;
      const diameter = size * 2.6;
      let radius = diameter / 2;

      let placedOk = false;
      // Try progressively smaller sizes if needed
      for (let shrink = 0; shrink <= 6; shrink++) {
        if (shrink > 0) {
          size = Math.max(18, size - shrink * 4);
          radius = (size * 2.6) / 2;
        }

        const maxAttempts = i === 0 ? 1 : 2000;
        for (let attempt = i === 0 ? 0 : 1; attempt < maxAttempts; attempt++) {
          const angle = attempt * 2.399963; // golden angle in radians
          const dist = 6.5 * Math.sqrt(attempt); // Fermat spiral
          const x = containerW / 2 + Math.cos(angle) * dist;
          const y = containerH / 2 + Math.sin(angle) * dist;

          const cx = Math.max(radius + padding, Math.min(containerW - radius - padding, x));
          const cy = Math.max(radius + padding, Math.min(containerH - radius - padding, y));

          const overlap = placed.some(
            (p) => Math.hypot(p.x - cx, p.y - cy) < p.r + radius + padding
          );

          if (!overlap) {
            placed.push({ x: cx, y: cy, r: radius });
            result.push({
              text: w.text,
              freq: w.freq,
              x: cx,
              y: cy,
              size,
              color: PALETTE[i % PALETTE.length],
              delay: Math.random() * 1.5,
              duration: 2.5 + Math.random() * 2,
            });
            placedOk = true;
            break;
          }
        }
        if (placedOk) break;
      }

      // Absolute last resort: place at edge with min size
      if (!placedOk) {
        const minR = 20;
        const ex = minR + padding + Math.random() * (containerW - 2 * minR - 2 * padding);
        const ey = minR + padding + Math.random() * (containerH - 2 * minR - 2 * padding);
        // Check overlaps one more time with minimal size
        const edgeOverlap = placed.some(
          (p) => Math.hypot(p.x - ex, p.y - ey) < p.r + minR + padding
        );
        if (!edgeOverlap) {
          placed.push({ x: ex, y: ey, r: minR });
          result.push({
            text: w.text,
            freq: w.freq,
            x: ex,
            y: ey,
            size: 18,
            color: PALETTE[i % PALETTE.length],
            delay: Math.random() * 1.5,
            duration: 3,
          });
        }
        // If even that overlaps, skip this word entirely
      }
    }

    return result;
  }, [words]);

  if (!positioned.length) {
    return (
      <div className="flex items-center justify-center h-[520px] text-[#6B7187] text-sm rounded-xl border border-dashed border-[#D9E1FF] bg-white/40">
        输入第一条，词云就活了...
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-[520px] w-full overflow-hidden rounded-xl border border-[#E4E9F2] bg-white/60">
      <div className="relative" style={{ width: 700, height: 520 }}>
        {positioned.map((word) => {
          const diameter = word.size * 2.2;
          return (
            <motion.div
              key={word.text}
              className="absolute flex items-center justify-center rounded-full font-bold select-none text-center px-1"
              style={{
                left: word.x - diameter / 2,
                top: word.y - diameter / 2,
              width: diameter,
              height: diameter,
              fontSize: word.size * 0.52,
              color: word.color,
              background: `${word.color}15`,
              border: `1.5px solid ${word.color}40`,
            }}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{
              opacity: 1,
              y: [-3, 3, -3],
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
            <span className="leading-tight">{word.text}</span>
          </motion.div>
        );
      })}
      </div>
    </div>
  );
}
