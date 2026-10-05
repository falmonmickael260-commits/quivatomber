"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial, Text, RoundedBox } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Character3D, type CharacterMood } from "@/components/stage/Character3D";

/**
 * Plateau de « QUI VA TOMBER ? » en 3D.
 *
 * Le décor est volontairement sombre et presque éteint : la seule vraie
 * source de lumière est le projecteur du candidat qui répond. Il se déplace
 * physiquement d'un pupitre à l'autre quand le tour change — c'est la
 * mécanique visuelle signature du jeu. Les autres candidats restent
 * visibles, juste très peu éclairés.
 *
 * Tout est construit à partir de primitives : aucun modèle, aucune texture
 * à charger. Huit candidats en pied + le décor tiennent en quelques
 * milliers de triangles.
 */

const RED = "#e3122f";
const GOLD = "#d4af37";

export type PlateauPlayer3D = {
  id: string;
  seat?: number;
  name: string;
  avatarSeed: number;
  connected?: boolean;
};

/* ─── placement des sièges sur l'arc ────────────────────────────────── */
const ARC_RADIUS = 7.4;

function seatTransform(index: number, total: number) {
  // Demi-angle de l'arc : il s'ouvre avec le nombre de candidats, mais reste
  // borné pour que les huit bornes tiennent dans le cadre sans déborder.
  const spread = Math.min(0.64, 0.16 + total * 0.06);
  const t = total > 1 ? index / (total - 1) : 0.5;
  const angle = -spread + t * spread * 2;
  return {
    position: [Math.sin(angle) * ARC_RADIUS, 0, ARC_RADIUS - Math.cos(angle) * ARC_RADIUS] as [number, number, number],
    rotationY: -angle,
    angle,
  };
}

/* ─── pupitre ───────────────────────────────────────────────────────── */
const PODIUM_H = 1.04;

function Podium({
  seat,
  name,
  active,
  offline,
}: {
  seat: number;
  name: string;
  active: boolean;
  offline: boolean;
}) {
  const ledMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: active ? RED : "#101827", toneMapped: false }),
    [active]
  );
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0a0d18",
        roughness: 0.22,
        metalness: 0.55,
      }),
    []
  );
  const trimMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: active ? "#ff5f73" : "#4a5169",
        roughness: active ? 0.25 : 0.42,
        metalness: 1,
        emissive: active ? RED : "#121826",
        emissiveIntensity: active ? 1.1 : 0.1,
      }),
    [active]
  );

  return (
    <group>
      {/* anneau lumineux au sol */}
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ledMat}>
        <ringGeometry args={[0.86, 0.96, 48]} />
      </mesh>

      {/* socle, un peu plus large que le fût : le pupitre pose sur le sol */}
      <RoundedBox args={[1.2, 0.09, 0.66]} radius={0.03} smoothness={2} position={[0, 0.045, 0]} material={bodyMat} />
      {/* corps du pupitre */}
      <RoundedBox args={[1.12, PODIUM_H, 0.58]} radius={0.05} smoothness={3} position={[0, PODIUM_H / 2, 0]} material={bodyMat} />
      {/* plan de travail incliné, liseré métal */}
      <mesh position={[0, PODIUM_H + 0.03, 0.03]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[1.18, 0.06, 0.64]} />
        <primitive object={trimMat} attach="material" />
      </mesh>
      {/* arête supérieure claire : accroche la lumière et détache la borne */}
      <mesh position={[0, PODIUM_H - 0.02, 0.295]}>
        <boxGeometry args={[1.1, 0.02, 0.012]} />
        <meshBasicMaterial color={active ? "#ff8a9c" : "#2e3a52"} toneMapped={false} />
      </mesh>
      {/* bandeau LED en façade */}
      <mesh position={[0, 0.14, 0.286]} material={ledMat}>
        <boxGeometry args={[0.92, 0.035, 0.012]} />
      </mesh>

      {/* plaque numéro + pseudo, encastrée dans la façade */}
      <mesh position={[0, PODIUM_H * 0.56, 0.284]}>
        <planeGeometry args={[0.72, 0.46]} />
        <meshStandardMaterial color={active ? "#2a0a12" : "#070b14"} roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0, PODIUM_H * 0.66, 0.288]}>
        <ringGeometry args={[0.165, 0.178, 36]} />
        <meshBasicMaterial color={active ? RED : "#3a4a66"} toneMapped={false} />
      </mesh>
      <Text
        position={[0, PODIUM_H * 0.66, 0.292]}
        fontSize={0.2}
        color={active ? "#ffffff" : "#8694b0"}
        anchorX="center"
        anchorY="middle"
      >
        {String(seat)}
      </Text>
      <Text
        position={[0, PODIUM_H * 0.4, 0.292]}
        fontSize={0.088}
        maxWidth={0.68}
        color={active ? "#ffd9df" : offline ? "#48506033" : "#73809a"}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.06}
      >
        {name.toUpperCase()}
      </Text>
    </group>
  );
}

