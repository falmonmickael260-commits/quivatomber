"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { portraitUrl } from "@/components/stage/characterPresets";

/**
 * Plateau de « QUI VA TOMBER ? » — décor de studio TV en CSS + SVG.
 *
 * Remplace l'ancien décor WebGL (Three.js) : à distance de caméra fixe, un
 * vrai moteur 3D ne gagnait rien de visible mais coûtait ~600 Ko de JS et
 * un canvas plein écran à repeindre. Ici tout est composé — mur de fond
 * SVG, sol en dégradé, bornes en CSS, bustes masqués — donc net en Retina,
 * léger sur mobile, et sans aucune animation en boucle.
 *
 * Le seul mouvement du plateau est le projecteur : il se déplace d'une
 * borne à l'autre quand le tour change (transform GPU, une transition).
 *
 * Profondeur : le buste du personnage est rendu derrière sa borne, la
 * borne le recouvre à la taille — « personnage → borne → numéro + pseudo ».
 */

export type PlateauPlayer = {
  id: string;
  seat?: number;
  character?: number;
  name: string;
  avatarSeed: number;
  connected?: boolean;
  eliminated?: boolean;
};

/* Position d'un siège sur l'arc : les bornes du centre sont légèrement plus
   loin de la caméra (plus petites, plus hautes), celles des bords plus
   proches — c'est ce qui donne le fer à cheval sans perspective réelle. */
function arcAt(index: number, total: number) {
  const u = total > 1 ? (index / (total - 1)) * 2 - 1 : 0;
  const centerness = 1 - u * u; // 1 au centre, 0 aux extrémités
  return {
    scale: 1 - centerness * 0.1,
    lift: centerness * 0.085, // fraction de la hauteur du siège, vers le haut
  };
}

/* ------------------------------------------------------------------ */
/* Décor : mur de fond + sol                                           */
/* ------------------------------------------------------------------ */

