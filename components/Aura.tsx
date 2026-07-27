"use client";
import { AURA_COLORS, type MentalState } from "@/lib/store";

export default function Aura({ state }: { state: MentalState }) {
  const color = AURA_COLORS[state];

  return (
    <div className="relative flex items-center justify-center w-72 h-72 md:w-80 md:h-80">
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-2000"
        style={{ backgroundColor: color }}
      />
      {/* Aura blob */}
      <div
        className="w-64 h-64 md:w-72 md:h-72 transition-all duration-2000 animate-[auraBreath_8s_ease-in-out_infinite]"
        style={{
          backgroundColor: color,
          backgroundImage: `radial-gradient(ellipse at 40% 40%, ${color}cc, ${color}66)`,
          borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
          boxShadow: `0 0 60px ${color}40, 0 0 120px ${color}20`,
          animation:
            "auraBreath 8s ease-in-out infinite, auraPulse 4s ease-in-out infinite",
        }}
      />
    </div>
  );
}
