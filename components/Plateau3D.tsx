"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial, Text, RoundedBox, useTexture } from "@react-three/drei";
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
  /** Index d'apparence attribué par le serveur. */
  character?: number;
  name: string;
  avatarSeed: number;
  connected?: boolean;
};

/* ─── placement des sièges sur l'arc ────────────────────────────────── */
const ARC_RADIUS = 10.4;
/** Décalage du candidat derrière sa borne. */
const CHARACTER_Z = -0.34;

function seatTransform(index: number, total: number) {
  // Demi-angle de l'arc : il s'ouvre avec le nombre de candidats, mais reste
  // borné pour que les huit bornes tiennent dans le cadre sans déborder.
  const spread = Math.min(0.68, 0.17 + total * 0.064);
  const t = total > 1 ? index / (total - 1) : 0.5;
  const angle = -spread + t * spread * 2;
  const x = Math.sin(angle) * ARC_RADIUS;
  const z = ARC_RADIUS - Math.cos(angle) * ARC_RADIUS;
  const rotationY = -angle;

  // Le candidat se tient en retrait de sa borne : c'est lui que le
  // projecteur doit éclairer, pas le milieu de l'emplacement. On ramène
  // donc sa position locale (0, 0, CHARACTER_Z) en coordonnées monde.
  const characterPos: [number, number, number] = [
    x + CHARACTER_Z * Math.sin(rotationY),
    0,
    z + CHARACTER_Z * Math.cos(rotationY),
  ];

  return {
    position: [x, 0, z] as [number, number, number],
    characterPos,
    rotationY,
    angle,
  };
}

/* ─── pupitre ───────────────────────────────────────────────────────── */
const PODIUM_W = 1.75;
const PODIUM_H = 1.12;
const PODIUM_D = 0.78;
/** La borne est avancée : le candidat tient debout derrière. */
const PODIUM_Z = 0.18;

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
        <ringGeometry args={[1.42, 1.56, 56]} />
      </mesh>

      <group position={[0, 0, PODIUM_Z]}>
        {/* socle */}
        <RoundedBox args={[PODIUM_W + 0.14, 0.1, PODIUM_D + 0.12]} radius={0.03} smoothness={2} position={[0, 0.05, 0]} material={bodyMat} />
        {/* fût */}
        <RoundedBox args={[PODIUM_W, PODIUM_H, PODIUM_D]} radius={0.08} smoothness={3} position={[0, PODIUM_H / 2 + 0.04, 0]} material={bodyMat} />
        {/* plan de travail */}
        <mesh position={[0, PODIUM_H + 0.12, 0]}>
          <boxGeometry args={[PODIUM_W + 0.11, 0.08, PODIUM_D + 0.12]} />
          <primitive object={trimMat} attach="material" />
        </mesh>
        {/* bandeaux LED : pied et arête du plan de travail */}
        <mesh position={[0, 0.14, PODIUM_D / 2 + 0.005]} material={ledMat}>
          <boxGeometry args={[PODIUM_W - 0.16, 0.045, 0.02]} />
        </mesh>
        <mesh position={[0, PODIUM_H + 0.165, PODIUM_D / 2 + 0.055]} material={ledMat}>
          <boxGeometry args={[PODIUM_W + 0.09, 0.03, 0.02]} />
        </mesh>

        {/* façade : numéro + pseudo, encastrés dans le pupitre */}
        <mesh position={[0, PODIUM_H * 0.58, PODIUM_D / 2 + 0.004]}>
          <planeGeometry args={[PODIUM_W - 0.2, PODIUM_H * 0.66]} />
          <meshStandardMaterial color={active ? "#2a0a12" : "#070b14"} roughness={0.35} metalness={0.4} />
        </mesh>
        <mesh position={[0, PODIUM_H * 0.68, PODIUM_D / 2 + 0.008]}>
          <ringGeometry args={[0.235, 0.252, 40]} />
          <meshBasicMaterial color={active ? RED : "#3a4a66"} toneMapped={false} />
        </mesh>
        <Text
          position={[0, PODIUM_H * 0.68, PODIUM_D / 2 + 0.012]}
          fontSize={0.28}
          color={active ? "#ffffff" : "#8694b0"}
          anchorX="center"
          anchorY="middle"
        >
          {String(seat)}
        </Text>
        <Text
          position={[0, PODIUM_H * 0.3, PODIUM_D / 2 + 0.012]}
          fontSize={0.145}
          maxWidth={PODIUM_W - 0.3}
          color={active ? "#ffd9df" : offline ? "#48506055" : "#73809a"}
          anchorX="center"
          anchorY="middle"
          letterSpacing={0.06}
        >
          {name.toUpperCase()}
        </Text>

        {/* arête claire du plan de travail : accroche la lumière */}
        <mesh position={[0, PODIUM_H + 0.157, PODIUM_D / 2 + 0.062]}>
          <boxGeometry args={[PODIUM_W + 0.06, 0.016, 0.012]} />
          <meshBasicMaterial color={active ? "#ff8a9c" : "#2e3a52"} toneMapped={false} />
        </mesh>
      </group>
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
      <group position={[0, 0, CHARACTER_Z]}>
        <Character3D character={player.character} seed={player.avatarSeed} mood={mood} />
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
  const head = useRef(new THREE.Vector3(0, 10.4, 3.1));

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
      spot.current.intensity += ((target ? 2600 : 0) - spot.current.intensity) * k;
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
      cone.current.scale.set(2.2, len, 2.2);
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
        angle={0.27}
        penumbra={0.75}
        distance={32}
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
        <circleGeometry args={[2.2, 40]} />
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
      // on recentre franchement sur le candidat éclairé : sur un écran
      // étroit, le voir de trois quarts au bord ne vaut rien
      // assez de recul pour tenir le candidat entier ET la plaque de sa
      // borne dans un cadre de téléphone, qui est court en hauteur
      want.current.set(fx * 0.85, 2.15, fz + 8.4);
      look.current.set(fx * 0.95, 1.5, fz + 0.4);
    } else {
      want.current.set(0, 2.5 + total * 0.03, 9.2 + Math.max(0, total - 4) * 0.78);
      look.current.set(0, 2.05, 1.2);
    }

    // premier rendu : on se place directement, sans glissement
    const k = first.current ? 1 : Math.min(1, delta * 2.4);
    first.current = false;
    camera.position.lerp(want.current, k);
    camera.lookAt(look.current);
  });

  return null;
}

