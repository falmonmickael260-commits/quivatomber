import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import { Background } from "@/components/Background";
import { Plateau, PlateauMobile, StudioSetBackdrop } from "@/components/Plateau";
import dynamic from "next/dynamic";
import { WebGLGuard, hasWebGL } from "@/components/WebGLGuard";

/**
 * Le plateau 3D embarque Three.js (~300 Ko). On ne le charge qu'au moment
 * où une manche commence : l'accueil, le lobby et les écrans de vote
 * s'affichent sans l'attendre. `ssr: false` car il n'y a pas de WebGL
 * côté serveur.
 */
const Plateau3D = dynamic(() => import("@/components/Plateau3D").then((m) => m.Plateau3D), {
  ssr: false,
});
import { MuteButton, BigButton, Panel } from "@/components/UI";
import { CharacterPortrait } from "@/components/CharacterPortrait";
import { AnimatedAmount, formatEuro } from "@/components/AnimatedAmount";
import { Logo } from "@/components/Logo";
import { useSocket } from "@/hooks/useSocket";
import { useSound } from "@/hooks/useSound";
import { loadSession, saveSession, clearSession } from "@/lib/session";

function useCountdown(deadline: number | null) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!deadline) {
      setRemaining(0);
      return;
    }
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadline]);
  return remaining;
}

