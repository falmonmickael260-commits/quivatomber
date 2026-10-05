import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Background } from "@/components/Background";
import { BigButton, Panel, MuteButton } from "@/components/UI";

const STEPS = [
  { t: "La chaîne", d: "Chaque bonne réponse fait grimper la cagnotte commune : 100€, 200€, 300€, 500€, 1000€… jusqu'à 10 000€." },
  { t: "Banquer", d: "À votre tour, choisissez de BANQUER le montant actuel (il devient définitivement vôtre) ou de répondre pour faire grimper la chaîne." },
  { t: "Chaîne brisée", d: "Une mauvaise réponse ou le temps écoulé brise la chaîne : elle retombe à 0€." },
  { t: "Vote secret", d: "À la fin de chaque manche, tous les joueurs votent en secret pour celui qu'ils veulent éliminer." },
  { t: "Élimination", d: "Le joueur avec le plus de votes tombe et devient spectateur. En cas d'égalité : argent rapporté, bonnes réponses, puis rapidité départagent." },
  { t: "La finale", d: "Quand il ne reste que 2 joueurs, place à la finale : 5 questions chacun. Le meilleur score gagne." },
];

export default function Rules() {
  const router = useRouter();
  return (
    <div className="relative min-h-screen overflow-y-auto px-4 py-10">
      <Background intensity={0.4} />
      <MuteButton />
      <div className="relative z-10 max-w-2xl mx-auto">
        <h1 className="font-display text-5xl text-center text-white uppercase mb-10">
          Les <span className="text-blood">règles</span>
        </h1>

        <div className="space-y-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.t}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Panel className="p-5 flex gap-4 items-start">
                <div className="font-display text-3xl text-gold shrink-0 w-10 text-center">{i + 1}</div>
                <div>
                  <h3 className="font-display text-xl uppercase text-white mb-1">{s.t}</h3>
                  <p className="text-steel text-sm leading-relaxed">{s.d}</p>
                </div>
              </Panel>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3">
          <BigButton variant="primary" className="w-full" onClick={() => router.push("/create")}>
            CRÉER UNE PARTIE
          </BigButton>
          <BigButton variant="ghost" className="w-full" onClick={() => router.push("/")}>
            RETOUR À L'ACCUEIL
          </BigButton>
        </div>
      </div>
    </div>
  );
}