/* ─── un emplacement : pupitre + candidat derrière ──────────────────── */
function Seat({
  player,
  index,
  total,
  active,
  mood,
}: {
  player: PlateauPlayer3D;
  index: number;
  total: number;
  active: boolean;
  mood: CharacterMood;
}) {
  const { position, rotationY } = seatTransform(index, total);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Podium seat={player.seat ?? index + 1} name={player.name} active={active} offline={player.connected === false} />
      {/* le candidat se tient derrière son pupitre */}
      <group position={[0, 0, -0.46]}>
        <Character3D seed={player.avatarSeed} mood={mood} lit={active} />
      </group>
    </group>
  );
}

/* ─── projecteur mobile ─────────────────────────────────────────────── */
function MovingSpot({ target }: { target: [number, number, number] | null }) {
  const spot = useRef<THREE.SpotLight>(null);
  const aim = useRef<THREE.Object3D>(new THREE.Object3D());
  const cone = useRef<THREE.Mesh>(null);
  const pool = useRef<THREE.Mesh>(null);
  const current = useRef(new THREE.Vector3(0, 0, 0));
  const head = useRef(new THREE.Vector3(0, 7.4, 2.2));

  const coneGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(1, 1, 28, 1, true);
    g.translate(0, -0.5, 0); // pointe en haut, base en bas
    return g;
  }, []);

  useFrame((_, delta) => {
    const k = Math.min(1, delta * 3.2); // suivi doux : tête motorisée
    const t = target ?? current.current;
    current.current.lerp(new THREE.Vector3(t[0], 0, t[2]), k);
    // le boîtier reste au plafond, décalé au-dessus du candidat
    head.current.lerp(new THREE.Vector3(current.current.x * 0.72, 7.4, current.current.z * 0.6 + 2.4), k);

    if (spot.current) {
      spot.current.position.copy(head.current);
      spot.current.intensity += ((target ? 900 : 0) - spot.current.intensity) * k;
    }
    aim.current.position.copy(current.current);
    aim.current.updateMatrixWorld();

    // le cône visible suit la même trajectoire
    if (cone.current) {
      const from = head.current;
      const to = current.current;
      const dir = new THREE.Vector3().subVectors(to, from);
      const len = dir.length();
      cone.current.position.copy(from);
      cone.current.scale.set(1.5, len, 1.5);
      cone.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.clone().normalize());
      const m = cone.current.material as THREE.MeshBasicMaterial;
      m.opacity += ((target ? 0.075 : 0) - m.opacity) * k;
    }
    if (pool.current) {
      pool.current.position.set(current.current.x, 0.02, current.current.z);
      const m = pool.current.material as THREE.MeshBasicMaterial;
      m.opacity += ((target ? 0.3 : 0) - m.opacity) * k;
    }
  });

  return (
    <>
      <primitive object={aim.current} />
      <spotLight
        ref={spot}
        target={aim.current}
        angle={0.3}
        penumbra={0.75}
        distance={22}
        decay={1.5}
        intensity={0}
        color="#fff3e2"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0012}
      />
      {/* faisceau visible */}
      <mesh ref={cone} geometry={coneGeo} renderOrder={2}>
        <meshBasicMaterial
          color="#dce7ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      {/* flaque de lumière au sol */}
      <mesh ref={pool} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <circleGeometry args={[1.5, 40]} />
        <meshBasicMaterial color="#ffe9cd" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </>
  );
}

