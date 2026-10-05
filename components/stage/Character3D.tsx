"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { presetFromSeed, type CharacterPreset } from "./characterPresets";

/**
 * Candidat 3D en pied, construit à partir de primitives (capsules, sphères).
 *
 * Aucun modèle ni texture à charger : huit candidats complets coûtent
 * quelques milliers de triangles, ce qui tient sans peine sur mobile. Les
 * géométries et les matériaux sont partagés entre tous les personnages,
 * seules les couleurs changent.
 *
 * Le personnage est debout derrière son pupitre : on le voit de la tête
 * jusqu'aux jambes, le pupitre lui arrivant à la taille.
 */

// ─── géométries partagées ───────────────────────────────────────────────
const G = {
  head: new THREE.SphereGeometry(1, 28, 20),
  headLow: new THREE.SphereGeometry(1, 16, 12),
  hemi: new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
  torso: new THREE.CapsuleGeometry(0.27, 0.36, 8, 20),
  arm: new THREE.CapsuleGeometry(0.085, 0.42, 6, 12),
  forearm: new THREE.CapsuleGeometry(0.075, 0.36, 6, 12),
  leg: new THREE.CapsuleGeometry(0.115, 0.6, 6, 12),
  neck: new THREE.CylinderGeometry(0.085, 0.1, 0.12, 12),
  hand: new THREE.SphereGeometry(0.082, 12, 10),
  foot: new THREE.BoxGeometry(0.17, 0.08, 0.26),
  brow: new THREE.CapsuleGeometry(0.018, 0.075, 3, 6),
  eye: new THREE.SphereGeometry(0.038, 10, 8),
  pupil: new THREE.SphereGeometry(0.019, 8, 6),
  mouth: new THREE.TorusGeometry(0.058, 0.014, 6, 16, Math.PI),
  mouthFlat: new THREE.CapsuleGeometry(0.013, 0.07, 3, 6),
  lens: new THREE.TorusGeometry(0.055, 0.009, 6, 16),
  capBrim: new THREE.CylinderGeometry(0.19, 0.19, 0.02, 16, 1, false, 0, Math.PI),
  band: new THREE.CylinderGeometry(0.202, 0.202, 0.07, 18, 1, true),
  hairTuft: new THREE.ConeGeometry(0.05, 0.14, 6),
  bun: new THREE.SphereGeometry(0.1, 12, 10),
  shoulder: new THREE.SphereGeometry(0.108, 12, 10),
};

function useMat(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02, ...opts }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color, JSON.stringify(opts)]
  );
}

export type CharacterMood = "idle" | "thinking" | "answering" | "happy" | "sad";

/** Hauteur du torse dans le squelette (le reste s'y accroche). */
const TORSO_Y = 1.21;

/* ─── coiffures ─────────────────────────────────────────────────────── */
function Hair({ style, mat }: { style: CharacterPreset["hairStyle"]; mat: THREE.Material }) {
  switch (style) {
    case "buzz":
      return <mesh geometry={G.hemi} material={mat} position={[0, 0.0, 0]} scale={[0.207, 0.16, 0.207]} />;
    case "spiky":
      return (
        <group>
          <mesh geometry={G.hemi} material={mat} scale={[0.208, 0.18, 0.208]} />
          {[-0.09, 0, 0.09].map((x, i) => (
            <mesh
              key={i}
              geometry={G.hairTuft}
              material={mat}
              position={[x, 0.2, -0.01 + (i % 2) * 0.05]}
              rotation={[0.1 * (i - 1), 0, 0.22 * (i - 1)]}
            />
          ))}
        </group>
      );
    case "long":
      return (
        <group>
          <mesh geometry={G.hemi} material={mat} scale={[0.212, 0.2, 0.212]} />
          <mesh geometry={G.head} material={mat} position={[0, -0.14, -0.05]} scale={[0.2, 0.26, 0.17]} />
        </group>
      );
    case "bob":
      return (
        <group>
          <mesh geometry={G.hemi} material={mat} scale={[0.212, 0.19, 0.212]} />
          <mesh geometry={G.head} material={mat} position={[0, -0.05, -0.03]} scale={[0.21, 0.17, 0.2]} />
        </group>
      );
    case "ponytail":
      return (
        <group>
          <mesh geometry={G.hemi} material={mat} scale={[0.21, 0.185, 0.21]} />
          <mesh geometry={G.head} material={mat} position={[0, -0.05, -0.19]} scale={[0.07, 0.19, 0.08]} />
        </group>
      );
    case "bun":
      return (
        <group>
          <mesh geometry={G.hemi} material={mat} scale={[0.21, 0.175, 0.21]} />
          <mesh geometry={G.bun} material={mat} position={[0, 0.14, -0.17]} />
        </group>
      );
    case "afro":
      return <mesh geometry={G.headLow} material={mat} position={[0, 0.05, -0.01]} scale={[0.27, 0.25, 0.26]} />;
    default: // short
      return <mesh geometry={G.hemi} material={mat} scale={[0.209, 0.175, 0.209]} />;
  }
}

