/**
 * Les 21 personnages du jeu — les mêmes que sur QuizzMaster.
 *
 * Ce sont les modèles 3D CC0 de Quaternius (pack « Universal Base
 * Characters »), repris depuis le dépôt sœur `QuizzMaster`
 * (`public/models/*.glb`). Chaque personnage existe en deux formes :
 *
 * - `public/models/<nom>.glb`        — le modèle riggé, monté sur le plateau
 * - `public/characters/<nom>.png`    — le portrait, utilisé dans le lobby,
 *                                      la présentation et le vote
 *
 * Les deux portent le même nom de fichier : le portrait du lobby et le
 * candidat sur le plateau sont donc visiblement la même personne.
 *
 * L'index est attribué par le serveur, sans remise, à l'arrivée du joueur
 * (voir `lib/gameEngine.js`) : deux candidats d'une même partie ne peuvent
 * pas se ressembler, et l'apparence survit à une reconnexion.
 */

export const CHARACTER_NAMES = [
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
] as const;

export type CharacterName = (typeof CHARACTER_NAMES)[number];

/** Nom du personnage pour un index serveur (ou une graine, en repli). */
export function characterName(index: number | undefined, fallbackSeed = 0): CharacterName {
  const raw = Number.isFinite(index) ? (index as number) : Math.abs(Math.trunc(fallbackSeed));
  const i = ((raw % CHARACTER_NAMES.length) + CHARACTER_NAMES.length) % CHARACTER_NAMES.length;
  return CHARACTER_NAMES[i];
}

export function modelUrl(index: number | undefined, fallbackSeed = 0) {
  return `/models/${characterName(index, fallbackSeed)}.glb`;
}

export function portraitUrl(index: number | undefined, fallbackSeed = 0) {
  return `/characters/${characterName(index, fallbackSeed)}.png`;
}
