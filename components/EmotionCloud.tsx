export default function EmotionCloud({ emotions }: { emotions: string[] }) {
  const counts: Record<string, number> = {};
  emotions.forEach((e) => { counts[e] = (counts[e] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  if (!sorted.length) {
    return <p className="text-[#A09890] text-sm text-center">No emotions detected yet</p>;
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {sorted.map(([emotion, count]) => (
        <span key={emotion}
          className="px-3 py-1.5 rounded-full border text-sm transition-all"
          style={{
            borderColor: "#F2D46170",
            color: "#D4CEBD",
            fontSize: `${Math.min(1, 0.75 + count * 0.08)}rem`,
            opacity: Math.min(1, 0.5 + count * 0.15),
          }}>
          {emotion}
        </span>
      ))}
    </div>
  );
}
