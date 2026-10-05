/**
 * Apparence des candidats.
 *
 * Reprise du système de personnages du dépôt sœur `QuizzMaster`
 * (`shared/characters.ts`) : mêmes palettes, mêmes coiffures, mêmes
 * accessoires, pour que les candidats des deux jeux soient de la même
 * famille. L'adaptation ici : au lieu d'un identifiant de personnage
 * choisi par le joueur, l'apparence est dérivée de façon déterministe de
 * l'`avatarSeed` que le serveur attribue déjà à chaque joueur — elle est
 * donc stable d'une manche à l'autre et après reconnexion, sans rien
 * stocker de plus.
 */

export type HairStyle = "short" | "spiky" | "long" | "ponytail" | "curly" | "bun" | "buzz" | "afro" | "bob";
export type Accessory = "none" | "cap" | "glasses" | "beanie" | "headphones" | "roundGlasses" | "headband";

export interface CharacterPreset {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  outfit: string;
  outfitAccent: string;
  accessory: Accessory;
  accessoryColor: string;
  eyes: string;
}

export const SKIN_TONES = ["#fbe0cc", "#f5d0b5", "#f2c7a5", "#e9b98f", "#d6a07a", "#c68a62", "#8d5a3b", "#6b4029"];
export const HAIR_COLORS = ["#0d0d12", "#1b1210", "#3b2416", "#7a2e1b", "#c9632d", "#e8c26a", "#d9d4c7", "#ff66c4", "#29e7ff", "#9b5de5"];
export const OUTFIT_COLORS = ["#ff4d6d", "#1fb6ff", "#ffd23f", "#2ee59d", "#9b5de5", "#ff7a1c", "#ff66c4", "#3a86ff", "#00c2a8", "#e63946", "#7b2cbf", "#222831"];
export const OUTFIT_ACCENTS = ["#ffe3e8", "#0a2540", "#2a1a00", "#0b3326", "#f3e8ff", "#fff1e0", "#ffffff", "#e6f0ff", "#e0fffa", "#ffffff", "#ffd6ff", "#29e7ff"];
export const ACCESSORY_COLORS = ["#ffffff", "#16161a", "#ff3b5c", "#29e7ff", "#ff9f1c", "#c9a227", "#2ee59d", "#9b5de5"];
export const EYE_COLORS = ["#3d6b3a", "#2b1a10", "#3f6fa8", "#23150c", "#4a3020", "#40613a", "#5a7fa0"];
export const HAIR_STYLES: HairStyle[] = ["short", "spiky", "long", "ponytail", "curly", "bun", "buzz", "afro", "bob"];
// « none » pèse plus lourd : tous les candidats n'ont pas un accessoire.
export const ACCESSORIES: Accessory[] = [
  "none",
  "none",
  "none",
  "glasses",
  "cap",
  "headband",
  "roundGlasses",
  "beanie",
  "headphones",
];

/** Générateur déterministe : même graine, même apparence. */
function rng(seed: number) {
  let s = (Math.abs(Math.trunc(seed)) || 1) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pick<T>(r: () => number, arr: T[]): T {
  return arr[Math.floor(r() * arr.length) % arr.length];
}

export function presetFromSeed(seed: number): CharacterPreset {
  const r = rng(seed);
  const outfitIndex = Math.floor(r() * OUTFIT_COLORS.length) % OUTFIT_COLORS.length;
  return {
    skin: pick(r, SKIN_TONES),
    hair: pick(r, HAIR_COLORS),
    hairStyle: pick(r, HAIR_STYLES),
    outfit: OUTFIT_COLORS[outfitIndex],
    outfitAccent: OUTFIT_ACCENTS[outfitIndex],
    accessory: pick(r, ACCESSORIES),
    accessoryColor: pick(r, ACCESSORY_COLORS),
    eyes: pick(r, EYE_COLORS),
  };
}