/* ─── cadrage ───────────────────────────────────────────────────────── */
/**
 * Cadrage de la caméra.
 *
 * Sur grand écran, elle recule à mesure que des candidats s'ajoutent : à
 * quatre elle se rapproche pour que les bornes remplissent le cadre plutôt
 * que de flotter au milieu d'un plateau vide, à huit elle recule juste
 * assez pour garder les bornes des extrémités entières.
 *
 * Sur téléphone (`compact`), aligner huit bornes sur 375 px donnerait des
 * vignettes illisibles. La caméra se rapproche donc et suit latéralement le
 * candidat éclairé, comme une caméra de plateau : il occupe le cadre, ses
 * voisins restent visibles de part et d'autre.
 */
function CameraRig({
  total,
  compact,
  focus,
}: {
  total: number;
  compact: boolean;
  focus: [number, number, number] | null;
}) {
  const { camera } = useThree();
  const want = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const first = useRef(true);

  useFrame((_, delta) => {
    const fx = focus ? focus[0] : 0;
    const fz = focus ? focus[2] : 0;

    if (compact) {
      want.current.set(fx * 0.5, 1.72, fz + 4.5);
      look.current.set(fx * 0.72, 1.3, fz - 0.2);
    } else {
      want.current.set(0, 1.78 + total * 0.022, 6.5 + Math.max(0, total - 4) * 0.56);
      look.current.set(0, 1.24, 0.85);
    }

    // premier rendu : on se place directement, sans glissement
    const k = first.current ? 1 : Math.min(1, delta * 2.4);
    first.current = false;
    camera.position.lerp(want.current, k);
    camera.lookAt(look.current);
  });

  return null;
}

/* ─── décor ─────────────────────────────────────────────────────────── */
function StudioSet() {
  const slats = useMemo(() => {
    const out: { a: number; h: number; red: boolean }[] = [];
    for (let i = 0; i < 34; i++) {
      const a = -1.25 + (i / 33) * 2.5;
      if (Math.abs(a) < 0.3) continue; // dégage l'emplacement de l'enseigne
      out.push({ a, h: 3.4 + ((i * 7) % 5) * 0.5, red: i % 5 === 0 });
    }
    return out;
  }, []);

  const WALL_R = 15;

  return (
    <group>
      {/* mur de fond incurvé */}
      <mesh position={[0, 4, 2]}>
        <cylinderGeometry args={[WALL_R, WALL_R, 9, 64, 1, true, -1.45, 2.9]} />
        <meshStandardMaterial color="#070a13" roughness={0.78} metalness={0.25} side={THREE.BackSide} />
      </mesh>

      {/* lattes verticales sur le mur */}
      {slats.map((s, i) => {
        const x = Math.sin(s.a) * (WALL_R - 0.18);
        const z = 2 - Math.cos(s.a) * (WALL_R - 0.18);
        return (
          <mesh key={i} position={[x, s.h / 2 + 0.4, z]} rotation={[0, -s.a, 0]}>
            <boxGeometry args={[0.16, s.h, 0.06]} />
            <meshStandardMaterial
              color={s.red ? "#2a0710" : "#10131f"}
              roughness={0.5}
              metalness={0.6}
              emissive={s.red ? RED : "#0a1020"}
              emissiveIntensity={s.red ? 0.5 : 0.12}
            />
          </mesh>
        );
      })}

      {/* enseigne du plateau, rétroéclairée */}
      <group position={[0, 5.2, 2 - WALL_R + 0.5]}>
        <mesh>
          <planeGeometry args={[7, 2.6]} />
          <meshStandardMaterial color="#05070e" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[7.5, 3.1]} />
          <meshBasicMaterial color={RED} toneMapped={false} transparent opacity={0.1} />
        </mesh>
        <Text position={[0, 0.52, 0.03]} fontSize={0.82} color="#f4f1ea" anchorX="center" anchorY="middle" letterSpacing={0.04}>
          QUI VA
        </Text>
        <Text position={[0, -0.55, 0.03]} fontSize={1.0} color={RED} anchorX="center" anchorY="middle" letterSpacing={0.03}>
          TOMBER ?
        </Text>
      </group>

      {/* rampe de projecteurs éteints au plafond : on sent le gril technique */}
      {[-6, -3.6, -1.2, 1.2, 3.6, 6].map((x) => (
        <group key={x} position={[x, 7.6, 1.5]}>
          <mesh>
            <cylinderGeometry args={[0.2, 0.26, 0.42, 12]} />
            <meshStandardMaterial color="#0d1019" roughness={0.5} metalness={0.7} />
          </mesh>
          <mesh position={[0, -0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.18, 16]} />
            <meshBasicMaterial color="#9fb0d8" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* sol laqué réfléchissant */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1]} receiveShadow>
        <planeGeometry args={[46, 34]} />
        <MeshReflectorMaterial
          resolution={512}
          blur={[400, 120]}
          mixBlur={1}
          mixStrength={2.6}
          roughness={0.82}
          depthScale={0.8}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color="#05070d"
          metalness={0.62}
          mirror={0.4}
        />
      </mesh>

      {/* arcs rouges incrustés dans le sol */}
      {[6.6, 9.4, 12.6].map((r, i) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 2]}>
          <ringGeometry args={[r, r + 0.055, 96, 1, Math.PI * 0.08, Math.PI * 0.84]} />
          <meshBasicMaterial color={RED} toneMapped={false} transparent opacity={0.4 - i * 0.1} />
        </mesh>
      ))}
    </group>
  );
}