function StudioSet() {
  // Lattes verticales du mur, pré-calculées : le décor est statique.
  const slats = useMemo(() => {
    const out: { x: number; w: number; o: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const x = 18 + i * 61;
      if (x > 545 && x < 1055) continue; // emplacement de l'enseigne
      out.push({ x, w: 24 + ((i * 7) % 20), o: 0.035 + ((i * 13) % 5) * 0.016 });
    }
    return out;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* ---------------- mur de fond ---------------- */}
      <div className="absolute inset-x-0 top-0" style={{ height: "74%" }}>
        <svg className="w-full h-full" viewBox="0 0 1600 620" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pl-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a0e1a" />
              <stop offset="60%" stopColor="#070a13" />
              <stop offset="100%" stopColor="#04050c" />
            </linearGradient>
            <radialGradient id="pl-wall-center" cx="50%" cy="34%" r="56%">
              <stop offset="0%" stopColor="#1a2136" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#1a2136" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="pl-rim-red" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff2d4a" stopOpacity="0" />
              <stop offset="32%" stopColor="#e3122f" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#7a0a1c" stopOpacity="0.06" />
            </linearGradient>
            <radialGradient id="pl-haze" cx="50%" cy="2%" r="68%">
              <stop offset="0%" stopColor="#7d8fbd" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#7d8fbd" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="1600" height="620" fill="url(#pl-wall)" />
          <rect x="0" y="0" width="1600" height="620" fill="url(#pl-wall-center)" />

          {/* lattes métal sombre, plus marquées vers le centre */}
          {slats.map((sl, i) => (
            <rect key={i} x={sl.x} y={34} width={sl.w} height={586} fill="#b6c4e2" opacity={sl.o} />
          ))}
          {/* joints verticaux entre les lattes */}
          {slats.map((sl, i) => (
            <rect key={`j${i}`} x={sl.x - 2} y={34} width={1.5} height={586} fill="#000" opacity="0.5" />
          ))}

          {/* panneaux latéraux inclinés : referment le décor sur les côtés */}
          <path d="M0,0 L190,0 L150,620 L0,620 Z" fill="#000" opacity="0.45" />
          <path d="M1600,0 L1410,0 L1450,620 L1600,620 Z" fill="#000" opacity="0.45" />

          {/* montants lumineux rouges */}
          <rect x="24" y="60" width="10" height="520" fill="url(#pl-rim-red)" />
          <rect x="118" y="120" width="5" height="440" fill="url(#pl-rim-red)" opacity="0.5" />
          <rect x="1566" y="60" width="10" height="520" fill="url(#pl-rim-red)" />
          <rect x="1477" y="120" width="5" height="440" fill="url(#pl-rim-red)" opacity="0.5" />

          {/* rampe de projecteurs au plafond */}
          {[180, 400, 620, 980, 1200, 1420].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="20" rx="27" ry="10" fill="#0e1220" />
              <ellipse cx={x} cy="21" rx="13" ry="5" fill="#e6edff" opacity="0.55" />
              <ellipse cx={x} cy="58" rx="82" ry="40" fill="#cddaff" opacity="0.055" />
            </g>
          ))}

          {/* voile de fumée sous la rampe : donne du volume au noir */}
          <rect x="0" y="0" width="1600" height="420" fill="url(#pl-haze)" />
        </svg>
      </div>

      {/* ---------------- ligne d'horizon ---------------- */}
      <div className="absolute inset-x-0" style={{ top: "74%", height: 3, background: "#000", opacity: 0.85 }} />
      <div
        className="absolute inset-x-0"
        style={{
          top: "calc(74% - 2px)",
          height: 2,
          background: "linear-gradient(90deg, transparent, rgba(227,18,47,0.45), transparent)",
        }}
      />

      {/* ---------------- sol ---------------- */}
      <div className="absolute inset-x-0 bottom-0" style={{ top: "74%" }}>
        <svg className="w-full h-full" viewBox="0 0 1600 260" preserveAspectRatio="none">
          <defs>
            <linearGradient id="pl-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c1120" />
              <stop offset="40%" stopColor="#06080f" />
              <stop offset="100%" stopColor="#010205" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="1600" height="260" fill="url(#pl-floor)" />
          {/* reflet diffus du mur sur le sol laqué */}
          <rect x="0" y="0" width="1600" height="110" fill="#7389c4" opacity="0.06" />
          {/* arcs lumineux incrustés dans le sol — signature du plateau */}
          <ellipse cx="800" cy="54" rx="520" ry="40" fill="none" stroke="#e3122f" strokeWidth="2.5" opacity="0.45" />
          <ellipse cx="800" cy="132" rx="760" ry="72" fill="none" stroke="#e3122f" strokeWidth="3" opacity="0.3" />
          <ellipse cx="800" cy="232" rx="1020" ry="96" fill="none" stroke="#e3122f" strokeWidth="2" opacity="0.16" />
          <ellipse cx="800" cy="18" rx="360" ry="24" fill="none" stroke="#9fb4e8" strokeWidth="1.5" opacity="0.12" />
        </svg>
      </div>

      {/* ---------------- vignette ---------------- */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 72% 68% at 50% 45%, transparent 48%, rgba(0,0,0,0.9) 100%)",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Enseigne du plateau (texte HTML : net à tous les zooms)             */
/* ------------------------------------------------------------------ */

function StageSign() {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none select-none text-center"
      style={{ top: "4%" }}
    >
      <div className="relative px-6 py-3 md:px-10 md:py-4">
        {/* plaque de l'enseigne, encastrée dans le mur */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: "linear-gradient(180deg, rgba(14,19,32,0.92), rgba(4,6,12,0.95))",
            border: "1px solid rgba(160,180,225,0.14)",
            boxShadow: "0 18px 50px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "130%",
            height: "150%",
            background: "radial-gradient(ellipse at center, rgba(227,18,47,0.3), transparent 68%)",
            filter: "blur(16px)",
          }}
        />
        <p
          className="relative font-display uppercase leading-[0.86] text-white"
          style={{
            fontSize: "clamp(1.4rem, 3.4vw, 3.4rem)",
            letterSpacing: "0.02em",
            textShadow: "0 2px 0 rgba(0,0,0,0.7), 0 0 34px rgba(227,18,47,0.55)",
          }}
        >
          QUI VA
          <br />
          <span className="text-blood">TOMBER&nbsp;?</span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Projecteur mobile                                                   */