/* ─── personnage ────────────────────────────────────────────────────── */
export function Character3D({
  seed,
  mood = "idle",
  lit = false,
}: {
  seed: number;
  mood?: CharacterMood;
  lit?: boolean;
}) {
  const preset = useMemo(() => presetFromSeed(seed), [seed]);

  const skinMat = useMat(preset.skin, { roughness: 0.85 });
  const hairMat = useMat(preset.hair, { roughness: 0.9 });
  const outfitMat = useMat(preset.outfit, { roughness: 0.78 });
  const trouserMat = useMat(preset.trousers, { roughness: 0.84 });
  const eyeWhiteMat = useMat("#f2f0ea", { roughness: 0.3 });
  const pupilMat = useMat(preset.eyes, { roughness: 0.25 });
  const accMat = useMat(preset.accessoryColor, { roughness: 0.4, metalness: 0.3 });
  const shoeMat = useMat("#0e1016", { roughness: 0.55 });
  const collarMat = useMat(preset.outfitAccent, { roughness: 0.7 });

  const body = useRef<THREE.Group>(null);
  const headG = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);

  // Animation volontairement minimale : une respiration lente, et une pose
  // qui change selon le moment du jeu. Rien ne s'agite en permanence.
  const phase = useMemo(() => (Math.abs(seed) % 1000) / 159, [seed]);

  useFrame((st) => {
    const t = st.clock.elapsedTime + phase;
    const breathe = Math.sin(t * 0.9) * 0.012;

    if (body.current) {
      // respiration : on ajoute au niveau du torse, on ne le remplace pas
      body.current.position.y = TORSO_Y + breathe;
      const lean = mood === "answering" ? 0.1 : mood === "thinking" ? 0.06 : mood === "sad" ? 0.16 : 0;
      body.current.rotation.x += (lean - body.current.rotation.x) * 0.08;
    }
    if (headG.current) {
      const tilt =
        mood === "thinking" ? 0.13 : mood === "sad" ? 0.2 : mood === "happy" ? -0.06 : Math.sin(t * 0.5) * 0.03;
      headG.current.rotation.z += (Math.sin(t * 0.4) * 0.03 - headG.current.rotation.z) * 0.05;
      headG.current.rotation.x += (tilt - headG.current.rotation.x) * 0.06;
    }

    // bras : au repos posés sur le pupitre, levés quand ça se passe bien
    const up = mood === "happy" ? -2.5 : mood === "answering" ? -1.15 : -0.95;
    const spread = mood === "happy" ? 0.5 : 0.2;
    if (armL.current) {
      armL.current.rotation.x += (up - armL.current.rotation.x) * 0.09;
      armL.current.rotation.z += (spread - armL.current.rotation.z) * 0.09;
    }
    if (armR.current) {
      armR.current.rotation.x += (up - armR.current.rotation.x) * 0.09;
      armR.current.rotation.z += (-spread - armR.current.rotation.z) * 0.09;
    }
  });

  const w = 0.88 + preset.build * 0.26; // carrure
  // Le squelette ci-dessous mesure ~2.12 unités du sol au sommet du crâne.
  // On le ramène à 1.75 (hauteur d'un adulte à l'échelle du plateau, où
  // 1 unité = 1 m), modulée par la taille propre du personnage.
  const h = (1.88 / 2.12) * preset.height;

  return (
    <group scale={h}>
      <group ref={body} position={[0, TORSO_Y, 0]}>
        {/* ---- torse ---- */}
        <mesh geometry={G.torso} material={outfitMat} scale={[w, 1, 0.84]} />
        {/* col clair, casse le bloc de couleur */}
        <mesh geometry={G.headLow} material={collarMat} position={[0, 0.26, 0.07]} scale={[0.1 * w, 0.055, 0.075]} />
        <mesh geometry={G.shoulder} material={outfitMat} position={[-0.3 * w, 0.25, 0]} />
        <mesh geometry={G.shoulder} material={outfitMat} position={[0.3 * w, 0.25, 0]} />

        {/* ---- cou + tête ---- */}
        <mesh geometry={G.neck} material={skinMat} position={[0, 0.42, 0]} />
        <group ref={headG} position={[0, 0.66, 0]}>
          <mesh geometry={G.head} material={skinMat} scale={[0.2, 0.225, 0.195]} />
          {/* oreilles */}
          <mesh geometry={G.headLow} material={skinMat} position={[-0.195, -0.01, 0]} scale={[0.035, 0.055, 0.03]} />
          <mesh geometry={G.headLow} material={skinMat} position={[0.195, -0.01, 0]} scale={[0.035, 0.055, 0.03]} />

          <Hair style={preset.hairStyle} mat={hairMat} />

          {/* yeux */}
          <group position={[0, 0.02, 0.17]}>
            <mesh geometry={G.eye} material={eyeWhiteMat} position={[-0.068, 0, 0]} scale={[1, 1.05, 0.6]} />
            <mesh geometry={G.eye} material={eyeWhiteMat} position={[0.068, 0, 0]} scale={[1, 1.05, 0.6]} />
            <mesh geometry={G.pupil} material={pupilMat} position={[-0.068, 0, 0.026]} />
            <mesh geometry={G.pupil} material={pupilMat} position={[0.068, 0, 0.026]} />
          </group>
          {/* sourcils */}
          <mesh
            geometry={G.brow}
            material={hairMat}
            position={[-0.068, 0.082, 0.175]}
            rotation={[0, 0, Math.PI / 2 + (mood === "sad" ? -0.3 : mood === "thinking" ? 0.22 : 0.05)]}
          />
          <mesh
            geometry={G.brow}
            material={hairMat}
            position={[0.068, 0.082, 0.175]}
            rotation={[0, 0, Math.PI / 2 + (mood === "sad" ? 0.3 : mood === "thinking" ? -0.22 : -0.05)]}
          />
          {/* bouche */}
          {mood === "happy" ? (
            <mesh geometry={G.mouth} material={pupilMat} position={[0, -0.078, 0.175]} rotation={[0, 0, Math.PI]} />
          ) : mood === "sad" ? (
            <mesh geometry={G.mouth} material={pupilMat} position={[0, -0.055, 0.175]} />
          ) : (
            <mesh geometry={G.mouthFlat} material={pupilMat} position={[0, -0.07, 0.176]} rotation={[0, 0, Math.PI / 2]} />
          )}

          {/* accessoires */}
          {preset.accessory === "glasses" && (
            <group position={[0, 0.02, 0.185]}>
              <mesh geometry={G.lens} material={accMat} position={[-0.068, 0, 0]} />
              <mesh geometry={G.lens} material={accMat} position={[0.068, 0, 0]} />
            </group>
          )}
          {preset.accessory === "cap" && (
            <group position={[0, 0.12, 0]}>
              <mesh geometry={G.hemi} material={accMat} scale={[0.212, 0.11, 0.212]} />
              <mesh geometry={G.capBrim} material={accMat} position={[0, -0.005, 0.1]} rotation={[0, Math.PI, 0]} scale={[1, 1, 1.25]} />
            </group>
          )}
          {preset.accessory === "headband" && (
            <mesh geometry={G.band} material={accMat} position={[0, 0.095, 0]} />
          )}
        </group>

        {/* ---- bras ---- */}
        <group ref={armL} position={[-0.3 * w - 0.03, 0.22, 0]}>
          <mesh geometry={G.arm} material={outfitMat} position={[0, -0.21, 0]} />
          <group position={[0, -0.44, 0]} rotation={[0.55, 0, 0]}>
            <mesh geometry={G.forearm} material={skinMat} position={[0, -0.18, 0]} />
            <mesh geometry={G.hand} material={skinMat} position={[0, -0.38, 0]} />
          </group>
        </group>
        <group ref={armR} position={[0.3 * w + 0.03, 0.22, 0]}>
          <mesh geometry={G.arm} material={outfitMat} position={[0, -0.21, 0]} />
          <group position={[0, -0.44, 0]} rotation={[0.55, 0, 0]}>
            <mesh geometry={G.forearm} material={skinMat} position={[0, -0.18, 0]} />
            <mesh geometry={G.hand} material={skinMat} position={[0, -0.38, 0]} />
          </group>
        </group>
      </group>

      {/* ---- jambes ---- */}
      <group position={[0, 0.44, 0]}>
        <mesh geometry={G.leg} material={trouserMat} position={[-0.13, 0, 0]} />
        <mesh geometry={G.leg} material={trouserMat} position={[0.13, 0, 0]} />
        <mesh geometry={G.foot} material={shoeMat} position={[-0.13, -0.4, 0.05]} />
        <mesh geometry={G.foot} material={shoeMat} position={[0.13, -0.4, 0.05]} />
      </group>
    </group>
  );
}
