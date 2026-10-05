import { useMemo } from "react";

export function Background({ intensity = 1 }: { intensity?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: Math.round(18 * intensity) }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 4,
        duration: 8 + Math.random() * 14,
        delay: Math.random() * 10,
      })),
    [intensity]
  );

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none bg-radial-glow noise-overlay">
      {/* grid lines TV plateau */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* top red beam */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[2px] bg-gradient-to-r from-transparent via-blood/60 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blood/40 to-transparent animate-scanline opacity-50" />

      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
