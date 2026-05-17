"use client";

import type { Worry } from "@/lib/data";

export default function WorryTicker({ worries }: { worries: Worry[] }) {
  if (!worries.length) return null;

  return (
    <div className="relative h-10 overflow-hidden bg-gradient-to-r from-slate-50 via-[#E8F3FF] to-slate-50 rounded-lg">
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-50 to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-50 to-transparent z-10" />
      <div className="flex items-center h-full whitespace-nowrap animate-ticker-scroll">
        {worries.map((w, i) => (
          <span
            key={`${w.time}-${i}`}
            className="inline-flex items-center gap-1.5 mx-3 text-sm text-slate-600"
          >
            <span className="text-[10px] text-slate-400">{w.time}</span>
            <span className="text-[#0052D9] font-medium">{w.text.slice(0, 25)}</span>
            {i < worries.length - 1 && <span className="text-slate-300">|</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
