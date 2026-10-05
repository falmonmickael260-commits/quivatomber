import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { AnimatePresence, motion } from "framer-motion";
import { Background } from "@/components/Background";
import { StudioBackdrop } from "@/components/StudioBackdrop";
import { Stage3D } from "@/components/Stage3D";
import { WebGLGuard, hasWebGL } from "@/components/WebGLGuard";
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

  const activeRoster = state.players.filter((p: any) => !p.eliminated);
  const stageActiveIndex = activeRoster.findIndex((p: any) => p.id === state.currentTurnPlayerId);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Background intensity={state.phase === "ELIMINATION" || state.phase === "REVEAL" ? 1.3 : 0.6} />
      {(state.phase === "ROUND_PLAY" || state.phase === "FINALE") && (
        <div className="hidden lg:block">
          {hasWebGL() ? (
            <WebGLGuard fallback={<StudioBackdrop />}>
              <Stage3D activeIndex={stageActiveIndex} playerCount={Math.max(activeRoster.length, 1)} />
            </WebGLGuard>
          ) : (
            <StudioBackdrop />
          )}
        </div>
      )}
      {["VOTE", "REVEAL", "TIEBREAK", "ELIMINATION", "ROUND_TRANSITION"].includes(state.phase) && (
        <div className="hidden lg:block">
          <StudioBackdrop />
        </div>
      )}
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
                <CharacterPortrait seed={p.avatarSeed} size={56} />
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
            <CharacterPortrait seed={p.avatarSeed} size={88} />
            <span className="font-display text-xl text-white uppercase">{p.name}</span>
            <span className="text-[10px] text-steel uppercase">Joueur {i + 1}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- ROUND PLAY ---------------- */
