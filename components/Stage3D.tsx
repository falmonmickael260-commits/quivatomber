"use client";

import { Canvas } from "@react-three/fiber";
import { MeshReflectorMaterial, Text } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import * as THREE from "three";

/**
 * Vrai décor de plateau TV en 3D (Three.js / React Three Fiber) : pupitres
 * en fer à cheval, sol réfléchissant, mur de fond avec emblème lumineux,
 * projecteurs fixes. Inspiré des techniques du plateau de QuizzMaster
 * (sol MeshReflectorMaterial, mur courbe, faisceaux en cône additifs),
 * recoloré à l'identité noir/rouge/or de ce jeu, sans public ni animateur.
 *
 * Rendu une seule fois (frameloop="demand") : pas d'animation en boucle,
 * c'est la vraie profondeur 3D — lumière, réflexions, matériaux — qui porte
 * l'impression de plateau, pas du mouvement permanent.
 *
 * Desktop uniquement (voir l'appelant) : le rendu WebGL reste derrière la
 * grille HTML existante, qui garde l'affichage des noms/portraits net en 2D.
 */

const GOLD = "#d4af37";
const RED = "#e3122f";

function Pupitre({ index, total, active, highlight }: { index: number; total: number; active: boolean; highlight: boolean }) {
  // Arrange seats on a shallow arc (horseshoe) facing the camera.
  const spread = Math.min(0.78, 0.1 + total * 0.085); // radians of half-arc
  const t = total > 1 ? index / (total - 1) : 0.5;
  const angle = -spread + t * spread * 2;
  const radius = 6.4;
  const x = Math.sin(angle) * radius;
  const z = -Math.cos(angle) * radius + radius; // bring the arc forward, center near z=0

  const ledColor = active ? RED : highlight ? GOLD : "#3a2a30";
  const ledIntensity = active ? 2.2 : highlight ? 1.2 : 0.35;

  return (
    <group position={[x, 0, z]} rotation={[0, -angle, 0]}>
      {/* floor light ring under the stand */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.72, 48]} />
        <meshBasicMaterial color={ledColor} toneMapped={false} transparent opacity={ledIntensity * 0.5} />
      </mesh>
      {/* pupitre body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.85, 1.0, 0.55]} />
        <meshStandardMaterial color="#0a0710" roughness={0.25} metalness={0.5} />
      </mesh>
      {/* gold trim top */}
      <mesh position={[0, 1.01, 0]}>
        <boxGeometry args={[0.9, 0.03, 0.6]} />
        <meshStandardMaterial color={GOLD} roughness={0.25} metalness={1} emissive={GOLD} emissiveIntensity={0.25} />
      </mesh>
      {/* front LED accent strip */}
      <mesh position={[0, 0.18, 0.276]}>
        <boxGeometry args={[0.7, 0.025, 0.01]} />
        <meshBasicMaterial color={ledColor} toneMapped={false} />
      </mesh>
      {/* seat number plate */}
      <Text position={[0, 0.65, 0.29]} fontSize={0.22} color={active ? RED : "#8a8a95"} anchorX="center" anchorY="middle">
        {index + 1}
      </Text>
    </group>
  );
}

function BackWall() {
  const stripes = useMemo(() => {
    const out: { x: number; h: number }[] = [];
    for (let i = -7; i <= 7; i++) {
      if (Math.abs(i) < 2.5) continue; // keep the emblem area clear
      out.push({ x: i * 1.15, h: 2.2 + Math.abs(i % 3) * 0.6 });
    }
    return out;
  }, []);

  return (
    <group position={[0, 0, -8.5]}>
      {/* curved-feeling flat wall (wide plane reads fine at this distance) */}
      <mesh>
        <planeGeometry args={[22, 7]} />
        <meshStandardMaterial color="#0a0610" roughness={0.65} metalness={0.3} />
      </mesh>
      {/* vertical light battens */}
      {stripes.map((s, i) => (
        <mesh key={i} position={[s.x, s.h / 2 - 1.2, 0.05]}>
          <boxGeometry args={[0.04, s.h, 0.02]} />
          <meshBasicMaterial color={i % 2 ? RED : GOLD} toneMapped={false} transparent opacity={0.55} />
        </mesh>
      ))}
      {/* emblem ring — the show's on-air mark, backlit */}
      <group position={[0, 1.1, 0.08]}>
        <mesh>
          <ringGeometry args={[1.55, 1.75, 64]} />
          <meshBasicMaterial color={RED} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <circleGeometry args={[1.55, 64]} />
          <meshStandardMaterial color="#05030a" roughness={0.4} metalness={0.3} />
        </mesh>
        <Text position={[0, 0.18, 0.02]} fontSize={0.32} color="#f4f1ea" anchorX="center" anchorY="middle" letterSpacing={0.05}>
          QUI VA
        </Text>
        <Text position={[0, -0.28, 0.02]} fontSize={0.4} color={RED} anchorX="center" anchorY="middle" letterSpacing={0.03}>
          TOMBER ?
        </Text>
      </group>
    </group>
  );
}

function Beams() {
  const beams = useMemo(
    () => [
      { x: -4.5, color: RED },
      { x: -1.6, color: GOLD },
      { x: 1.6, color: GOLD },
      { x: 4.5, color: RED },
    ],
    []
  );
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.9, 7, 20, 1, true);
    g.translate(0, -3.5, 0);
    return g;
  }, []);
  return (
    <group position={[0, 6.8, -5]}>
      {beams.map((b, i) => (
        <mesh key={i} position={[b.x, 0, 0]} rotation={[0.12, 0, (i % 2 ? 1 : -1) * 0.1]} geometry={geo}>
          <meshBasicMaterial
            color={b.color}
            transparent
            opacity={0.07}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ activeIndex, playerCount }: { activeIndex: number; playerCount: number }) {
  const seats = Math.max(playerCount, 1);
  return (
    <>
      <color attach="background" args={["#05030a"]} />
      <fog attach="fog" args={["#05030a", 10, 26]} />

      <ambientLight intensity={0.28} color="#6a4a55" />
      <hemisphereLight args={["#3a2030", "#05030a", 0.4]} />
      <directionalLight position={[0, 9, 4]} intensity={1.1} color="#fff4e8" />
      <pointLight position={[-6, 4, 2]} intensity={18} distance={20} decay={1.8} color={RED} />
      <pointLight position={[6, 4, 2]} intensity={14} distance={20} decay={1.8} color={GOLD} />
      <spotLight position={[0, 7.5, 2]} angle={0.5} penumbra={0.6} intensity={55} distance={18} decay={1.6} color="#fff4ea" />

      <BackWall />
      <Beams />

      {Array.from({ length: seats }, (_, i) => (
        <Pupitre key={i} index={i} total={seats} active={i === activeIndex} highlight={false} />
      ))}

      {/* reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]}>
        <planeGeometry args={[26, 16]} />
        <MeshReflectorMaterial
          resolution={512}
          blur={[300, 80]}
          mixBlur={1}
          mixStrength={2.2}
          roughness={0.8}
          depthScale={0.6}
          minDepthThreshold={0.5}
          maxDepthThreshold={1.3}
          color="#06040a"
          metalness={0.5}
          mirror={0.35}
        />
      </mesh>
    </>
  );
}

export function Stage3D({ activeIndex = 0, playerCount = 4 }: { activeIndex?: number; playerCount?: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none">
      <Canvas
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ position: [0, 3.4, 9.5], fov: 42 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <Scene activeIndex={activeIndex} playerCount={playerCount} />
        </Suspense>
      </Canvas>
    </div>
  );
}