/* ─── enseigne ──────────────────────────────────────────────────────── */

/**
 * Le logo du jeu, en grand sur le mur de fond. C'est une image à fond
 * transparent posée sur un caisson sombre : elle reste nette (1200 px de
 * large pour ~9 unités à l'écran) et le caisson lui donne l'épaisseur d'un
 * vrai décor de plateau. `toneMapped={false}` pour que les ors ne soient
 * pas écrasés par l'exposition de la scène, volontairement très sombre.
 */
function StageSign() {
  const tex = useTexture("/logo-qvt.png");
  useEffect(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
  }, [tex]);

  const WALL_R = 21;
  const z = 3 - WALL_R + 0.7;

  return (
    <group position={[0, 2.9, z]}>
      {/* caisson */}
      <mesh position={[0, 0, -0.12]}>
        <planeGeometry args={[7.3, 3.6]} />
        <meshStandardMaterial color="#05070e" roughness={0.45} metalness={0.3} />
      </mesh>
      {/* halo rétroéclairé */}
      <mesh position={[0, 0, -0.08]}>
        <planeGeometry args={[8.3, 4.4]} />
        <meshBasicMaterial color={GOLD} toneMapped={false} transparent opacity={0.07} />
      </mesh>
      {/* le logo */}
      <mesh>
        <planeGeometry args={[6.6, 4.4]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ─── décor ─────────────────────────────────────────────────────────── */
function StudioSet() {
  const slats = useMemo(() => {
    const out: { a: number; h: number; red: boolean }[] = [];
    for (let i = 0; i < 34; i++) {
      const a = -1.25 + (i / 33) * 2.5;
      if (Math.abs(a) < 0.3) continue; // dégage l'emplacement de l'enseigne
      out.push({ a, h: 4.8 + ((i * 7) % 5) * 0.7, red: i % 5 === 0 });
    }
    return out;
  }, []);

  const WALL_R = 21;

  return (
    <group>
      {/* mur de fond incurvé */}
      <mesh position={[0, 5.6, 3]}>
        <cylinderGeometry args={[WALL_R, WALL_R, 12.6, 64, 1, true, -1.45, 2.9]} />
        <meshStandardMaterial color="#070a13" roughness={0.78} metalness={0.25} side={THREE.BackSide} />
      </mesh>

      {/* lattes verticales sur le mur */}
      {slats.map((s, i) => {
        const x = Math.sin(s.a) * (WALL_R - 0.25);
        const z = 3 - Math.cos(s.a) * (WALL_R - 0.25);
        return (
          <mesh key={i} position={[x, s.h / 2 + 0.5, z]} rotation={[0, -s.a, 0]}>
            <boxGeometry args={[0.22, s.h, 0.08]} />
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

      {/* enseigne du plateau : le logo du jeu, monté sur un caisson
          rétroéclairé contre le mur de fond */}
      <StageSign />

      {/* rampe de projecteurs éteints au plafond : on sent le gril technique */}
      {[-8.4, -5, -1.7, 1.7, 5, 8.4].map((x) => (
        <group key={x} position={[x, 10.6, 2]}>
          <mesh>
            <cylinderGeometry args={[0.28, 0.36, 0.6, 12]} />
            <meshStandardMaterial color="#0d1019" roughness={0.5} metalness={0.7} />
          </mesh>
          <mesh position={[0, -0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.25, 16]} />
            <meshBasicMaterial color="#9fb0d8" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* sol laqué réfléchissant */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.5]} receiveShadow>
        <planeGeometry args={[64, 48]} />
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
      {[9.2, 13.2, 17.6].map((r, i) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 2.8]}>
          <ringGeometry args={[r, r + 0.08, 96, 1, Math.PI * 0.08, Math.PI * 0.84]} />
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
  const target = activeIndex >= 0 ? seatTransform(activeIndex, total).characterPos : null;

  return (
    <>
      <color attach="background" args={["#03040a"]} />
      <fog attach="fog" args={["#03040a", 20, 50]} />

      {/* Il n'y a qu'une vraie source sur ce plateau : le projecteur du
          candidat qui répond. Le reste n'est là que pour que le décor ne
          soit pas un rectangle noir et que les silhouettes des autres
          candidats se devinent — pas pour éclairer leur visage. */}
      <ambientLight intensity={0.07} color="#6d80b4" />
      <hemisphereLight args={["#1b2338", "#010204", 0.13]} />
      {/* contre-jours fixes, placés derrière l'arc : ils détourent les
          candidats au lieu de les éclairer de face */}
      <pointLight position={[-15, 7, -5]} intensity={40} distance={40} decay={2} color={RED} />
      <pointLight position={[15, 7, -5]} intensity={26} distance={40} decay={2} color="#4b6ea8" />

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
        camera={{ position: [0, 2.7, 12.3], fov: compact ? 40 : 36 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <Suspense fallback={null}>
          <Scene players={players} activeId={activeId} mood={mood} compact={compact} />
        </Suspense>
      </Canvas>
    </div>
  );
}
