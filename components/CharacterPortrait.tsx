import { motion } from "framer-motion";

/**
 * 8 personnages originaux (silhouettes vectorielles "plateau TV") — oeuvre
 * 100% originale créée pour ce projet, zéro asset externe. Voir
 * ASSETS_LICENSES.md pour le détail de ce choix et ses raisons.
 *
 * Chaque archétype combine : une coiffe/chevelure distincte, une teinte de
 * peau, une couleur d'accent, et une silhouette de col — suffisamment
 * différenciés pour être reconnus instantanément d'un coup d'oeil, sans
 * tomber dans le cartoon ni l'avatar générique à initiales.
 */

interface Archetype {
  skin: string;
  skinShadow: string;
  hair: string;
  accent: string;
  hairPath: (id: string) => JSX.Element;
  collar: "round" | "vneck" | "shirt" | "turtleneck";
  accessory?: (id: string) => JSX.Element;
}

const ARCHETYPES: Archetype[] = [
  {
    // Homme jeune, cheveux courts dégradés
    skin: "#e8b48a",
    skinShadow: "#c98f63",
    hair: "#2b1d14",
    accent: "#e3122f",
    collar: "round",
    hairPath: () => (
      <path d="M30 38 Q50 14 70 38 L70 46 Q50 36 30 46 Z" />
    ),
  },
  {
    // Femme jeune, longue chevelure
    skin: "#f1c6a0",
    skinShadow: "#d6a177",
    hair: "#3a1f0f",
    accent: "#d4af37",
    collar: "vneck",
    hairPath: () => (
      <path d="M26 40 Q24 20 50 16 Q76 20 74 40 L78 86 L68 86 L66 48 Q50 30 34 48 L32 86 L22 86 Z" />
    ),
  },
  {
    // Homme adulte, crâne rasé, barbe courte
    skin: "#8a5a37",
    skinShadow: "#6e4327",
    hair: "#1a1a1a",
    accent: "#9aa3ad",
    collar: "shirt",
    hairPath: () => (
      <path d="M48 56 Q50 66 52 56 L54 62 Q50 70 46 62 Z" opacity="0.001" />
    ),
  },
  {
    // Femme adulte, carré court
    skin: "#c98f63",
    skinShadow: "#a8714a",
    hair: "#17110d",
    accent: "#e3122f",
    collar: "round",
    hairPath: () => (
      <path d="M26 42 Q24 16 50 14 Q76 16 74 42 L72 58 Q68 40 50 38 Q32 40 28 58 Z" />
    ),
  },
  {
    // Homme senior, cheveux gris, lunettes
    skin: "#e8b48a",
    skinShadow: "#c98f63",
    hair: "#9ea3a8",
    accent: "#d4af37",
    collar: "shirt",
    hairPath: () => (
      <path d="M30 36 Q50 16 70 36 L69 42 Q50 28 31 42 Z" />
    ),
    accessory: (id) => (
      <g stroke="#1a1a1a" strokeWidth="1.6" fill="none">
        <circle cx="40" cy="48" r="7" />
        <circle cx="60" cy="48" r="7" />
        <line x1="47" y1="48" x2="53" y2="48" />
      </g>
    ),
  },
  {
    // Femme senior, chignon
    skin: "#f1c6a0",
    skinShadow: "#d6a177",
    hair: "#c7c7c7",
    accent: "#9aa3ad",
    collar: "turtleneck",
    hairPath: () => (
      <>
        <path d="M27 40 Q25 18 50 16 Q75 18 73 40 L71 50 Q67 34 50 32 Q33 34 29 50 Z" />
        <circle cx="50" cy="15" r="8" />
      </>
    ),
  },
  {
    // Homme style alternatif, dreadlocks courts
    skin: "#6e4327",
    skinShadow: "#53311c",
    hair: "#0d0d0d",
    accent: "#e3122f",
    collar: "round",
    hairPath: () => (
      <g>
        <path d="M28 40 Q50 12 72 40 L72 50 Q50 32 28 50 Z" />
        {[32, 40, 48, 56, 64].map((x) => (
          <rect key={x} x={x - 2} y={38} width="4" height="22" rx="2" />
        ))}
      </g>
    ),
  },
  {
    // Femme style alternatif, afro
    skin: "#8a5a37",
    skinShadow: "#6e4327",
    hair: "#1a1310",
    accent: "#d4af37",
    collar: "vneck",
    hairPath: () => <circle cx="50" cy="34" r="26" />,
  },
];

export function getArchetypeIndex(seed: number) {
  const n = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0;
  return n % ARCHETYPES.length;
}

export function CharacterPortrait({
  seed,
  size = 96,
  glow = false,
  grayscale = false,
  className = "",
}: {
  seed: number;
  size?: number;
  glow?: boolean;
  grayscale?: boolean;
  className?: string;
}) {
  const a = ARCHETYPES[getArchetypeIndex(seed)];
  const uid = `cp-${seed}`;

  return (
    <motion.div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      initial={false}
    >
      {glow && (
        <div
          className="absolute inset-0 rounded-full blur-xl"
          style={{ background: `radial-gradient(circle, ${a.accent}66, transparent 70%)` }}
        />
      )}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="relative rounded-full"
        style={{
          filter: grayscale ? "grayscale(1) brightness(0.7)" : undefined,
        }}
      >
        <defs>
          <radialGradient id={`${uid}-bg`} cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#1a1420" />
            <stop offset="100%" stopColor="#05030a" />
          </radialGradient>
          <linearGradient id={`${uid}-skin`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={a.skin} />
            <stop offset="100%" stopColor={a.skinShadow} />
          </linearGradient>
          <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={a.accent} stopOpacity="0.9" />
            <stop offset="100%" stopColor={a.accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r="49" fill={`url(#${uid}-bg)`} />

        {/* torso / collar */}
        <g fill={a.accent} opacity="0.92">
          {a.collar === "turtleneck" && <rect x="30" y="78" width="40" height="22" rx="10" />}
          {a.collar === "shirt" && <path d="M28 100 L36 76 L50 86 L64 76 L72 100 Z" />}
          {a.collar === "vneck" && <path d="M26 100 L38 74 L50 84 L62 74 L74 100 Z" />}
          {a.collar === "round" && <rect x="26" y="80" width="48" height="20" rx="12" />}
        </g>

        {/* neck */}
        <rect x="42" y="64" width="16" height="20" fill={`url(#${uid}-skin)`} />

        {/* head */}
        <ellipse cx="50" cy="48" rx="22" ry="25" fill={`url(#${uid}-skin)`} />

        {/* hair */}
        <g fill={a.hair}>{a.hairPath(uid)}</g>

        {/* subtle facial shading, no features drawn = avoids uncanny/cartoon look,
            reads as a dramatic backlit TV-studio silhouette portrait */}
        <ellipse cx="50" cy="54" rx="20" ry="14" fill={a.skinShadow} opacity="0.25" />

        {a.accessory?.(uid)}

        {/* rim light (studio key light effect) */}
        <ellipse cx="50" cy="48" rx="22" ry="25" fill="none" stroke={`url(#${uid}-rim)`} strokeWidth="2.5" />
        <circle cx="50" cy="50" r="49" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      </svg>
    </motion.div>
  );
}
