import { motion } from "framer-motion";

/**
 * Portraits de personnages — rendus 3D stylisés issus du pack "Universal
 * Base Characters" de Quaternius (licence CC0 : domaine public, usage
 * commercial libre, aucune attribution requise). Voir ASSETS_LICENSES.md
 * pour la provenance exacte et la chaîne de vérification de licence.
 *
 * 21 archétypes (10 féminins, 11 masculins), suffisamment variés en
 * silhouette, carrure et tenue pour être reconnus instantanément d'un
 * coup d'oeil — sans tomber dans l'avatar à initiales ni le cartoon.
 */

const PORTRAITS = [
  "f-adventurer",
  "h-casual",
  "f-witch",
  "h-king",
  "f-suit",
  "h-worker",
  "f-scifi",
  "h-punk",
  "f-formal",
  "h-adventurer",
  "f-soldier",
  "h-suit",
  "f-casual",
  "h-swat",
  "f-medieval",
  "h-spacesuit",
  "f-punk",
  "h-farmer",
  "f-worker",
  "h-beach",
  "h-casual-hoodie",
];

const ACCENTS = ["#e3122f", "#d4af37", "#9aa3ad", "#ff3b3b", "#c98f63"];

export function getArchetypeIndex(seed: number) {
  const n = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0;
  return n % PORTRAITS.length;
}

/** Raw asset path for a seed — used by the plateau, which renders the bust
 *  full-frame (masked into the dark set) rather than cropped into a disc. */
export function getPortraitSrc(seed: number) {
  return `/characters/${PORTRAITS[getArchetypeIndex(seed)]}.png`;
}

/** Per-archetype accent, reused by the plateau for the podium nameplate. */
export function getPortraitAccent(seed: number) {
  return ACCENTS[getArchetypeIndex(seed) % ACCENTS.length];
}

export function CharacterPortrait({
  seed,
  character,
  size = 96,
  glow = false,
  grayscale = false,
  className = "",
}: {
  seed: number;
  /** Index d'apparence attribué par le serveur : quand il est fourni, le
   *  portrait montre exactement le personnage qui montera sur le plateau. */
  character?: number;
  size?: number;
  glow?: boolean;
  grayscale?: boolean;
  className?: string;
}) {
  const idx = character !== undefined && character !== null ? character % PORTRAITS.length : getArchetypeIndex(seed);
  const file = PORTRAITS[idx];
  const accent = ACCENTS[idx % ACCENTS.length];

  return (
    <motion.div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
      initial={false}
    >
      {glow && (
        <div
          className="absolute inset-0 rounded-full blur-xl"
          style={{ background: `radial-gradient(circle, ${accent}66, transparent 70%)` }}
        />
      )}
      <div
        className="relative rounded-full overflow-hidden border border-white/10"
        style={{
          width: size,
          height: size,
          boxShadow: `inset 0 0 0 1.5px ${accent}55, 0 2px 10px rgba(0,0,0,0.5)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/characters/${file}.png`}
          alt=""
          width={256}
          height={256}
          draggable={false}
          className="w-full h-full object-cover select-none"
          style={{
            filter: grayscale ? "grayscale(1) brightness(0.65)" : undefined,
            // slight upscale + top-weighted crop keeps the face the focal
            // point at small sizes instead of showing too much shoulder
            objectPosition: "50% 30%",
            transform: "scale(1.18)",
          }}
        />
        {/* soft inner vignette blends the asset's flat dark background into
            our own UI panels at any size */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ boxShadow: "inset 0 0 14px 4px rgba(0,0,0,0.45)" }}
        />
      </div>
    </motion.div>
  );
}
