import { useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Background } from "@/components/Background";
import { BigButton, Panel, MuteButton } from "@/components/UI";
import { useSocket } from "@/hooks/useSocket";
import { saveSession } from "@/lib/session";
import { CharacterPicker, randomCharacter } from "@/components/CharacterPicker";

export default function Create() {
  const router = useRouter();
  const { socket } = useSocket();
  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [roundDuration, setRoundDuration] = useState(120);
  const [difficulty, setDifficulty] = useState("mixte");
  const [character, setCharacter] = useState(randomCharacter);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleCreate() {
    if (!name.trim()) {
      setError("Entrez votre pseudo.");
      return;
    }
    setLoading(true);
    setError("");
    socket.emit(
      "create_room",
      { name: name.trim(), settings: { maxPlayers, roundDuration, difficulty, character } },
      (res: any) => {
        setLoading(false);
        if (!res?.ok) {
          setError(res?.error || "Erreur serveur.");
          return;
        }
        saveSession(res.code, res.playerId, res.token);
        router.push(`/game/${res.code}`);
      }
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10">
      <Background intensity={0.5} />
      <MuteButton />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg"
      >
        <h1 className="font-display text-4xl text-center mb-1 text-white uppercase">
          Créer une <span className="text-blood">partie</span>
        </h1>
        <p className="text-center text-steel text-sm mb-8">Configurez votre émission</p>

        <Panel className="p-6 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-widest text-steel mb-2 block">Votre pseudo</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={18}
              placeholder="Ex: Alex"
              className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 text-white outline-none focus:border-blood transition"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-steel mb-2 block">Votre personnage</label>
            <CharacterPicker value={character} onChange={setCharacter} />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-steel mb-2 block">
              Nombre maximum de joueurs : <span className="text-gold">{maxPlayers}</span>
            </label>
            <input
              type="range"
              min={4}
              max={8}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              className="w-full accent-blood"
            />
            <div className="flex justify-between text-[10px] text-steel/70 mt-1">
              <span>4</span>
              <span>8</span>
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-steel mb-2 block">
              Durée des manches : <span className="text-gold">{roundDuration}s</span>
            </label>
            <input
              type="range"
              min={60}
              max={240}
              step={30}
              value={roundDuration}
              onChange={(e) => setRoundDuration(Number(e.target.value))}
              className="w-full accent-blood"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-steel mb-2 block">Difficulté des questions</label>
            <div className="grid grid-cols-4 gap-2">
              {["facile", "moyen", "difficile", "mixte"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`py-2 rounded-lg text-xs uppercase font-semibold border transition ${
                    difficulty === d
                      ? "bg-blood border-blood text-white"
                      : "bg-black/30 border-white/15 text-steel hover:border-white/30"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-blood text-sm text-center">{error}</p>}

          <BigButton variant="primary" className="w-full" onClick={handleCreate} disabled={loading}>
            {loading ? "CRÉATION…" : "CRÉER LA PARTIE"}
          </BigButton>
          <BigButton variant="ghost" className="w-full" onClick={() => router.push("/")}>
            RETOUR
          </BigButton>
        </Panel>
      </motion.div>
    </div>
  );
}