/* ------------------------------------------------------------------ */

function Spotlight({
  x,
  width,
  tilt,
  visible,
  reduced,
}: {
  x: number;
  width: number;
  tilt: number;
  visible: boolean;
  reduced: boolean;
}) {
  const travel = reduced ? "none" : "transform 900ms cubic-bezier(0.65, 0.05, 0.36, 1)";
  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none"
      style={{
        left: 0,
        width: 0,
        transform: `translate3d(${x}px, 0, 0)`,
        transition: travel,
        opacity: visible ? 1 : 0,
        willChange: "transform",
      }}
      aria-hidden
    >
      {/* boîtier du projecteur sur son rail, au plafond */}
      <div
        className="absolute -translate-x-1/2"
        style={{
          top: "-0.5%",
          width: width * 0.42,
          height: width * 0.17,
          borderRadius: "999px",
          background: "linear-gradient(180deg,#20273a,#090c15)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.16)",
          transition: travel,
        }}
      />
      <div
        className="absolute -translate-x-1/2"
        style={{
          top: `${width * 0.1}px`,
          width: width * 0.22,
          height: width * 0.08,
          borderRadius: "999px",
          background: "radial-gradient(ellipse at center, #ffffff, rgba(255,255,255,0.1) 70%, transparent)",
          filter: "blur(1px)",
        }}
      />

      {/* le faisceau : cône dégradé, légèrement incliné selon la position */}
      <div
        className="absolute left-0 top-0 h-full"
        style={{
          width: width * 3.1,
          marginLeft: -(width * 3.1) / 2,
          transformOrigin: "50% 0%",
          transform: `rotate(${tilt}deg)`,
          transition: travel,
          clipPath: "polygon(47% 0%, 53% 0%, 86% 100%, 14% 100%)",
          background:
            "linear-gradient(180deg, rgba(226,236,255,0.30) 0%, rgba(214,228,255,0.15) 30%, rgba(200,216,255,0.06) 62%, rgba(190,208,255,0.015) 85%, transparent 100%)",
          filter: "blur(5px)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Une borne + son personnage                                          */
/* ------------------------------------------------------------------ */

function Seat({
  player,
  index,
  total,
  active,
  seatWidth,
  innerRef,
  dimmed,
}: {
  player: PlateauPlayer;
  index: number;
  total: number;
  active: boolean;
  seatWidth: number;
  innerRef?: (el: HTMLDivElement | null) => void;
  dimmed: boolean;
}) {
  const { scale, lift } = arcAt(index, total);
  // Les visuels de personnage sont des bustes carrés (256x256) : on les
  // affiche dans un cadre carré et SANS rognage, sinon `object-cover`
  // mange les épaules et il ne reste qu'une tête flottante.
  const charW = seatWidth * 1.12;
  const charH = charW;
  const podiumH = seatWidth * 0.98;
  const offline = player.connected === false;

  return (
    <div
      ref={innerRef}
      className="relative flex flex-col items-center shrink-0"
      style={{
        width: seatWidth,
        transform: `translateY(${-lift * charH + (active ? 4 : 0)}px) scale(${scale * (active ? 1.06 : 1)})`,
        transformOrigin: "50% 100%",
        transition: "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
        zIndex: active ? 2 : 1,
      }}
    >
      {/* ---- personnage, derrière la borne ---- */}
      <div
        className="relative"
        style={{
          width: charW,
          height: charH,
          zIndex: 1,
        }}
      >
        {/* halo au sol derrière le candidat quand il est éclairé */}
        {active && (
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              bottom: "6%",
              width: "150%",
              height: "46%",
              background: "radial-gradient(ellipse at center, rgba(255,240,220,0.22), transparent 70%)",
              filter: "blur(10px)",
            }}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={portraitUrl(player.character, player.avatarSeed)}
          alt=""
          width={256}
          height={256}
          draggable={false}
          className="relative w-full h-full object-contain select-none"
          style={{
            // Les visuels ont un fond uni #03040b (noir quasi pur) et pas de
            // canal alpha : en fusion `screen`, ce fond n'ajoute rien et
            // disparaît dans le décor — on récupère une découpe propre du
            // candidat sans toucher aux assets. Le masque ne sert plus qu'à
            // fondre le bas du buste derrière la borne.
            mixBlendMode: "screen",
            WebkitMaskImage: "linear-gradient(to bottom, #000 78%, rgba(0,0,0,0.65) 93%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, #000 78%, rgba(0,0,0,0.65) 93%, transparent 100%)",
            filter: active
              ? "brightness(1.22) contrast(1.08) saturate(1.1)"
              : offline
              ? "brightness(0.3) saturate(0.15)"
              : `brightness(${dimmed ? 0.42 : 0.62}) saturate(0.5) contrast(0.95)`,
            transition: "filter 650ms ease",
          }}
        />
      </div>

      {/* ---- la borne, au premier plan ---- */}
      <div
        className="relative w-full"
        style={{ height: podiumH, marginTop: -charH * 0.2, zIndex: 2 }}
      >
        {/* corps trapézoïdal, verre sombre + métal */}
        <div
          className="absolute inset-0"
          style={{
            clipPath: "polygon(7% 0%, 93% 0%, 100% 100%, 0% 100%)",
            background: active
              ? "linear-gradient(180deg, #2a1420 0%, #150a12 48%, #090509 100%)"
              : "linear-gradient(180deg, #161b2b 0%, #0b0e18 50%, #05070d 100%)",
            boxShadow: active
              ? "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 26px rgba(227,18,47,0.3)"
              : "inset 0 1px 0 rgba(255,255,255,0.1)",
            transition: "background 650ms ease, box-shadow 650ms ease",
          }}
        />
        {/* liseré supérieur */}
        <div
          className="absolute left-[7%] right-[7%] top-0"
          style={{
            height: 2,
            background: active
              ? "linear-gradient(90deg, transparent, #ff6d80, transparent)"
              : "linear-gradient(90deg, transparent, rgba(190,206,240,0.4), transparent)",
            transition: "background 650ms ease",
          }}
        />
        {/* bandeau LED en pied de borne */}
        <div
          className="absolute bottom-[8%] left-[6%] right-[6%]"
          style={{
            height: Math.max(2, seatWidth * 0.022),
            borderRadius: 999,
            background: active ? "#ff2f4b" : "rgba(150,170,215,0.16)",
            boxShadow: active ? "0 0 16px 3px rgba(227,18,47,0.75)" : "none",
            transition: "background 650ms ease, box-shadow 650ms ease",
          }}
        />
        {/* contour rouge du candidat actif */}
        {active && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              clipPath: "polygon(7% 0%, 93% 0%, 100% 100%, 0% 100%)",
              boxShadow: "inset 0 0 0 2px rgba(255,61,88,0.9)",
              filter: "drop-shadow(0 0 18px rgba(227,18,47,0.65))",
            }}
          />
        )}

        {/* pastille numéro + pseudo */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center rounded-full"
          style={{
            top: "-14%",
            width: seatWidth * 0.66,
            height: seatWidth * 0.66,
            background: active
              ? "radial-gradient(circle at 50% 35%, #2b0d16, #0a0407)"
              : "radial-gradient(circle at 50% 35%, #121726, #05070d)",
            border: `2px solid ${active ? "rgba(255,61,88,0.95)" : "rgba(170,190,235,0.22)"}`,
            boxShadow: active
              ? "0 0 22px rgba(227,18,47,0.8), inset 0 0 14px rgba(227,18,47,0.35)"
              : "inset 0 1px 0 rgba(255,255,255,0.08)",
            transition: "all 650ms ease",
          }}
        >
          <span
            className="font-display leading-none text-white"
            style={{ fontSize: seatWidth * 0.27, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
          >
            {player.seat ?? index + 1}
          </span>
          <span
            className="font-semibold uppercase leading-none truncate max-w-[92%] text-center"
            style={{
              fontSize: Math.max(7.5, seatWidth * 0.088),
              letterSpacing: "0.06em",
              marginTop: seatWidth * 0.03,
              color: active ? "#ffd9df" : "rgba(226,232,245,0.62)",
            }}
            title={player.name}
          >
            {player.name}
          </span>
        </div>
      </div>

      {/* reflet de la borne sur le sol laqué */}
      <div
        className="w-[86%]"
        style={{
          height: podiumH * 0.38,
          marginTop: 1,
          transform: "scaleY(-1)",
          opacity: active ? 0.26 : 0.13,
          background: active
            ? "linear-gradient(0deg, transparent, rgba(227,18,47,0.5))"
            : "linear-gradient(0deg, transparent, rgba(150,170,215,0.3))",
          clipPath: "polygon(7% 0%, 93% 0%, 100% 100%, 0% 100%)",
          filter: "blur(2px)",
          transition: "opacity 650ms ease",
        }}
        aria-hidden
      />

      {/* flaque de lumière au sol sous le candidat éclairé */}
      {active && (
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full pointer-events-none"
          style={{
            bottom: -podiumH * 0.22,
            width: seatWidth * 2,
            height: seatWidth * 0.5,
            background:
              "radial-gradient(ellipse at center, rgba(255,235,205,0.3), rgba(227,18,47,0.12) 45%, transparent 72%)",
            filter: "blur(8px)",
            zIndex: 0,
          }}
          aria-hidden
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plateau                                                             */
/* ------------------------------------------------------------------ */

export function Plateau({
  players,
  activeId,
  className = "",
}: {
  players: PlateauPlayer[];
  activeId?: string | null;
  className?: string;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const seatEls = useRef<Map<string, HTMLDivElement>>(new Map());

  const [beam, setBeam] = useState({ x: 0, width: 110, tilt: 0, ready: false });
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  const total = players.length;
  const activeIndex = players.findIndex((p) => p.id === activeId);

  // Position du faisceau : mesurée une fois par changement de tour (et au
  // redimensionnement). Le déplacement lui-même est une transition CSS.
  useLayoutEffect(() => {
    const measure = () => {
      const stage = stageRef.current;
      const el = activeId ? seatEls.current.get(activeId) : null;
      if (!stage || !el) {
        setBeam((b) => ({ ...b, ready: false }));
        return;
      }
      const sr = stage.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      const cx = er.left + er.width / 2 - sr.left;
      // le projecteur pivote depuis le centre du plafond : plus la borne est
      // excentrée, plus le faisceau est incliné
      const tilt = sr.width > 0 ? ((cx - sr.width / 2) / sr.width) * 13 : 0;
      setBeam({ x: cx, width: er.width || 110, tilt, ready: true });
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (stageRef.current) ro.observe(stageRef.current);
    if (rowRef.current) ro.observe(rowRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeId, total]);

  // Largeur d'une borne : elle rétrécit à mesure que les candidats
  // s'ajoutent, pour que 4 comme 8 joueurs remplissent le plateau sans
  // jamais se chevaucher.
  const seatWidth = useMemo(() => {
    const byCount: Record<number, string> = {
      1: "clamp(130px, 16vw, 220px)",
      2: "clamp(120px, 14vw, 200px)",
      3: "clamp(110px, 12.6vw, 184px)",
      4: "clamp(102px, 11.6vw, 172px)",
      5: "clamp(94px, 10.6vw, 160px)",
      6: "clamp(88px, 9.8vw, 148px)",
      7: "clamp(82px, 9.1vw, 138px)",
      8: "clamp(76px, 8.5vw, 130px)",
    };
    return byCount[Math.min(8, Math.max(1, total))] || byCount[8];
  }, [total]);

  const [seatPx, setSeatPx] = useState(110);
  useLayoutEffect(() => {
    const probe = rowRef.current?.querySelector<HTMLElement>("[data-seat]");
    if (probe) setSeatPx(probe.getBoundingClientRect().width || 110);
  }, [seatWidth, total]);

  return (
    <div
      ref={stageRef}
      className={`relative w-full overflow-hidden select-none ${className}`}
      style={{ containIntrinsicSize: "auto" }}
    >
      {/* Ordre de peinture volontairement sans z-index : un contexte
          d'empilement isolerait les bustes et empêcherait leur fusion
          `screen` de voir le décor. Le faisceau est placé avant la rangée
          pour éclairer les candidats sans les voiler. */}
      <StudioSet />
      <StageSign />

      <Spotlight
        x={beam.x}
        width={beam.width}
        tilt={beam.tilt}
        visible={beam.ready && activeIndex >= 0}
        reduced={reduced}
      />

      {/* rangée de bornes */}
      <div
        ref={rowRef}
        className="relative flex items-end justify-center w-full"
        style={{
          gap: "clamp(4px, 0.8vw, 16px)",
          paddingTop: "clamp(96px, 17vh, 236px)",
          paddingBottom: "clamp(34px, 7vh, 96px)",
          paddingLeft: "2%",
          paddingRight: "2%",
        }}
      >
        {players.map((p, i) => (
          <div key={p.id} data-seat style={{ width: seatWidth }}>
            <Seat
              player={p}
              index={i}
              total={total}
              active={p.id === activeId}
              seatWidth={seatPx}
              dimmed={!!activeId}
              innerRef={(el) => {
                if (el) seatEls.current.set(p.id, el);
                else seatEls.current.delete(p.id);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plateau mobile                                                      */
/* ------------------------------------------------------------------ */

/**
 * Sur téléphone, aligner 8 bornes donnerait des vignettes illisibles et un
 * débordement horizontal. On garde donc le même décor et le même projecteur,
 * mais la composition change : le candidat éclairé occupe la scène, et les
 * autres restent présents sous forme de bornes miniatures — visibles, plus
 * sombres, jamais masqués.
 */
export function PlateauMobile({
  players,
  activeId,
  className = "",
}: {
  players: PlateauPlayer[];
  activeId?: string | null;
  className?: string;
}) {
  const active = players.find((p) => p.id === activeId) || null;
  const others = players.filter((p) => p.id !== activeId);

  return (
    <div className={`relative w-full overflow-hidden select-none ${className}`}>
      <StudioSet />

      {/* faisceau fixe au centre : c'est le candidat qui entre dans la
          lumière, pas le projecteur qui traverse l'écran */}
      {active && (
        <div className="absolute inset-0 z-[3] pointer-events-none" aria-hidden>
          <div
            className="absolute left-1/2 top-0 h-full"
            style={{
              width: "76%",
              marginLeft: "-38%",
              clipPath: "polygon(46% 0%, 54% 0%, 88% 100%, 12% 100%)",
              background:
                "linear-gradient(180deg, rgba(226,236,255,0.28) 0%, rgba(214,228,255,0.13) 34%, rgba(200,216,255,0.05) 66%, transparent 100%)",
              filter: "blur(5px)",
              mixBlendMode: "screen",
            }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{
              top: 2,
              width: 44,
              height: 13,
              background: "linear-gradient(180deg,#20273a,#090c15)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          />
        </div>
      )}

      <div className="relative z-[4] flex flex-col items-center px-3 pt-8 pb-3">
        {active ? (
          <div key={active.id} className="flex flex-col items-center w-full">
            <div className="relative" style={{ width: 168, height: 168 }}>
              <div
                className="absolute left-1/2 -translate-x-1/2 rounded-full"
                style={{
                  bottom: "8%",
                  width: "160%",
                  height: "44%",
                  background: "radial-gradient(ellipse at center, rgba(255,240,220,0.22), transparent 70%)",
                  filter: "blur(10px)",
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={portraitUrl(active.character, active.avatarSeed)}
                alt=""
                width={256}
                height={256}
                draggable={false}
                className="relative w-full h-full object-contain"
                style={{
                  WebkitMaskImage:
                    "radial-gradient(ellipse 76% 86% at 50% 46%, #000 62%, rgba(0,0,0,0.6) 82%, transparent 100%)",
                  maskImage:
                    "radial-gradient(ellipse 76% 86% at 50% 46%, #000 62%, rgba(0,0,0,0.6) 82%, transparent 100%)",
                  filter: "brightness(1.22) contrast(1.08) saturate(1.1)",
                }}
              />
            </div>

            {/* borne du candidat en lumière */}
            <div className="relative" style={{ width: 176, height: 62, marginTop: -34 }}>
              <div
                className="absolute inset-0"
                style={{
                  clipPath: "polygon(7% 0%, 93% 0%, 100% 100%, 0% 100%)",
                  background: "linear-gradient(180deg, #2a1420 0%, #150a12 48%, #090509 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 26px rgba(227,18,47,0.3), inset 0 0 0 2px rgba(255,61,88,0.85)",
                }}
              />
              <div
                className="absolute bottom-[10%] left-[8%] right-[8%] rounded-full"
                style={{ height: 3, background: "#ff2f4b", boxShadow: "0 0 14px 3px rgba(227,18,47,0.75)" }}
              />
              <div
                className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center rounded-full"
                style={{
                  top: -22,
                  width: 64,
                  height: 64,
                  background: "radial-gradient(circle at 50% 35%, #2b0d16, #0a0407)",
                  border: "2px solid rgba(255,61,88,0.95)",
                  boxShadow: "0 0 22px rgba(227,18,47,0.8), inset 0 0 14px rgba(227,18,47,0.35)",
                }}
              >
                <span className="font-display text-xl leading-none text-white">{active.seat ?? "?"}</span>
                <span
                  className="font-semibold uppercase leading-none truncate max-w-[84%] text-center text-[8px] tracking-wider mt-0.5"
                  style={{ color: "#ffd9df" }}
                >
                  {active.name}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ height: 196 }} />
        )}

        {/* les autres candidats : présents, dans l'ombre */}
        {others.length > 0 && (
          <div className="flex items-end justify-center gap-1.5 mt-4 w-full">
            {others.map((p) => (
              <div
                key={p.id}
                className="flex flex-col items-center"
                style={{ width: `min(${100 / Math.max(others.length, 1)}%, 52px)` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={portraitUrl(p.character, p.avatarSeed)}
                  alt=""
                  width={256}
                  height={256}
                  draggable={false}
                  className="w-full aspect-square object-contain"
                  style={{
                    WebkitMaskImage:
                      "radial-gradient(ellipse 76% 84% at 50% 46%, #000 60%, transparent 100%)",
                    maskImage: "radial-gradient(ellipse 76% 84% at 50% 46%, #000 60%, transparent 100%)",
                    filter:
                      p.connected === false
                        ? "brightness(0.28) saturate(0.1)"
                        : "brightness(0.45) saturate(0.4)",
                  }}
                />
                <div
                  className="w-full flex items-center justify-center -mt-2"
                  style={{
                    height: 18,
                    clipPath: "polygon(9% 0%, 91% 0%, 100% 100%, 0% 100%)",
                    background: "linear-gradient(180deg, #141927 0%, #06080f 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                  }}
                >
                  <span className="font-display text-[11px] leading-none text-white/55">
                    {p.seat ?? "?"}
                  </span>
                </div>
                <span className="text-[8px] uppercase tracking-wide text-steel/70 truncate w-full text-center mt-0.5">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Décor seul, en fond d'écran                                         */
/* ------------------------------------------------------------------ */

/**
 * Le même studio, sans bornes, en fond plein écran — utilisé par les phases
 * qui ne montrent pas les candidats à leur borne (vote, révélation,
 * élimination, transition, finale). Garde la continuité du décor d'une
 * phase à l'autre : on ne quitte jamais le plateau.
 */
export function StudioSetBackdrop() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden>
      <StudioSet />
    </div>
  );
}
