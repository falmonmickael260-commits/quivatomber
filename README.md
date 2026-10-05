# QUI VA TOMBER ?

> « Une question. Un choix. Un joueur de moins. »

Jeu télévisé multijoueur en ligne, temps réel, 4 à 8 joueurs. Direction artistique noir / rouge / or, animations cinématographiques (Framer Motion), sound design synthétisé (Web Audio API — aucun fichier audio externe requis).

## Démarrer

```bash
npm install
npm run dev
```

Ouvrez `http://localhost:3000`. Pour tester en multijoueur local, ouvrez plusieurs onglets/navigateurs (chaque onglet = un joueur).

## Architecture

- **`server.js`** — serveur HTTP custom (Next.js + Socket.io) : point d'entrée unique.
- **`lib/gameEngine.js`** — moteur de jeu **autoritatif côté serveur** : toute la logique (chaîne, banque, votes, élimination, départage d'égalité, finale) y vit. Le client n'affiche que ce que le serveur lui envoie ; les bonnes réponses ne sont jamais transmises avant résolution (anti-triche).
- **`lib/questions.js`** — banque de questions (11 catégories, 3 niveaux de difficulté).
- **`lib/session.ts`** — persistance de session joueur (code / id / token) en `localStorage`, utilisée pour la reconnexion automatique après rafraîchissement ou coupure réseau.
- **`pages/`** — Accueil, Créer, Rejoindre, Règles, et `game/[code].tsx` qui pilote l'intégralité de la partie (un composant par phase : lobby, intro, manche, résumé, vote, révélation, départage, élimination, transition, finale, victoire).
- **`hooks/useSound.tsx`** — sound design généré en direct via `AudioContext` (oscillateurs + bruit blanc), avec bouton muet.
- **`components/`** — Logo animé, fond à particules, boutons premium, avatars, compteurs animés.

### Machine à états (serveur)

```
LOBBY → COUNTDOWN → INTRO → ROUND_PLAY ⇄ (tours) → ROUND_SUMMARY
  → VOTE → REVEAL → [TIEBREAK] → ELIMINATION → ROUND_TRANSITION
  → (nouvelle manche, ou si 2 joueurs restants) FINALE_INTRO → FINALE → VICTORY
```

Toutes les transitions, délais, tirage des questions, calcul des votes et du départage d'égalité sont gérés dans `lib/gameEngine.js`, jamais côté client.

## Ce qui est implémenté (conforme au cahier des charges)

- 4 à 8 joueurs, bouton de lancement verrouillé tant que < 4 joueurs ou que tous ne sont pas prêts.
- Lobby avec arrivée animée des joueurs, code de partie, copier/partager.
- Introduction cinématique avec présentation des joueurs.
- Chaîne de gains (100€ → 10 000€), banque, chaîne brisée, feedback bonne/mauvaise réponse.
- Chronomètre de manche + compte à rebours par question (10s), avec tension croissante.
- Récapitulatif de manche (cagnotte, total banqué, stats).
- Vote secret (impossible de voter pour soi, résultats cachés jusqu'à la révélation).
- Révélation progressive des votes, élimination spectaculaire, **départage d'égalité côté serveur** (argent rapporté → bonnes réponses → rapidité).
- Mode spectateur pour les joueurs éliminés (voient tout, n'influencent plus rien).
- Finale à 2 joueurs (5 questions chacun), écran de victoire avec confettis.
- Reconnexion automatique (session stockée en `localStorage`, re-synchronisation de l'état complet).
- Sound design complet, bouton muet.
- Mobile-first, responsive desktop.

## Limites connues / pistes pour la suite

- **Persistance** : les parties vivent en mémoire (process Node). Un redémarrage serveur efface les parties en cours. Prochaine étape naturelle : brancher Postgres/Supabase (parties, joueurs, manches, votes) comme prévu dans l'architecture cible — le code est déjà isolé dans `lib/gameEngine.js` pour faciliter ce branchement.
- **Scalabilité multi-instance** : un seul process Socket.io ; pour plusieurs instances il faudrait un adaptateur Redis.
- **Comptes / classement / historique** : non implémentés (le jeu fonctionne par pseudo, sans compte), mais l'architecture (ids de joueurs, stats par manche) est prête pour les brancher plus tard.
- **Audit de sécurité des dépendances** : `next@14.2.35` reste ciblé par des advisories npm très larges concernant des fonctionnalités non utilisées ici (Server Actions, `next/image`, middleware, App Router) — ce projet utilise uniquement le Pages Router avec un serveur custom minimal. À réévaluer avant une mise en production réelle (migration vers Next 15/16 recommandée à terme).
- Banque de questions volontairement limitée pour la démo (~65 questions) ; à étoffer pour éviter les répétitions sur de longues parties.

## Tests effectués

Un script de simulation (`test-sim.js`, à ne pas committer en prod) fait jouer 4 bots une partie complète via de vrais sockets pour valider : lobby → countdown → intro → manches → vote → égalité/départage → élimination → transition → finale → victoire. Testé avec succès de bout en bout.