export default function GamePage() {
  const router = useRouter();
  const { code } = router.query as { code?: string };
  const { socket, connected } = useSocket();
  const { play, startTension, stopTension } = useSound();

  const [state, setState] = useState<any>(null);
  const [joinError, setJoinError] = useState("");
  const [reconnecting, setReconnecting] = useState(true);
  const prevPhase = useRef<string | null>(null);
  const prevAnswer = useRef<any>(null);
  const prevBank = useRef<any>(null);
  const prevPlayerCount = useRef<number>(0);

  // join / reconnect
  useEffect(() => {
    if (!code || typeof code !== "string") return;
    const session = loadSession(code);
    if (!session) {
      router.replace(`/join`);
      return;
    }
    socket.emit(
      "reconnect_room",
      { code, playerId: session.playerId, token: session.token },
      (res: any) => {
        setReconnecting(false);
        if (!res?.ok) {
          clearSession();
          setJoinError(res?.error || "Session expirée.");
        }
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, connected]);

  useEffect(() => {
    const handler = (s: any) => setState(s);
    socket.on("state", handler);
    return () => {
      socket.off("state", handler);
    };
  }, [socket]);

  useEffect(() => () => stopTension(), [stopTension]);

  // sound reactions to state transitions
  useEffect(() => {
    if (!state) return;
    if (prevPhase.current !== state.phase) {
      prevPhase.current = state.phase;
      if (state.phase === "COUNTDOWN") play("whoosh");
      if (state.phase === "INTRO") play("heartbeat");
      if (state.phase === "VOTE") {
        play("whoosh");
        startTension();
      }
      if (state.phase === "REVEAL") play("heartbeat");
      if (state.phase === "ELIMINATION") {
        play("elimination");
        stopTension();
      }
      if (state.phase === "FINALE_INTRO" || state.phase === "FINALE") play("finale");
      if (state.phase === "VICTORY") play("victory");
      if (state.phase === "ROUND_SUMMARY") play("round_end");
      if (state.phase !== "VOTE" && state.phase !== "REVEAL") stopTension();
    }
    if (state.players?.length !== prevPlayerCount.current) {
      if (prevPlayerCount.current !== 0 && state.players.length > prevPlayerCount.current) play("join");
      prevPlayerCount.current = state.players.length;
    }
    if (state.lastAnswerResult && state.lastAnswerResult !== prevAnswer.current) {
      prevAnswer.current = state.lastAnswerResult;
      play(state.lastAnswerResult.correct ? "correct" : "wrong");
    }
    if (state.lastBankEvent && state.lastBankEvent !== prevBank.current) {
      prevBank.current = state.lastBankEvent;
      play("bank");
    }
  }, [state, play]);

  if (joinError) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-center px-6">
        <Background intensity={0.3} />
        <p className="text-blood font-display text-2xl relative z-10">{joinError}</p>
        <BigButton onClick={() => router.push("/")} className="relative z-10">
          RETOUR À L'ACCUEIL
        </BigButton>
      </div>
    );
  }

  if (reconnecting || !state) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Background intensity={0.3} />
        <motion.div
          className="w-14 h-14 rounded-full border-2 border-blood/50 border-t-blood relative z-10"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Background intensity={state.phase === "ELIMINATION" || state.phase === "REVEAL" ? 1.3 : 0.6} />
      {/* La manche compose son propre plateau (bornes + projecteur) ; les
          autres phases du jeu gardent le décor du studio en fond pour qu'on
          ne quitte jamais visuellement le plateau. */}
      {["VOTE", "REVEAL", "TIEBREAK", "ELIMINATION", "ROUND_TRANSITION", "FINALE_INTRO", "FINALE", "INTRO"].includes(
        state.phase
      ) && <StudioSetBackdrop />}
      <MuteButton />
      {state.isSpectator && state.phase !== "VICTORY" && <SpectatorBanner />}
      <AnimatePresence mode="wait">
        <motion.div key={state.phase} exit={{ opacity: 0 }} className="relative z-10">
          <PhaseRouter state={state} socket={socket} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SpectatorBanner() {
  return (
    <div className="fixed top-0 inset-x-0 z-40 bg-black/80 border-b border-blood/40 text-center py-2 text-xs md:text-sm uppercase tracking-widest text-steel backdrop-blur">
      👻 Vous êtes tombé — mode <span className="text-blood font-semibold">spectateur</span>
    </div>
  );
}

function PhaseRouter({ state, socket }: { state: any; socket: any }) {
  switch (state.phase) {
    case "LOBBY":
      return <Lobby state={state} socket={socket} />;
    case "COUNTDOWN":
      return <Countdown3 />;
    case "INTRO":
      return <Intro state={state} />;
    case "ROUND_PLAY":
      return <RoundPlay state={state} socket={socket} />;
    case "ROUND_SUMMARY":
      return <RoundSummary state={state} />;
    case "VOTE":
      return <VotePhase state={state} socket={socket} />;
    case "REVEAL":
      return <RevealPhase state={state} />;
    case "TIEBREAK":
      return <TieBreakPhase state={state} />;
    case "ELIMINATION":
      return <EliminationPhase state={state} />;
    case "ROUND_TRANSITION":
      return <TransitionPhase state={state} />;
    case "FINALE_INTRO":
      return <FinaleIntro state={state} />;
    case "FINALE":
      return <FinalePhase state={state} socket={socket} />;
    case "VICTORY":
      return <VictoryPhase state={state} />;
    default:
      return null;
  }
}

/* ---------------- LOBBY ---------------- */
function Lobby({ state, socket }: { state: any; socket: any }) {
  const [copied, setCopied] = useState(false);
  const me = state.players.find((p: any) => p.id === state.viewerId);
  const isHost = state.viewerId === state.hostId;

  function copyCode() {
    navigator.clipboard?.writeText(state.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function share() {
    const url = `${window.location.origin}/join`;
    if (navigator.share) {
      navigator.share({ title: "QUI VA TOMBER ?", text: `Rejoins ma partie avec le code ${state.code}`, url }).catch(() => {});
    } else {
      copyCode();
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-10 gap-8">
      <Logo size="sm" animated={false} />

      <Panel className="px-8 py-5 text-center">
        <p className="text-xs uppercase tracking-widest text-steel mb-2">Partagez ce code avec vos joueurs</p>
        <div className="font-display text-5xl md:text-6xl text-gold tracking-[0.3em]">{state.code}</div>
        <div className="flex gap-3 mt-4 justify-center">
          <button onClick={copyCode} className="text-xs uppercase px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition">
            {copied ? "✓ Copié" : "Copier le code"}
          </button>
          <button onClick={share} className="text-xs uppercase px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition">
            Partager
          </button>
        </div>
      </Panel>

      <div className="text-center">
        <p className="font-display text-2xl text-white">
          <span className={state.players.length >= 4 ? "text-gold" : "text-blood"}>{state.players.length}</span>
          <span className="text-steel"> / {state.settings.maxPlayers} JOUEURS</span>
        </p>
      </div>

      <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-4">
        <AnimatePresence>
          {state.players.map((p: any, i: number) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: "spring", stiffness: 200, damping: 18 }}
            >
              <Panel className={`p-4 flex flex-col items-center gap-2 ${!p.connected ? "opacity-40" : ""}`}>
                <span className="text-[10px] text-steel uppercase">Joueur {i + 1}</span>
                <CharacterPortrait seed={p.avatarSeed} character={p.character} size={56} />
                <span className="font-semibold text-sm text-white truncate max-w-full">{p.name}</span>
                {p.isHost && <span className="text-[10px] text-gold uppercase">Hôte</span>}
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    p.ready ? "bg-green-600/30 text-green-400" : "bg-white/10 text-steel"
                  }`}
                >
                  {p.ready ? "PRÊT" : "EN ATTENTE"}
                </span>
              </Panel>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-4 mt-4 w-full max-w-sm">
        <BigButton
          variant={me?.ready ? "ghost" : "primary"}
          className="w-full"
          onClick={() => socket.emit("toggle_ready")}
        >
          {me?.ready ? "ANNULER" : "JE SUIS PRÊT"}
        </BigButton>

        {isHost && (
          <BigButton
            variant="gold"
            className="w-full"
            disabled={!state.canStart}
            onClick={() => socket.emit("start_game")}
          >
            LANCER LA PARTIE
          </BigButton>
        )}
        {isHost && !state.canStart && (
          <p className="text-xs text-steel text-center">
            {state.players.length < 4
              ? "Minimum 4 joueurs requis."
              : "Tous les joueurs doivent être prêts."}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------- COUNTDOWN ---------------- */
function Countdown3() {
  const [n, setN] = useState(3);
  const { play } = useSound();
  useEffect(() => {
    const id = setInterval(() => {
      setN((v) => {
        if (v <= 1) {
          clearInterval(id);
          return 0;
        }
        play("tick_urgent");
        return v - 1;
      });
    }, 900);
    return () => clearInterval(id);
  }, [play]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={n}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display text-[12rem] text-blood"
          style={{ textShadow: "0 0 80px rgba(227,18,47,0.8)" }}
        >
          {n > 0 ? n : "GO"}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------------- INTRO ---------------- */
function Intro({ state }: { state: any }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-display text-xl text-steel uppercase tracking-widest"
      >
        Que le jeu commence
      </motion.div>
      <div className="flex flex-wrap justify-center gap-6 max-w-3xl">
        {state.players.map((p: any, i: number) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.35, type: "spring", stiffness: 160, damping: 14 }}
            className="flex flex-col items-center gap-2"
          >
            <CharacterPortrait seed={p.avatarSeed} character={p.character} size={88} />
            <span className="font-display text-xl text-white uppercase">{p.name}</span>
            <span className="text-[10px] text-steel uppercase">Joueur {i + 1}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- ROUND PLAY ---------------- */

/** Panneau du HUD : verre sombre, liseré discret, rouge pour l'info chaude. */
function HudPanel({
  label,
  tone = "neutral",
  className = "",
  children,
}: {
  label: string;
  tone?: "neutral" | "red";
  className?: string;
  children: React.ReactNode;
}) {
  const red = tone === "red";
  return (
    <div
      className={`rounded-xl md:rounded-2xl px-2.5 py-1.5 md:px-4 md:py-2.5 backdrop-blur-md ${className}`}
      style={{
        background: red
          ? "linear-gradient(180deg, rgba(42,12,20,0.82), rgba(10,4,8,0.86))"
          : "linear-gradient(180deg, rgba(16,21,34,0.82), rgba(5,7,13,0.86))",
        border: `1px solid ${red ? "rgba(255,61,88,0.45)" : "rgba(160,180,225,0.16)"}`,
        boxShadow: red
          ? "0 8px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 22px rgba(227,18,47,0.18)"
          : "0 8px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
    >
      <p
        className={`text-[9px] md:text-[10px] uppercase tracking-[0.18em] font-semibold ${
          red ? "text-blood" : "text-steel"
        }`}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

/** Échelle de la chaîne : le palier courant est mis en évidence, les
 *  paliers déjà franchis restent lisibles, les suivants s'effacent. */
function ChainLadder({ steps, level }: { steps: number[]; level: number }) {
  const rungs = [...steps].reverse(); // le plus gros gain en haut
  return (
    <div className="flex flex-col gap-[3px]">
      <p className="text-[9px] uppercase tracking-[0.18em] text-steel font-semibold mb-1">Chaîne</p>
      {rungs.map((amount, i) => {
        const stepIndex = steps.length - 1 - i; // index dans l'ordre croissant
        const current = stepIndex === level - 1;
        const passed = stepIndex < level - 1;
        return (
          <div
            key={amount}
            className="flex items-center justify-end rounded-md px-2 py-[2px] transition-colors duration-300"
            style={{
              background: current
                ? "linear-gradient(90deg, rgba(227,18,47,0.1), rgba(227,18,47,0.55))"
                : passed
                ? "rgba(160,180,225,0.07)"
                : "rgba(160,180,225,0.025)",
              border: `1px solid ${current ? "rgba(255,61,88,0.75)" : "rgba(160,180,225,0.08)"}`,
              boxShadow: current ? "0 0 16px rgba(227,18,47,0.45)" : "none",
            }}
          >
            <span
              className={`font-display text-[11px] md:text-xs leading-none tabular-nums ${
                current ? "text-white" : passed ? "text-goldSoft/75" : "text-steel/45"
              }`}
            >
              {formatEuro(amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Compteur de question : 15 s, avec montée de tension sur le seul
 *  compteur — le reste du plateau ne clignote pas (cahier des charges §10). */
function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const pct = Math.max(0, Math.min(1, seconds / Math.max(total, 1)));
  // Paliers de tension : calme > 9, montée 5-9, puis 4, 3, 2, 1.
  const tension = seconds > 9 ? 0 : seconds > 4 ? 1 : seconds > 3 ? 2 : seconds > 2 ? 3 : seconds > 0 ? 4 : 5;
  const hot = tension >= 2;
  const arc = tension >= 3 ? "#ff2f4b" : tension >= 1 ? "#ff6d3d" : "#d4af37";
  const size = tension >= 3 ? 68 : tension >= 2 ? 62 : 56;

  return (
    <motion.div
      animate={tension >= 3 ? { scale: [1, 1.07, 1] } : { scale: 1 }}
      transition={
        tension >= 3
          ? { duration: tension >= 4 ? 0.52 : 0.78, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.3 }
      }
      className="relative shrink-0 rounded-full flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${arc} ${pct * 360}deg, rgba(255,255,255,0.07) 0deg)`,
        boxShadow: hot ? `0 0 ${tension >= 4 ? 28 : 18}px rgba(227,18,47,0.6)` : "none",
        transition: "width 250ms ease, height 250ms ease, box-shadow 250ms ease",
      }}
      aria-label={`${seconds} secondes restantes`}
    >
      <span
        className="rounded-full bg-void flex items-center justify-center font-display tabular-nums"
        style={{
          width: size - 9,
          height: size - 9,
          fontSize: size * 0.42,
          color: hot ? "#ff5f73" : "#ffffff",
          transition: "color 250ms ease",
        }}
      >
        {seconds > 0 ? seconds : 0}
      </span>
    </motion.div>
  );
}

function RoundPlay({ state, socket }: { state: any; socket: any }) {
  const remaining = useCountdown(state.question && !state.lastAnswerResult ? state.questionDeadline : null);
  const roundRemaining = useCountdown(state.roundEndsAt);
  const { play } = useSound();
  const questionTotal = state.questionDuration || 15;
  const secs = Math.ceil(remaining / 1000);
  const lastTick = useRef<number | null>(null);

  const result = state.lastAnswerResult;
  const revealing = !!result;
  const isMyTurn = state.isMyTurn && !state.isSpectator;
  const me = state.players.find((p: any) => p.id === state.viewerId);
  const answered = me?.answeredCurrent;
  const currentTurnPlayer = state.players.find((p: any) => p.id === state.currentTurnPlayerId);

  // Réponse choisie localement : permet d'afficher « RÉPONSE ENREGISTRÉE »
  // immédiatement, puis de surligner le choix du joueur à la révélation.
  const [picked, setPicked] = useState<number | null>(null);
  const qid = state.question?.id;
  useEffect(() => {
    setPicked(null);
  }, [qid]);

  useEffect(() => {
    if (!state.question || revealing) return;
    if (secs !== lastTick.current && secs <= 10 && secs > 0) {
      lastTick.current = secs;
      play(secs <= 4 ? "tick_urgent" : "tick");
    }
  }, [secs, state.question, revealing, play]);

  const roundMin = Math.floor(roundRemaining / 60000);
  const roundSec = Math.floor((roundRemaining % 60000) / 1000);

  // Les candidats encore en lice, dans l'ordre de leur borne.
  const roster = state.players
    .filter((p: any) => !p.eliminated)
    .sort((a: any, b: any) => (a.seat ?? 0) - (b.seat ?? 0));

  const correctIndex = state.question?.correctIndex;
  const revealed = correctIndex !== null && correctIndex !== undefined;

  // Attitude du candidat sous le projecteur : il réfléchit pendant la
  // question, réagit à la révélation.
  const stageMood: "idle" | "thinking" | "answering" | "happy" | "sad" = result
    ? result.correct
      ? "happy"
      : "sad"
    : picked !== null
    ? "answering"
    : state.question
    ? "thinking"
    : "idle";

  // `hasWebGL` touche au DOM : on ne l'évalue qu'après le montage client,
  // sinon le rendu serveur et le rendu client divergent.
  const [webgl, setWebgl] = useState(false);
  useEffect(() => {
    setWebgl(hasWebGL());
  }, []);

  function answerTone(idx: number) {
    if (revealed) {
      if (idx === correctIndex) return "correct";
      if (idx === picked) return "wrong";
      return "muted";
    }
    if (picked === idx) return "picked";
    return "idle";
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* ================= PLATEAU ================= */}
      <div className="relative">
        {/* Desktop/tablette : le vrai plateau 3D — candidats en pied derrière
            leurs bornes, plateau sombre, projecteur sur celui qui répond.
            Si WebGL manque, on retombe sur le plateau CSS, même composition. */}
        <div className="hidden md:block" style={{ height: "clamp(340px, 58vh, 700px)" }}>
          {webgl ? (
            <WebGLGuard
              fallback={<Plateau className="h-full" players={roster} activeId={state.currentTurnPlayerId} />}
            >
              <Plateau3D
                className="w-full h-full"
                players={roster}
                activeId={state.currentTurnPlayerId}
                mood={stageMood}
              />
            </WebGLGuard>
          ) : (
            <Plateau className="h-full" players={roster} activeId={state.currentTurnPlayerId} />
          )}
        </div>
        {/* Téléphone : même plateau 3D, mais cadré sur le candidat éclairé —
            huit bornes alignées sur 375 px seraient illisibles. Sans WebGL,
            on retombe sur la version CSS. */}
        <div className="md:hidden" style={{ height: "clamp(230px, 34vh, 330px)" }}>
          {webgl ? (
            <WebGLGuard
              fallback={<PlateauMobile players={roster} activeId={state.currentTurnPlayerId} />}
            >
              <Plateau3D
                compact
                className="w-full h-full"
                players={roster}
                activeId={state.currentTurnPlayerId}
                mood={stageMood}
              />
            </WebGLGuard>
          ) : (
            <PlateauMobile players={roster} activeId={state.currentTurnPlayerId} />
          )}
        </div>

        {/* --- HUD : coin haut gauche --- */}
        <div className={`absolute left-2 md:left-5 z-20 ${state.isSpectator ? "top-10 md:top-12" : "top-2 md:top-5"}`}>
          <HudPanel label="Cagnotte" tone="red">
            <AnimatedAmount
              value={state.totalBankedAllPlayers}
              className="font-display text-lg md:text-3xl text-white leading-none tabular-nums"
            />
          </HudPanel>
        </div>

        {/* --- HUD : coin haut droit --- */}
        {/* décalé à droite pour ne pas passer sous le bouton son (fixe), et
            vers le bas quand le bandeau spectateur occupe le haut de l'écran */}
        <div className={`absolute right-16 md:right-20 z-20 ${state.isSpectator ? "top-10 md:top-12" : "top-2 md:top-5"}`}>
          <HudPanel label="Temps restant" tone="red">
            <p className="font-display text-lg md:text-3xl text-white leading-none tabular-nums">
              {String(roundMin).padStart(2, "0")}:{String(roundSec).padStart(2, "0")}
            </p>
          </HudPanel>
        </div>

        {/* --- HUD : manche / joueurs restants --- */}
        <div className="absolute bottom-2 left-3 md:left-5 z-20 hidden sm:flex gap-2">
          <HudPanel label="Manche">
            <p className="font-display text-base md:text-xl text-white leading-none">{state.roundNumber}</p>
          </HudPanel>
          <HudPanel label="En jeu">
            <p className="font-display text-base md:text-xl text-white leading-none">{state.activeCount}</p>
          </HudPanel>
        </div>
      </div>

      {/* ================= ZONE DE JEU ================= */}
      <div className="relative z-20 flex-1 px-3 md:px-6 pb-8 -mt-4 md:-mt-10">
        <div className="mx-auto w-full max-w-[1500px] flex gap-4 xl:gap-6 items-start justify-center">
          {/* chaîne — rail gauche sur grand écran */}
          <div className="hidden xl:block w-[112px] shrink-0 pt-4">
            <ChainLadder steps={state.chainSteps} level={state.chainLevel} />
          </div>

          {/* colonne centrale */}
          <div className="flex-1 min-w-0 max-w-[820px] flex flex-col gap-3 md:gap-4">
            {/* bandeau du candidat en lumière */}
            {currentTurnPlayer && (
              <motion.div
                key={currentTurnPlayer.id + String(revealing)}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex justify-center"
              >
                <div
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full"
                  style={{
                    background: isMyTurn
                      ? "linear-gradient(90deg, rgba(227,18,47,0.25), rgba(227,18,47,0.08))"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isMyTurn ? "rgba(255,61,88,0.6)" : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  <span className="font-display text-sm md:text-base text-white uppercase">
                    {isMyTurn ? "À toi de jouer" : `${currentTurnPlayer.name} répond`}
                  </span>
                </div>
              </motion.div>
            )}

            {/* verdict */}
            <AnimatePresence>
              {result && <VerdictStrip key="verdict" result={result} />}
            </AnimatePresence>

            {/* question */}
            <AnimatePresence mode="wait">
              {state.question ? (
                <motion.div
                  key={state.question.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-3"
                >
                  {/* carte question */}
                  <div
                    className="relative rounded-2xl px-4 py-4 md:px-7 md:py-5 backdrop-blur-md"
                    style={{
                      background: "linear-gradient(180deg, rgba(16,21,34,0.9), rgba(5,7,13,0.92))",
                      border: "1px solid rgba(160,180,225,0.17)",
                      boxShadow: "0 18px 50px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.07)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-blood font-bold mb-1.5">
                          {state.question.category}
                        </p>
                        <h2 className="font-display text-xl md:text-3xl text-white leading-snug">
                          {state.question.question}
                        </h2>
                      </div>
                      {!revealing && <CountdownRing seconds={secs} total={questionTotal} />}
                    </div>
                  </div>

                  {/* réponses */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3">
                    {state.question.choices.map((c: string, idx: number) => {
                      const tone = answerTone(idx);
                      const clickable = isMyTurn && !answered && !revealing;
                      return (
                        <button
                          key={idx}
                          disabled={!clickable}
                          onClick={() => {
                            setPicked(idx);
                            socket.emit("submit_answer", { choiceIndex: idx });
                          }}
                          className={`group flex items-center gap-3 rounded-2xl px-3 py-3 md:px-4 md:py-3.5 text-left transition-all duration-200 ${
                            clickable ? "active:scale-[0.985]" : "cursor-default"
                          }`}
                          style={{
                            minHeight: 58,
                            background:
                              tone === "correct"
                                ? "linear-gradient(180deg, rgba(22,101,52,0.5), rgba(5,30,16,0.75))"
                                : tone === "wrong"
                                ? "linear-gradient(180deg, rgba(120,12,30,0.5), rgba(30,4,10,0.75))"
                                : tone === "picked"
                                ? "linear-gradient(180deg, rgba(120,12,30,0.4), rgba(20,6,12,0.8))"
                                : "linear-gradient(180deg, rgba(16,21,34,0.85), rgba(5,7,13,0.9))",
                            border: `1.5px solid ${
                              tone === "correct"
                                ? "rgba(74,222,128,0.85)"
                                : tone === "wrong" || tone === "picked"
                                ? "rgba(255,61,88,0.85)"
                                : "rgba(160,180,225,0.16)"
                            }`,
                            boxShadow:
                              tone === "correct"
                                ? "0 0 26px rgba(34,197,94,0.35)"
                                : tone === "wrong" || tone === "picked"
                                ? "0 0 26px rgba(227,18,47,0.4)"
                                : "inset 0 1px 0 rgba(255,255,255,0.05)",
                            opacity: tone === "muted" ? 0.45 : 1,
                          }}
                        >
                          <span
                            className="shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-display text-base"
                            style={{
                              border: `1.5px solid ${
                                tone === "correct"
                                  ? "rgba(74,222,128,0.9)"
                                  : tone === "wrong" || tone === "picked"
                                  ? "rgba(255,61,88,0.9)"
                                  : "rgba(180,198,240,0.35)"
                              }`,
                              color:
                                tone === "correct"
                                  ? "#86efac"
                                  : tone === "wrong" || tone === "picked"
                                  ? "#ff8095"
                                  : "#dbe3f5",
                            }}
                          >
                            {"ABCD"[idx]}
                          </span>
                          <span
                            className={`text-sm md:text-base font-medium leading-snug ${
                              clickable ? "text-white group-hover:text-white" : "text-white/85"
                            }`}
                          >
                            {c}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* réponse enregistrée */}
                  <AnimatePresence>
                    {picked !== null && !revealing && (
                      <motion.p
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-center font-display text-base md:text-lg uppercase tracking-widest text-gold"
                      >
                        Réponse enregistrée
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* banquer */}
                  {isMyTurn && !answered && !revealing && (
                    <div className="flex justify-center pt-1">
                      <BigButton
                        onClick={() => socket.emit("choose_bank")}
                        disabled={state.chain <= 0}
                        className="w-full sm:w-auto sm:min-w-[320px] !py-3.5"
                      >
                        <span className="flex flex-col items-center leading-tight">
                          <span>💰 BANQUER</span>
                          <span className="text-sm font-body font-semibold opacity-90">
                            {formatEuro(state.chain)}
                          </span>
                        </span>
                      </BigButton>
                    </div>
                  )}
                  {!isMyTurn && !state.isSpectator && !revealing && (
                    <p className="text-center text-steel text-[11px] md:text-xs uppercase tracking-widest">
                      Patientez, ce n'est pas votre tour
                    </p>
                  )}
                </motion.div>
              ) : state.lastBankEvent ? (
                <BankBanner key="bank" event={state.lastBankEvent} players={state.players} />
              ) : null}
            </AnimatePresence>

            {/* chaîne + gains, repliés sous la question en dessous de xl */}
            <div className="xl:hidden flex flex-wrap items-stretch justify-center gap-2 pt-1">
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  background: "rgba(16,21,34,0.75)",
                  border: "1px solid rgba(160,180,225,0.14)",
                }}
              >
                <span className="text-[9px] uppercase tracking-widest text-steel">Chaîne</span>
                <AnimatedAmount value={state.chain} className="font-display text-lg text-gold leading-none" />
                <span className="flex gap-1 ml-1">
                  {state.chainSteps.map((_: number, i: number) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: i < state.chainLevel ? "#d4af37" : "rgba(255,255,255,0.12)",
                        boxShadow: i < state.chainLevel ? "0 0 6px rgba(212,175,55,0.7)" : "none",
                      }}
                    />
                  ))}
                </span>
              </div>
              {me && (
                <div
                  className="flex items-center gap-3 rounded-xl px-3 py-2"
                  style={{
                    background: "rgba(16,21,34,0.75)",
                    border: "1px solid rgba(160,180,225,0.14)",
                  }}
                >
                  <span className="text-[9px] uppercase tracking-widest text-steel">Vos gains</span>
                  <span className="font-display text-lg text-white leading-none">{formatEuro(me.banked)}</span>
                  <span className="text-[11px] text-green-400 font-semibold">✓ {me.correctCount}</span>
                  <span className="text-[11px] text-blood font-semibold">✕ {me.wrongCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* gains — rail droit sur grand écran */}
          <div className="hidden xl:block w-[150px] shrink-0 pt-4">
            {me && (
              <HudPanel label="Vos gains">
                <AnimatedAmount
                  value={me.banked}
                  className="font-display text-2xl text-white leading-none tabular-nums"
                />
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/10">
                  <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
                    <span className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center text-[9px]">
                      ✓
                    </span>
                    {me.correctCount}
                  </span>
                  <span className="flex items-center gap-1 text-blood text-xs font-bold">
                    <span className="w-4 h-4 rounded-full bg-blood/20 flex items-center justify-center text-[9px]">
                      ✕
                    </span>
                    {me.wrongCount}
                  </span>
                </div>
                <p className="text-[8px] uppercase tracking-widest text-steel mt-1.5">Bonnes · Mauvaises</p>
              </HudPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Verdict compact affiché au-dessus de la question, sans masquer le
 *  plateau : le candidat reste sous le projecteur pendant la révélation. */
function VerdictStrip({ result }: { result: any }) {
  const good = result.correct;
  const label = result.timedOut ? "TEMPS ÉCOULÉ" : good ? "BONNE RÉPONSE" : "MAUVAISE RÉPONSE";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={
        good
          ? { opacity: 1, scale: 1 }
          : { opacity: 1, scale: 1, x: [0, -7, 6, -4, 0] }
      }
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: good ? 0.3 : 0.45 }}
      className="flex justify-center"
    >
      <div
        className="flex items-center gap-3 rounded-2xl px-5 py-2.5"
        style={{
          background: good
            ? "linear-gradient(90deg, rgba(22,101,52,0.45), rgba(5,30,16,0.6))"
            : "linear-gradient(90deg, rgba(120,12,30,0.45), rgba(30,4,10,0.6))",
          border: `1.5px solid ${good ? "rgba(74,222,128,0.6)" : "rgba(255,61,88,0.7)"}`,
          boxShadow: good ? "0 0 30px rgba(34,197,94,0.25)" : "0 0 30px rgba(227,18,47,0.3)",
        }}
      >
        <span
          className={`font-display text-2xl md:text-3xl uppercase leading-none ${
            good ? "text-green-400" : "text-blood"
          }`}
        >
          {label}
        </span>
        {!good && (
          <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-blood/85 font-semibold border-l border-blood/40 pl-3">
            Chaîne brisée
          </span>
        )}
      </div>
    </motion.div>
  );
}
function ResultBanner({ result, players }: { result: any; players: any[] }) {
  const player = players.find((p) => p.id === result.playerId);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={result.correct ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, x: [0, -10, 8, -6, 4, 0] }}
      transition={{ duration: result.correct ? 0.4 : 0.5 }}
    >
      <Panel
        className={`p-10 text-center border-2 ${
          result.correct ? "border-green-500/50 bg-green-500/5" : "border-blood/60 bg-blood/5"
        }`}
      >
        <div className="flex items-center justify-center gap-3 mb-3">
          <CharacterPortrait seed={player?.avatarSeed} character={player?.character} size={48} />
          <span className="font-display text-xl text-white uppercase">{player?.name}</span>
        </div>
        <h2
          className={`font-display text-4xl md:text-5xl uppercase mb-2 ${
            result.correct ? "text-green-400" : "text-blood"
          }`}
        >
          {result.timedOut ? "TEMPS ÉCOULÉ" : result.correct ? "BONNE RÉPONSE" : "MAUVAISE RÉPONSE"}
        </h2>
        {!result.correct && <p className="text-blood/80 uppercase tracking-widest text-sm">Chaîne brisée</p>}
      </Panel>
    </motion.div>
  );
}

function BankBanner({ event, players }: { event: any; players: any[] }) {
  const player = players.find((p) => p.id === event.playerId);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
      <Panel className="p-10 text-center border-2 border-gold/60 bg-gold/5">
        <div className="flex items-center justify-center gap-3 mb-3">
          <CharacterPortrait seed={player?.avatarSeed} character={player?.character} size={48} />
          <span className="font-display text-xl text-white uppercase">{player?.name}</span>
        </div>
        <h2 className="font-display text-5xl uppercase text-gold mb-2">BANQUE !</h2>
        <AnimatedAmount value={event.amount} className="font-display text-3xl text-white" />
        <p className="text-steel text-xs uppercase tracking-widest mt-2">
          Total : {formatEuro(event.newTotal)}
        </p>
      </Panel>
    </motion.div>
  );
}

/* ---------------- ROUND SUMMARY ---------------- */
function RoundSummary({ state }: { state: any }) {
  const s = state.roundStats;
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <h2 className="font-display text-4xl text-center text-white uppercase mb-1">Fin de manche</h2>
        <p className="text-center text-steel text-sm mb-8">Manche {s?.roundNumber}</p>

        <Panel className="p-6 space-y-4">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-steel">Cagnotte de la manche</p>
            <AnimatedAmount value={s?.cagnotteManche || 0} className="font-display text-5xl text-gold" />
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-steel">Total banqué</p>
            <AnimatedAmount value={s?.totalBanque || 0} className="font-display text-3xl text-white" />
          </div>
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/10 text-center">
            <Stat label="Bonnes réponses" value={s?.bonnesReponses} color="text-green-400" />
            <Stat label="Mauvaises réponses" value={s?.mauvaisesReponses} color="text-blood" />
            <Stat label="Temps moyen" value={`${s?.tempsMoyen ?? 0}s`} color="text-white" />
          </div>
        </Panel>
      </motion.div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div>
      <p className={`font-display text-2xl ${color}`}>{value}</p>
      <p className="text-[10px] uppercase text-steel tracking-widest">{label}</p>
    </div>
  );
}

/* ---------------- VOTE ---------------- */
function VotePhase({ state, socket }: { state: any; socket: any }) {
  const remaining = useCountdown(state.voteDeadline);
  const secs = Math.ceil(remaining / 1000);
  const [voted, setVoted] = useState(state.hasVoted);
  const active = state.players.filter((p: any) => !p.eliminated);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 gap-6">
      <h2 className="font-display text-4xl md:text-5xl text-blood uppercase text-center" style={{ textShadow: "0 0 40px rgba(227,18,47,0.6)" }}>
        QUI VA TOMBER ?
      </h2>
      <p className="text-steel text-xs uppercase tracking-widest">Vote secret · {secs}s restantes</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {active
          .filter((p: any) => p.id !== state.viewerId)
          .map((p: any) => (
            <button
              key={p.id}
              disabled={state.hasVoted || state.isSpectator}
              onClick={() => {
                socket.emit("submit_vote", { targetId: p.id });
                setVoted(true);
              }}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition ${
                state.hasVoted
                  ? "border-white/10 bg-white/[0.02] opacity-60"
                  : "border-white/15 bg-white/5 hover:border-blood hover:bg-blood/10 active:scale-95"
              }`}
            >
              <CharacterPortrait seed={p.avatarSeed} character={p.character} size={64} />
              <span className="font-semibold text-white text-sm">{p.name}</span>
            </button>
          ))}
      </div>

      <AnimatePresence>
        {state.hasVoted && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="font-display text-2xl text-gold uppercase">VOTE ENREGISTRÉ</p>
            <p className="text-steel text-xs mt-1">
              Votes reçus : <span className="text-white">???</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {state.isSpectator && (
        <p className="text-steel text-xs uppercase tracking-widest">Spectateur — vous ne votez pas</p>
      )}
    </div>
  );
}

/* ---------------- REVEAL ---------------- */
function RevealPhase({ state }: { state: any }) {
  const results = state.revealResults || [];
  const [shown, setShown] = useState(0);
  const { play } = useSound();

  useEffect(() => {
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      play("reveal_tick");
      if (i >= results.length) clearInterval(id);
    }, 1500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.revealResults]);

  const ordered = [...results].reverse(); // reveal lowest votes first, suspense building up

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-8">
      <h2 className="font-display text-3xl text-steel uppercase text-center tracking-widest">
        Les votes sont terminés
      </h2>
      <div className="w-full max-w-md space-y-3">
        {ordered.map((r: any, idx: number) => {
          const revealedIndex = results.length - 1 - idx;
          const isVisible = revealedIndex < shown;
          const player = state.players.find((p: any) => p.id === r.playerId);
          return (
            <AnimatePresence key={r.playerId}>
              {isVisible && (
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 16 }}
                >
                  <Panel className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CharacterPortrait seed={player?.avatarSeed} character={player?.character} size={40} />
                      <span className="font-semibold text-white">{player?.name}</span>
                    </div>
                    <span className="font-display text-2xl text-blood">
                      {r.votes} vote{r.votes !== 1 ? "s" : ""}
                    </span>
                  </Panel>
                </motion.div>
              )}
            </AnimatePresence>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- TIEBREAK ---------------- */
function TieBreakPhase({ state }: { state: any }) {
  const tb = state.tieBreak;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6">
      <h2 className="font-display text-4xl text-white uppercase">ÉGALITÉ</h2>
      <p className="text-steel text-sm uppercase tracking-widest text-center max-w-md">
        Départage : argent rapporté à l'équipe, puis bonnes réponses, puis rapidité
      </p>
      <div className="grid gap-3 w-full max-w-md">
        {tb?.candidates.map((c: any) => (
          <Panel
            key={c.playerId}
            className={`p-4 flex items-center justify-between ${
              c.playerId === tb.loserId ? "border-2 border-blood bg-blood/10" : ""
            }`}
          >
            <span className="font-semibold text-white">{c.name}</span>
            <span className="text-xs text-steel">
              {formatEuro(c.contribution)} · {c.correct} bonnes · {c.avgTime}s
            </span>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* ---------------- ELIMINATION ---------------- */
function EliminationPhase({ state }: { state: any }) {
  const r = state.eliminationResult;
  const player = state.players.find((p: any) => p.id === r?.playerId);
  const isMe = r?.playerId === state.viewerId;
  const survivors = state.players.filter((p: any) => !p.eliminated && p.id !== r?.playerId);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-8 relative overflow-hidden">
      {/* darkening vignette sweeps in */}
      <motion.div
        className="fixed inset-0 bg-black pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ duration: 0.8 }}
      />

      <motion.p
        initial={{ opacity: 0, letterSpacing: "0.1em" }}
        animate={{ opacity: [0, 1, 1, 0], letterSpacing: "0.5em" }}
        transition={{ duration: 1.3, times: [0, 0.3, 0.75, 1] }}
        className="absolute font-display text-3xl md:text-4xl text-steel uppercase"
      >
        Qui va tomber ?
      </motion.p>

      <motion.div
        initial={{ scale: 1.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, delay: 1.1, ease: "backOut" }}
        className="relative z-10 flex flex-col items-center gap-4"
      >
        {/* falling / exiting character: sinks, desaturates and fades near the end */}
        <motion.div
          animate={{ y: [0, 0, 60], opacity: [1, 1, 0], filter: ["grayscale(0)", "grayscale(0)", "grayscale(1)"] }}
          transition={{ duration: 2.6, delay: 1.6, times: [0, 0.6, 1], ease: "easeIn" }}
        >
          <CharacterPortrait seed={player?.avatarSeed} character={player?.character} size={110} glow />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="font-display text-4xl text-white uppercase"
        >
          {player?.name}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="text-steel text-xs uppercase tracking-widest"
        >
          A reçu le plus de votes
        </motion.p>
        <motion.h3
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.0, type: "spring", stiffness: 200, damping: 14 }}
          className="font-display text-5xl md:text-6xl text-blood uppercase text-center"
          style={{ textShadow: "0 0 60px rgba(227,18,47,0.8)" }}
        >
          {isMe ? "VOUS ÊTES TOMBÉ" : `${player?.name?.toUpperCase()} EST TOMBÉ`}
        </motion.h3>
      </motion.div>

      {survivors.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 2.8 }}
          className="relative z-10 flex items-center gap-3 mt-2"
        >
          {survivors.map((p: any) => (
            <CharacterPortrait key={p.id} seed={p.avatarSeed} size={34} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

/* ---------------- TRANSITION ---------------- */
function TransitionPhase({ state }: { state: any }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.h2
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="font-display text-5xl text-white uppercase text-center"
      >
        IL RESTE <span className="text-gold">{state.remainingCount}</span> JOUEURS
      </motion.h2>
    </div>
  );
}

/* ---------------- FINALE INTRO ---------------- */
function FinaleIntro({ state }: { state: any }) {
  const finalists = state.finale?.players.map((id: string) => state.players.find((p: any) => p.id === id));
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 relative overflow-hidden">
      {/* dramatic split lighting */}
      <motion.div
        className="fixed inset-y-0 left-0 w-1/2 bg-gradient-to-r from-blood/15 to-transparent pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      <motion.div
        className="fixed inset-y-0 right-0 w-1/2 bg-gradient-to-l from-gold/10 to-transparent pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />

      <motion.h2
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative font-display text-5xl md:text-6xl text-gold uppercase tracking-widest"
        style={{ textShadow: "0 0 50px rgba(212,175,55,0.6)" }}
      >
        LA FINALE
      </motion.h2>

      <div className="relative flex items-center gap-4 md:gap-10">
        {finalists?.map((p: any, i: number) => (
          <>
            <motion.div
              key={p?.id}
              initial={{ x: i === 0 ? -140 : 140, opacity: 0, rotate: i === 0 ? -6 : 6 }}
              animate={{ x: 0, opacity: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 0.8, ease: "backOut" }}
              className="flex flex-col items-center gap-3"
            >
              <CharacterPortrait seed={p?.avatarSeed} character={p?.character} size={120} glow />
              <span className="font-display text-xl md:text-2xl text-white uppercase">{p?.name}</span>
            </motion.div>
            {i === 0 && (
              <motion.span
                key="vs"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.3, 1], opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.6 }}
                className="font-display text-4xl md:text-5xl text-blood"
                style={{ textShadow: "0 0 40px rgba(227,18,47,0.8)" }}
              >
                VS
              </motion.span>
            )}
          </>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.4 }}
        className="relative text-steel text-xs uppercase tracking-[0.3em] mt-4"
      >
        La finale commence
      </motion.p>
    </div>
  );
}

/* ---------------- FINALE ---------------- */
function FinalePhase({ state, socket }: { state: any; socket: any }) {
  const remaining = useCountdown(state.question ? state.questionDeadline : null);
  const secs = Math.ceil(remaining / 1000);
  const finalists = state.finale?.players.map((id: string) => state.players.find((p: any) => p.id === id));
  const isMyTurn = state.isMyTurn && !state.isSpectator;
  const answered = state.players.find((p: any) => p.id === state.viewerId)?.answeredCurrent;
  const result = state.lastAnswerResult;

  return (
    <div className="min-h-screen flex flex-col px-4 py-6 gap-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-6">
        {finalists?.map((p: any) => (
          <div key={p?.id} className="flex flex-col items-center gap-1">
            <CharacterPortrait seed={p?.avatarSeed} character={p?.character} size={56} />
            <span className="text-sm font-semibold text-white">{p?.name}</span>
            <span className="font-display text-3xl text-gold">{state.finale?.scores[p?.id] ?? 0}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {result ? (
          <ResultBanner key="fresult" result={result} players={state.players} />
        ) : state.question ? (
          <motion.div key={state.question.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Panel className="p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] uppercase tracking-widest text-gold bg-gold/10 px-2 py-1 rounded">
                  {state.question.category}
                </span>
                <CountdownRing seconds={secs} total={10} />
              </div>
              <h2 className="font-display text-2xl md:text-3xl text-white text-center mb-6 leading-tight">
                {state.question.question}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {state.question.choices.map((c: string, idx: number) => (
                  <button
                    key={idx}
                    disabled={!isMyTurn || answered}
                    onClick={() => socket.emit("submit_answer", { choiceIndex: idx })}
                    className={`p-4 rounded-xl border text-left transition font-medium ${
                      isMyTurn && !answered
                        ? "border-white/15 bg-white/5 hover:border-blood hover:bg-blood/10 active:scale-[0.98]"
                        : "border-white/10 bg-white/[0.02] text-steel"
                    }`}
                  >
                    <span className="text-blood font-display mr-2">{"ABCD"[idx]}</span>
                    {c}
                  </button>
                ))}
              </div>
              {!isMyTurn && !state.isSpectator && (
                <p className="text-center text-steel text-xs mt-4 uppercase tracking-widest">
                  C'est le tour de votre adversaire
                </p>
              )}
            </Panel>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- VICTORY ---------------- */
function VictoryPhase({ state }: { state: any }) {
  const winner = state.players.find((p: any) => p.id === state.winnerId);
  const isMe = state.winnerId === state.viewerId;
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-6 text-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="font-display text-xl md:text-2xl text-steel uppercase tracking-widest"
      >
        QUI VA TOMBER ? A UN GAGNANT !
      </motion.div>

      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ delay: 0.6, type: "spring", stiffness: 160, damping: 12 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="text-6xl">🏆</div>
        <CharacterPortrait seed={winner?.avatarSeed} character={winner?.character} size={120} />
        <h2
          className="font-display text-5xl md:text-7xl text-gold uppercase"
          style={{ textShadow: "0 0 60px rgba(212,175,55,0.7)" }}
        >
          {winner?.name}
        </h2>
        <p className="font-display text-xl text-white uppercase">
          {isMe ? "VOUS ÊTES LE GRAND GAGNANT" : "GRAND GAGNANT"}
        </p>
        <AnimatedAmount value={winner?.banked || 0} className="font-display text-4xl text-white" />
      </motion.div>

      <Confetti />
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 1.5,
    color: ["#e3122f", "#d4af37", "#ffffff", "#7a0a1c"][i % 4],
    duration: 3 + Math.random() * 2,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -40, x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", rotate: 360 }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            width: 8,
            height: 14,
            background: p.color,
            top: 0,
          }}
        />
      ))}
    </div>
  );
}
