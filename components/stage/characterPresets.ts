/**
 * Apparence des candidats — dérivée de façon déterministe de l'`avatarSeed`
 * que le serveur attribue déjà à chaque joueur. Deux joueurs d'une même
 * partie ont donc des silhouettes distinctes, et un joueur garde la sienne
 * d'une manche à l'autre et après reconnexion, sans rien stocker de plus.
 *
 * Les personnages sont construits en 3D à partir de primitives (voir
 * Character3D) : pas de modèle à télécharger, pas de texture — c'est ce qui
 * permet d'avoir huit candidats en pied sans alourdir la page.
 */

export type HairStyle = "short" | "spiky" | "long" | "ponytail" | "bun" | "buzz" | "afro" | "bob";
export type Accessory = "none" | "glasses" | "cap" | "headband";

export interface CharacterPreset {
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  outfit: string;
  outfitAccent: string;
  trousers: string;
  accessory: Accessory;
  accessoryColor: string;
  eyes: string;
  build: number; // 0 = fine, 1 = large
  height: number; // facteur de taille
}

const SKIN = ["#fbe0cc", "#f5d0b5", "#f2c7a5", "#e9b98f", "#d6a07a", "#c68a62", "#8d5a3b", "#6b4029"];
const HAIR = ["#0d0d12", "#1b1210", "#3b2416", "#7a2e1b", "#c9632d", "#e8c26a", "#d9d4c7", "#4a3322"];
// Tenues sobres : sur un plateau sombre, les candidats doivent se détacher
// par la lumière, pas par des couleurs criardes.
const OUTFIT = [
  "#7d1326", "#1f3356", "#2d2a3e", "#123a35", "#4a2338",
  "#36404f", "#5a3418", "#1c2b4a", "#43203a", "#2b3b2a",
];
const TROUSERS = ["#14161f", "#1a1d28", "#101219", "#22252f"];
const EYES = ["#3d6b3a", "#2b1a10", "#3f6fa8", "#4a3020", "#23150c"];
const HAIR_STYLES: HairStyle[] = ["short", "spiky", "long", "ponytail", "bun", "buzz", "afro", "bob"];
const ACCESSORIES: Accessory[] = ["none", "none", "none", "glasses", "cap", "headband"];
const ACCESSORY_COLORS = ["#16161a", "#c9a227", "#7d1326", "#36404f"];

/** Générateur déterministe simple : même graine, même apparence. */
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
  const skin = pick(r, SKIN);
  const hair = pick(r, HAIR);
  const hairStyle = pick(r, HAIR_STYLES);
  const outfit = pick(r, OUTFIT);
  const trousers = pick(r, TROUSERS);
  const accessory = pick(r, ACCESSORIES);
  const accessoryColor = pick(r, ACCESSORY_COLORS);
  const eyes = pick(r, EYES);
  const build = 0.25 + r() * 0.75;
  const height = 0.94 + r() * 0.14;
  return {
    skin,
    hair,
    hairStyle,
    outfit,
    outfitAccent: "#e9e4d8",
    trousers,
    accessory,
    accessoryColor,
    eyes,
    build,
    height,
  };
}