function RoundPlay({ state, socket }: { state: any; socket: any }) {
  const remaining = useCountdown(state.question ? state.questionDeadline : null);
  const roundRemaining = useCountdown(state.roundEndsAt);
  const { play } = useSound();
  const secs = Math.ceil(remaining / 1000);
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    if (!state.question) return;
    if (secs !== lastTick.current && secs <= 10 && secs > 0) {
      lastTick.current = secs;
      play(secs <= 3 ? "tick_urgent" : "tick");
    }
  }, [secs, state.question, play]);

  const isMyTurn = state.isMyTurn && !state.isSpectator;
  const answered = state.players.find((p: any) => p.id === state.viewerId)?.answeredCurrent;
  const currentTurnPlayer = state.players.find((p: any) => p.id === state.currentTurnPlayerId);
  const result = state.lastAnswerResult;

  const roundMin = Math.floor(roundRemaining / 60000);
  const roundSec = Math.floor((roundRemaining % 60000) / 1000);

  // Desktop gets a real plateau: other candidates seated either side of the
  // central screen. Mobile never sees this — it stays question-first, one
  // column, nothing to scroll past to reach the answer buttons.
  const others = state.players.filter((p: any) => !p.eliminated && p.id !== state.currentTurnPlayerId);
  const leftRail = others.filter((_: any, i: number) => i % 2 === 0);
  const rightRail = others.filter((_: any, i: number) => i % 2 === 1);

  return (
    <div className="min-h-screen px-4 py-6 lg:px-8 lg:py-10 flex flex-col lg:grid lg:grid-cols-[180px_minmax(0,760px)_180px] lg:justify-center lg:gap-8">
      {/* top bar */}
      <div className="flex items-center justify-between text-xs md:text-sm text-steel uppercase tracking-widest lg:col-span-3 pr-14 sm:pr-0">
        <span>Manche {state.roundNumber}</span>
        <span className="font-display text-base">
          Temps restant : <span className="text-white">{roundMin}:{String(roundSec).padStart(2, "0")}</span>
        </span>
        <span>{state.activeCount} joueurs en jeu</span>
      </div>

      {/* left pedestals — desktop plateau only */}
      <div className="hidden lg:flex flex-col gap-3 pt-6">
        {leftRail.map((p: any) => (
          <PlayerPedestal key={p.id} player={p} />
        ))}
      </div>

      <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto lg:max-w-none lg:mx-0 lg:bg-white/[0.015] lg:border lg:border-white/[0.07] lg:rounded-3xl lg:p-8">
      {/* chain */}
      <div className="flex flex-col items-center gap-2 py-4">
        <span className="text-xs uppercase tracking-[0.3em] text-steel">Chaîne</span>
        <motion.div
          key={state.chain}
          initial={{ scale: 0.7, opacity: 0.4 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 14 }}
        >
          <AnimatedAmount
            value={state.chain}
            className="font-display text-6xl md:text-7xl text-gold"
          />
        </motion.div>
        <div className="flex gap-1">
          {state.chainSteps.map((_: number, i: number) => (
            <span
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${i < state.chainLevel ? "bg-gold shadow-glowGold" : "bg-white/10"}`}
            />
          ))}
        </div>
      </div>

      {/* current player spotlight */}
      {!result && currentTurnPlayer && (
        <motion.div
          key={currentTurnPlayer.id}
          initial={{ opacity: 0, scale: 0.9, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          className="relative flex justify-center"
        >
          {/* fixed overhead spotlight cone, grounds the active player on the
              studio floor — static, not animated */}
          <div
            className="hidden lg:block absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-40 pointer-events-none"
            style={{
              background: isMyTurn
                ? "conic-gradient(from 180deg at 50% 0%, transparent 35%, rgba(227,18,47,0.16) 50%, transparent 65%)"
                : "conic-gradient(from 180deg at 50% 0%, transparent 38%, rgba(255,255,255,0.06) 50%, transparent 62%)",
            }}
          />
          <div
            className={`relative flex items-center gap-4 px-6 py-3 rounded-2xl border backdrop-blur-xl ${
              isMyTurn
                ? "border-blood/60 bg-blood/10 shadow-glowRed"
                : "border-white/10 bg-white/[0.03]"
            }`}
          >
            <CharacterPortrait seed={currentTurnPlayer.avatarSeed} size={52} glow={isMyTurn} />
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-widest text-steel">En jeu</p>
              <p className="font-display text-xl uppercase text-white leading-tight">{currentTurnPlayer.name}</p>
              <p className={`text-xs uppercase tracking-widest font-semibold ${isMyTurn ? "text-blood" : "text-steel"}`}>
                {isMyTurn ? "À vous de jouer" : "Joue en ce moment"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* question card */}
      <AnimatePresence mode="wait">
        {result ? (
          <ResultBanner key="result" result={result} players={state.players} />
        ) : state.question ? (
          <motion.div
            key={state.question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
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

              {isMyTurn && !answered && (
                <div className="mt-6 flex justify-center">
                  <BigButton
                    variant="gold"
                    disabled={state.chain <= 0}
                    onClick={() => socket.emit("choose_bank")}
                    className="w-full sm:w-auto"
                  >
                    💰 BANQUER <AnimatedAmount value={state.chain} />
                  </BigButton>
                </div>
              )}
              {!isMyTurn && !state.isSpectator && (
                <p className="text-center text-steel text-xs mt-4 uppercase tracking-widest">
                  Patientez, ce n'est pas votre tour
                </p>
              )}
            </Panel>
          </motion.div>
        ) : state.lastBankEvent ? (
          <BankBanner key="bank" event={state.lastBankEvent} players={state.players} />
        ) : null}
      </AnimatePresence>

      <div className="flex justify-between items-center mt-auto pt-4 border-t border-white/5 text-xs text-steel uppercase">
        <span>Cagnotte de manche : {formatEuro(state.roundBanked)}</span>
        <span>Total banqué : {formatEuro(state.totalBankedAllPlayers)}</span>
      </div>
      </div>

      {/* right pedestals — desktop plateau only */}
      <div className="hidden lg:flex flex-col gap-3 pt-6">
        {rightRail.map((p: any) => (
          <PlayerPedestal key={p.id} player={p} />
        ))}
      </div>
    </div>
  );
}

/** A real podium, not a card: portrait standing above a trapezoidal pupitre
 * base with a backlit nameplate, like a game-show contestant stand. Static
 * (one fade-in on mount) — the studio around it stays calm. */
function PlayerPedestal({ player }: { player: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: player.connected ? 1 : 0.35, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center"
    >
      <div className="relative mb-1">
        <div
          className="absolute inset-0 rounded-full blur-lg"
          style={{ background: "radial-gradient(circle, rgba(227,18,47,0.22), transparent 70%)" }}
        />
        <CharacterPortrait seed={player.avatarSeed} size={48} grayscale={!player.connected} className="relative" />
      </div>
      {/* pupitre: tapered stand with a chrome rim and a glowing nameplate */}
      <div
        className="w-[72px] h-10 border-t border-white/10"
        style={{
          clipPath: "polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)",
          background: "linear-gradient(180deg, #1a1420 0%, #0a0610 85%)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      />
      <div className="w-14 h-[3px] bg-gradient-to-r from-transparent via-blood/50 to-transparent -mt-px" />
      <span className="mt-1.5 text-[11px] font-semibold text-steel text-center truncate w-full">{player.name}</span>
    </motion.div>
  );
}

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const pct = Math.max(0, Math.min(1, seconds / total));
  const urgent = seconds <= 3;
  return (
    <motion.div
      animate={urgent ? { scale: [1, 1.15, 1] } : {}}
      transition={{ duration: 0.5, repeat: urgent ? Infinity : 0 }}
      className={`w-12 h-12 rounded-full flex items-center justify-center font-display text-lg border-2 ${
        urgent ? "border-blood text-blood" : "border-white/30 text-white"
      }`}
      style={{
        background: `conic-gradient(${urgent ? "#e3122f" : "#d4af37"} ${pct * 360}deg, rgba(255,255,255,0.06) 0deg)`,
      }}
    >
      <span className="bg-void rounded-full w-9 h-9 flex items-center justify-center">
        {seconds > 0 ? seconds : "0"}
      </span>
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
          <CharacterPortrait seed={player?.avatarSeed} size={48} />
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
          <CharacterPortrait seed={player?.avatarSeed} size={48} />
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
              <CharacterPortrait seed={p.avatarSeed} size={64} />
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
                      <CharacterPortrait seed={player?.avatarSeed} size={40} />
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
          <CharacterPortrait seed={player?.avatarSeed} size={110} glow />
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
              <CharacterPortrait seed={p?.avatarSeed} size={120} glow />
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
            <CharacterPortrait seed={p?.avatarSeed} size={56} />
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
        <CharacterPortrait seed={winner?.avatarSeed} size={120} />
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
