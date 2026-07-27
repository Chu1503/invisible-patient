export default function ResonanceBattery({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));

  const color = pct >= 65 ? "#F2D461"
    : pct >= 40 ? "#DDBB43"
    : "#C99724";

  const label = pct >= 65 ? "Flowing"
    : pct >= 40 ? "Strained"
    : "Depleted";

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative flex flex-col items-center">
        <div className="w-8 h-2 rounded-t-sm mb-0.5"
          style={{ backgroundColor: `${color}40`, border: `1px solid ${color}30` }} />
        <div className="relative w-16 h-32 rounded-2xl border-2 overflow-hidden flex flex-col justify-end"
          style={{ borderColor: `${color}70`, backgroundColor: "#001D21" }}>
          <div
            className="transition-all duration-1000 ease-out"
            style={{
              height: `${pct}%`,
              backgroundColor: color,
              opacity: 0.8,
              boxShadow: `0 0 20px ${color}40`,
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium text-[#F5F0E8]" style={{ fontFamily: "var(--font-display)" }}>
              {pct}
              <span className="text-[9px] text-[#A09890]">/100</span>
            </span>
          </div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}
