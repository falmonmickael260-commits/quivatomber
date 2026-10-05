import { useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Background } from "@/components/Background";
import { BigButton, Panel, MuteButton } from "@/components/UI";
import { useSocket } from "@/hooks/useSocket";
import { saveSession } from "@/lib/session";

export default function Join() {
  const router = useRouter();
  const { socket } = useSocket();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleJoin() {
    if (!name.trim()) return setError("Entrez votre pseudo.");
    if (code.trim().length < 4) return setError("Code de partie invalide.");
    setLoading(true);
    setError("");
    socket.emit("join_room", { code: code.trim().toUpperCase(), name: name.trim() }, (res: any) => {
      setLoading(false);
      if (!res?.ok) {
        setError(res?.error || "Impossible de rejoindre cette partie.");
        return;
      }
      saveSession(res.code, res.playerId, res.token);
      router.push(`/game/${res.code}`);
    });
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10">
      <Background intensity={0.5} />
      <MuteButton />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <h1 className="font-display text-4xl text-center mb-1 text-white uppercase">
          Rejoindre une <span className="text-blood">partie</span>
        </h1>
        <p className="text-center text-steel text-sm mb-8">Entrez le code transmis par l'hôte</p>

        <Panel className="p-6 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-widest text-steel mb-2 block">Votre pseudo</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={18}
              placeholder="Ex: Sarah"
              className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-3 text-white outline-none focus:border-blood transition"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-steel mb-2 block">Code de la partie</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="Q7K4P"
              className="w-full bg-black/40 border border-white/15 rounded-lg px-4 py-4 text-white text-center font-display text-3xl tracking-[0.3em] outline-none focus:border-blood transition"
            />
          </div>

          {error && <p className="text-blood text-sm text-center">{error}</p>}

          <BigButton variant="primary" className="w-full" onClick={handleJoin} disabled={loading}>
            {loading ? "CONNEXION…" : "REJOINDRE"}
          </BigButton>
          <BigButton variant="ghost" className="w-full" onClick={() => router.push("/")}>
            RETOUR
          </BigButton>
        </Panel>
      </motion.div>
    </div>
  );
}
