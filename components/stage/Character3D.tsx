"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { CHARACTER_NAMES, modelUrl } from "./characterPresets";

/**
 * Candidat sur le plateau : le modèle 3D riggé du personnage, le même que
 * sur QuizzMaster (modèles CC0 Quaternius, voir ASSETS_LICENSES.md).
 *
 * Chaque modèle embarque son squelette et cinq animations — Idle,
 * Idle_Neutral, Interact, Wave, HitRecieve — qu'on fait correspondre aux
 * moments d'une manche. Les transitions sont des fondus enchaînés : le
 * candidat ne saute jamais d'une pose à l'autre.
 */

export type CharacterMood = "idle" | "thinking" | "answering" | "happy" | "sad";

/** Quelle animation du modèle jouer selon le moment du jeu. */
const CLIP_FOR_MOOD: Record<CharacterMood, string[]> = {
  // plusieurs noms : on prend le premier que le modèle possède
  idle: ["Idle", "Idle_Neutral"],
  thinking: ["Idle_Neutral", "Idle"],
  answering: ["Interact", "Idle_Neutral", "Idle"],
  happy: ["Wave", "Interact", "Idle"],
  sad: ["HitRecieve", "Idle_Neutral", "Idle"],
};

/** Hauteur voulue sur ce plateau (la borne culmine à 1,24, soit un peu
 *  plus que la taille du candidat — comme un vrai pupitre de plateau). */
const TARGET_HEIGHT = 2.3;

export function Character3D({
  character,
  seed = 0,
  mood = "idle",
}: {
  /** Index d'apparence attribué par le serveur. */
  character?: number;
  /** Décale les animations pour que les candidats ne bougent pas en choeur. */
  seed?: number;
  mood?: CharacterMood;
}) {
  const url = modelUrl(character, seed);
  const { scene, animations } = useGLTF(url);
  const group = useRef<THREE.Group>(null);

  // Un modèle chargé est partagé entre toutes ses instances : il faut le
  // cloner (squelette compris) pour que deux candidats ne s'animent pas
  // ensemble si jamais ils tombent sur la même apparence.
  const model = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);

  // Mise à l'échelle et calage au sol, mesurés sur le modèle lui-même : les
  // personnages du pack n'ont pas tous exactement la même taille.
  const { scale, groundY } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const s = size.y > 0.001 ? TARGET_HEIGHT / size.y : 1;
    return { scale: s, groundY: -box.min.y * s };
  }, [model]);

  useEffect(() => {
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = false;
        // le plateau est sombre : on évite que les matériaux du pack
        // écrasent les ombres portées du projecteur
        m.frustumCulled = false;
      }
    });
  }, [model]);

  const { actions, mixer } = useAnimations(animations, group);

  // décalage de phase : huit candidats qui respirent à l'unisson font faux
  useEffect(() => {
    mixer.timeScale = 0.92 + ((Math.abs(Math.trunc(seed)) % 17) / 100);
  }, [mixer, seed]);

  useEffect(() => {
    const names = CLIP_FOR_MOOD[mood];
    const name = names.find((n) => actions[n]);
    if (!name) return;
    const next = actions[name];
    if (!next) return;

    // on arrête en fondu tout ce qui tourne, puis on enchaîne
    Object.entries(actions).forEach(([n, a]) => {
      if (n !== name && a && a.isRunning()) a.fadeOut(0.35);
    });

    const once = mood === "happy" || mood === "sad" || mood === "answering";
    next.reset();
    next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    next.clampWhenFinished = once;
    next.fadeIn(0.35).play();
    // décalage de départ pour désynchroniser les boucles d'attente
    if (!once) next.time = (Math.abs(Math.trunc(seed)) % 100) / 100 * next.getClip().duration;

    return () => {
      next.fadeOut(0.35);
    };
  }, [actions, mood, seed]);

  return (
    <group ref={group} position={[0, groundY, 0]} scale={scale}>
      <primitive object={model} />
    </group>
  );
}

/** Précharge les modèles d'une partie : évite qu'un candidat apparaisse en retard. */
export function preloadCharacters(indexes: (number | undefined)[]) {
  for (const i of indexes) useGLTF.preload(modelUrl(i));
}

// Les 21 modèles sont connus à l'avance : on laisse le navigateur garder en
// cache ceux déjà vus d'une partie à l'autre.
export const ALL_MODEL_URLS = CHARACTER_NAMES.map((n) => `/models/${n}.glb`);
