"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const EMOJIS = ["💥", "🎉", "✨", "🔥", "💣", "⚡", "🌟", "🎆", "💫", "🪄"];
const COLORS = ["#0052D9", "#FF7D00", "#FF4757", "#00A3FF", "#FBBF24", "#34D399"];

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  emoji: string;
  size: number;
  rotation: number;
  color: string;
}

export default function ExplosionAnimation({
  show,
  onComplete,
  children,
}: {
  show: boolean;
  onComplete?: () => void;
  children?: React.ReactNode;
}) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      setParticles([]);
      return;
    }

    setVisible(true);
    const particles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30 + (Math.random() - 0.5) * 0.5;
      const speed = 80 + Math.random() * 200;
      particles.push({
        id: i,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        size: 14 + Math.random() * 28,
        rotation: Math.random() * 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
    setParticles(particles);

    const timer = setTimeout(() => {
      onComplete?.();
    }, 2500);

    return () => clearTimeout(timer);
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Center glow */}
          <motion.div
            className="absolute w-32 h-32 rounded-full bg-[#0052D9]/40 blur-3xl"
            animate={{ scale: [1, 1.5, 1], opacity: [0.8, 0.3, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          {/* Particles */}
          {particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute top-1/2 left-1/2 pointer-events-none select-none"
              initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
              animate={{
                x: p.vx,
                y: p.vy,
                opacity: [1, 1, 0],
                scale: [0, 1.2, 0.8],
                rotate: p.rotation,
              }}
              transition={{
                duration: 1.5 + Math.random() * 1,
                ease: "easeOut",
              }}
              style={{ fontSize: p.size }}
            >
              {p.emoji}
            </motion.span>
          ))}

          {/* Content */}
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.3 }}
            className="relative z-10 text-center"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
