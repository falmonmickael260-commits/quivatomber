const PALETTE = ["#e3122f", "#d4af37", "#9aa3ad", "#7a0a1c", "#ff3b3b", "#4a4a6a"];

export function Avatar({ seed, name, size = 48 }: { seed: number; name: string; size?: number }) {
  const hue = seed % PALETTE.length;
  const color = PALETTE[hue];
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div
      className="rounded-full flex items-center justify-center font-display font-bold text-white border-2 border-white/20 shadow-lg shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(145deg, ${color}, #05030a)`,
      }}
    >
      {initials || "?"}
    </div>
  );
}
