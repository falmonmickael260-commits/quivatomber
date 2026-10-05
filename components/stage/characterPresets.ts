/**
 * Les douze personnages de « QuizzMaster », repris tels quels.
 *
 * Copie fidèle de `QuizzMaster/shared/characters.ts` : mêmes teints, mêmes
 * coiffures, mêmes tenues, mêmes accessoires. Ce sont bien Nova, Rocco,
 * Maya & co. qui montent sur le plateau — pas des silhouettes
 * recomposées à partir des mêmes palettes.
 *
 * Dans QuizzMaster le joueur choisit son personnage ; ici il n'y a pas
 * d'écran de choix, alors chaque borne en reçoit un, dans l'ordre. Deux
 * candidats d'une même partie ne peuvent donc jamais se ressembler
 * (8 joueurs au maximum pour 12 personnages), et un joueur garde le sien
 * toute la partie, y compris après reconnexion, puisque son numéro de
 * borne ne change pas.
 */

export type HairStyle = "short" | "spiky" | "long" | "ponytail" | "curly" | "bun" | "buzz" | "afro" | "bob";
export type Accessory = "none" | "cap" | "glasses" | "beanie" | "headphones" | "roundGlasses" | "headband";

export interface CharacterPreset {
  id: string;
  name: string;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  outfit: string;
  outfitAccent: string;
  accessory: Accessory;
  accessoryColor: string;
  eyes: string;
}

export const CHARACTERS: CharacterPreset[] = [
  { id: "nova", name: "Nova", skin: "#f2c7a5", hair: "#3b2416", hairStyle: "ponytail", outfit: "#ff4d6d", outfitAccent: "#ffe3e8", accessory: "none", accessoryColor: "#ffffff", eyes: "#3d6b3a" },
  { id: "rocco", name: "Rocco", skin: "#c68a62", hair: "#1b1210", hairStyle: "short", outfit: "#1fb6ff", outfitAccent: "#0a2540", accessory: "cap", accessoryColor: "#ff9f1c", eyes: "#2b1a10" },
  { id: "maya", name: "Maya", skin: "#8d5a3b", hair: "#120c0a", hairStyle: "afro", outfit: "#ffd23f", outfitAccent: "#2a1a00", accessory: "headband", accessoryColor: "#ff3b5c", eyes: "#23150c" },
  { id: "hugo", name: "Hugo", skin: "#f5d0b5", hair: "#c9632d", hairStyle: "spiky", outfit: "#2ee59d", outfitAccent: "#0b3326", accessory: "glasses", accessoryColor: "#16161a", eyes: "#3f6fa8" },
  { id: "yuna", name: "Yuna", skin: "#f0cfa8", hair: "#0d0d12", hairStyle: "bob", outfit: "#9b5de5", outfitAccent: "#f3e8ff", accessory: "headphones", accessoryColor: "#29e7ff", eyes: "#2a1a10" },
  { id: "sam", name: "Sam", skin: "#6b4029", hair: "#0b0908", hairStyle: "buzz", outfit: "#ff7a1c", outfitAccent: "#fff1e0", accessory: "none", accessoryColor: "#ffffff", eyes: "#1f130b" },
  { id: "lily", name: "Lily", skin: "#fbe0cc", hair: "#e8c26a", hairStyle: "long", outfit: "#ff66c4", outfitAccent: "#ffffff", accessory: "none", accessoryColor: "#ffffff", eyes: "#3a78b8" },
  { id: "karim", name: "Karim", skin: "#b57a52", hair: "#1c120c", hairStyle: "curly", outfit: "#3a86ff", outfitAccent: "#e6f0ff", accessory: "roundGlasses", accessoryColor: "#c9a227", eyes: "#2b1a10" },
  { id: "zoe", name: "Zoé", skin: "#e9b98f", hair: "#7a2e1b", hairStyle: "bun", outfit: "#00c2a8", outfitAccent: "#e0fffa", accessory: "none", accessoryColor: "#ffffff", eyes: "#4a3020" },
  { id: "leo", name: "Léo", skin: "#f3cfae", hair: "#4a3322", hairStyle: "short", outfit: "#e63946", outfitAccent: "#ffffff", accessory: "beanie", accessoryColor: "#29e7ff", eyes: "#40613a" },
  { id: "ines", name: "Inès", skin: "#d6a07a", hair: "#2a1710", hairStyle: "long", outfit: "#7b2cbf", outfitAccent: "#ffd6ff", accessory: "beanie", accessoryColor: "#ff3b5c", eyes: "#2a1a10" },
  { id: "max", name: "Max", skin: "#f7d7bd", hair: "#d9d4c7", hairStyle: "spiky", outfit: "#222831", outfitAccent: "#29e7ff", accessory: "headphones", accessoryColor: "#ff4d6d", eyes: "#5a7fa0" },
];

/** Le personnage attribué à une borne (1 → Nova, 2 → Rocco, …). */
export function presetForSeat(seat: number | undefined): CharacterPreset {
  const n = Number.isFinite(seat) ? Math.max(1, Math.trunc(seat as number)) : 1;
  return CHARACTERS[(n - 1) % CHARACTERS.length];
}
