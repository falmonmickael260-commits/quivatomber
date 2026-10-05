import { useEffect, useState } from "react";

/**
 * Ambiance de fond générale (menus, lobby, écrans de transition).
 *
 * Direction volontairement sobre : un studio TV réel n'est pas une boîte de
 * nuit. Quelques éléments fixes (grille, vignette, un bandeau lumineux
 * statique) suffisent à évoquer un plateau ; le mouvement est réservé aux
 * instants qui le méritent (ailleurs dans l'app), pas à l'ambiance de fond.
 *
 * `intensity={0}` désactive complètement les particules — utilisé pendant
 * le jeu actif (manche, vote...) où l'écran doit rester calme et la
 * performance mobile prioritaire.
 */
export function Background({ intensity = 1 }: { intensity?: number }) {
  const [particles, setParticles] = useState<
    { id: number; left: number; size: number; duration: number; delay: number }[]
  >([]);

  useEffect(() => {
    if (intensity <= 0) {
      setParticles([]);
      return;
    }
    // Few, small, slow — an ambiance, not a snow globe.
    setParticles(
      Array.from({ length: Math.round(6 * intensity) }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 1.5 + Math.random() * 2.5,
        duration: 22 + Math.random() * 18,
        delay: Math.random() * 14,
      }))
    );
  }, [intensity]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none bg-radial-glow noise-overlay">
      {/* studio grid — faint, static */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* single static key-light beam, top of frame */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-px bg-gradient-to-r from-transparent via-blood/50 to-transparent" />

      {/* soft side wash — static, suggests studio side panels without being literal neon */}
      <div className="hidden md:block absolute left-0 inset-y-0 w-24 bg-gradient-to-r from-blood/[0.06] to-transparent" />
      <div className="hidden md:block absolute right-0 inset-y-0 w-24 bg-gradient-to-l from-gold/[0.05] to-transparent" />

      {/* studio floor + vignette for depth */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 180px 60px rgba(0,0,0,0.65)" }} />

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
