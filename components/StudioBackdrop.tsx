/**
 * Décor de plateau TV — utilisé derrière l'écran de manche (desktop).
 *
 * Tout est dessiné en un seul SVG statique (aucune animation en boucle,
 * aucune image) : un mur de studio avec écrans et logo, un sol en
 * perspective avec grille convergente, et quelques faisceaux de
 * projecteurs fixes. L'objectif est de lire immédiatement "plateau de jeu
 * télévisé" d'un coup d'oeil, sans rien qui bouge en permanence — la seule
 * chose vivante à l'écran doit être le jeu lui-même.
 *
 * Masqué sur mobile (voir usage) : sur petit écran, l'espace sert à la
 * question, pas au décor.
 */
export function StudioBackdrop() {
  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="sb-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#120a10" />
          <stop offset="70%" stopColor="#0a0610" />
          <stop offset="100%" stopColor="#05030a" />
        </linearGradient>
        <linearGradient id="sb-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d0710" />
          <stop offset="100%" stopColor="#000000" />
        </linearGradient>
        <radialGradient id="sb-screen-glow" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#e3122f" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#e3122f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sb-screen-glow-gold" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#d4af37" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sb-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sb-beam-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff3b3b" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#ff3b3b" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sb-stage-pool" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e3122f" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#e3122f" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* back wall */}
      <rect x="0" y="0" width="1600" height="620" fill="url(#sb-wall)" />

      {/* modular wall panels: vertical seams, like a real studio flat */}
      {[120, 320, 520, 1080, 1280, 1480].map((x) => (
        <line key={x} x1={x} y1="0" x2={x} y2="620" stroke="rgba(255,255,255,0.035)" strokeWidth="2" />
      ))}
      <line x1="800" y1="0" x2="800" y2="620" stroke="rgba(212,175,55,0.05)" strokeWidth="1" />

      {/* side video-wall screens */}
      <g>
        <rect x="150" y="90" width="300" height="420" rx="10" fill="#060308" stroke="rgba(255,255,255,0.06)" />
        <rect x="150" y="90" width="300" height="420" rx="10" fill="url(#sb-screen-glow)" />
        <rect x="162" y="102" width="276" height="396" rx="6" fill="none" stroke="rgba(227,18,47,0.18)" />
      </g>
      <g>
        <rect x="1150" y="90" width="300" height="420" rx="10" fill="#060308" stroke="rgba(255,255,255,0.06)" />
        <rect x="1150" y="90" width="300" height="420" rx="10" fill="url(#sb-screen-glow-gold)" />
        <rect x="1162" y="102" width="276" height="396" rx="6" fill="none" stroke="rgba(212,175,55,0.16)" />
      </g>

      {/* central wordmark screen */}
      <g opacity="0.85">
        <rect x="560" y="60" width="480" height="150" rx="12" fill="#070309" stroke="rgba(255,255,255,0.05)" />
        <text
          x="800"
          y="150"
          textAnchor="middle"
          fontFamily="'Bebas Neue', sans-serif"
          fontSize="56"
          letterSpacing="4"
          fill="#e3122f"
          opacity="0.5"
        >
          QUI VA TOMBER ?
        </text>
      </g>

      {/* fixed rig spotlights — static beams, no flicker */}
      <polygon points="300,0 420,0 620,460 180,460" fill="url(#sb-beam)" />
      <polygon points="780,0 900,0 1020,480 700,480" fill="url(#sb-beam-red)" />
      <polygon points="1200,0 1320,0 1480,460 1060,460" fill="url(#sb-beam)" />

      {/* horizon seam between wall and floor */}
      <rect x="0" y="615" width="1600" height="6" fill="#000000" opacity="0.5" />

      {/* floor */}
      <rect x="0" y="620" width="1600" height="280" fill="url(#sb-floor)" />
      {/* soft light pool where the active player stands */}
      <ellipse cx="800" cy="760" rx="420" ry="90" fill="url(#sb-stage-pool)" />
      {/* perspective grid converging toward center-horizon, classic game-show floor */}
      {[-6, -4, -2, 0, 2, 4, 6].map((n) => (
        <line
          key={n}
          x1={800 + n * 140}
          y1="900"
          x2={800 + n * 18}
          y2="620"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1.5"
        />
      ))}
      {[700, 760, 820, 900].map((y, i) => (
        <line
          key={y}
          x1={800 - (900 - y) * 1.1}
          y1={y}
          x2={800 + (900 - y) * 1.1}
          y2={y}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />
      ))}

      {/* vignette to keep edges dark and attention centered */}
      <rect x="0" y="0" width="1600" height="900" fill="url(#sb-stage-pool)" opacity="0" />
    </svg>
  );
}