/* ─── scène ─────────────────────────────────────────────────────────── */
function Scene({
  players,
  activeId,
  mood,
  compact,
}: {
  players: PlateauPlayer3D[];
  activeId?: string | null;
  mood: CharacterMood;
  compact: boolean;
}) {
  const total = Math.max(players.length, 1);
  const activeIndex = players.findIndex((p) => p.id === activeId);
  const target =
    activeIndex >= 0 ? seatTransform(activeIndex, total).position : null;

  return (
    <>
      <color attach="background" args={["#03040a"]} />
      <fog attach="fog" args={["#03040a", 14, 34]} />

      {/* Éclairage d'ensemble très faible : le plateau doit être sombre.
          Juste de quoi deviner les candidats qui ne jouent pas. */}
      <ambientLight intensity={0.44} color="#7e92c6" />
      <hemisphereLight args={["#32405f", "#020306", 0.6]} />
      {/* nappe frontale très douce : évite que les visages non éclairés
          tombent dans le noir absolu */}
      <directionalLight position={[0, 4.5, 9]} intensity={0.34} color="#9fb2d8" />
      {/* deux touches de contre-jour fixes, pour détacher les silhouettes */}
      <pointLight position={[-11, 5, -2]} intensity={34} distance={28} decay={2} color={RED} />
      <pointLight position={[11, 5, -2]} intensity={22} distance={28} decay={2} color="#4b6ea8" />

      <CameraRig total={total} compact={compact} focus={target} />
      <StudioSet />
      <MovingSpot target={target} />

      {players.map((p, i) => (
        <Seat
          key={p.id}
          player={p}
          index={i}
          total={total}
          active={p.id === activeId}
          mood={p.id === activeId ? mood : "idle"}
        />
      ))}
    </>
  );
}

export function Plateau3D({
  players,
  activeId,
  mood = "thinking",
  compact = false,
  className = "",
}: {
  players: PlateauPlayer3D[];
  activeId?: string | null;
  mood?: CharacterMood;
  /** Cadrage téléphone : caméra rapprochée qui suit le candidat éclairé. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Canvas
        // Sur téléphone on plafonne la densité de pixels et on coupe les
        // ombres portées : c'est ce qui coûte le plus cher pour ce que ça
        // apporte à cette taille.
        dpr={compact ? [1, 1.4] : [1, 1.75]}
        shadows={!compact}
        camera={{ position: [0, 1.95, 8.6], fov: compact ? 40 : 36 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <Scene players={players} activeId={activeId} mood={mood} compact={compact} />
        </Suspense>
      </Canvas>
    </div>
  );
}
