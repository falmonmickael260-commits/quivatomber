import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Background } from "@/components/Background";
import { BigButton, MuteButton } from "@/components/UI";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1900);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      <Background />
      <MuteButton />

      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-void"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="w-20 h-20 rounded-full border-2 border-blood/40"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.4, 1], opacity: [0, 1, 1] }}
              transition={{ duration: 1.6, times: [0, 0.6, 1], ease: "easeOut" }}
            >
              <motion.div
                className="absolute inset-0 rounded-full border-t-2 border-blood"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col items-center gap-10 px-6 text-center">
        <Logo size="lg" />

        <motion.p
          className="text-steel font-body text-sm md:text-base uppercase tracking-[0.3em]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8 }}
        >
          Une question. Un choix. Un joueur de moins.
        </motion.p>

        <motion.div
          className="flex flex-col gap-4 w-full max-w-sm mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <BigButton variant="primary" onClick={() => router.push("/create")}>
            CRÉER UNE PARTIE
          </BigButton>
          <BigButton variant="ghost" onClick={() => router.push("/join")}>
            REJOINDRE UNE PARTIE
          </BigButton>
          <BigButton variant="ghost" onClick={() => router.push("/rules")}>
            RÈGLES
          </BigButton>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-6 text-white/30 text-xs tracking-widest font-body"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        4 — 8 JOUEURS · TEMPS RÉEL
      </motion.div>
    </div>
  );
}
