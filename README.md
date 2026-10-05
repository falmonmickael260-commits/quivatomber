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
- **`components/Plateau3D.tsx`** — le plateau : décor de studio, bornes, et le projecteur qui suit le candidat actif. Tout est construit à partir de primitives Three.js (aucun modèle ni texture à charger).
- **`components/stage/Character3D.tsx`** — candidats en pied : les modèles 3D riggés de `public/models/*.glb` (les mêmes que QuizzMaster), avec leurs animations d'origine commutées selon le moment du jeu. Le serveur attribue une apparence par joueur sans remise, si bien que deux candidats d'une même partie ne peuvent pas se ressembler, et que le portrait du lobby montre la même personne que le plateau.
- **`components/Plateau.tsx`** — même plateau en CSS/SVG, utilisé en repli quand WebGL est indisponible.
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
- Plateau de télévision : chaque candidat a sa borne numérotée (le numéro est attribué à l'arrivée et ne change plus de la partie), se tient debout derrière, et un projecteur unique se déplace d'une borne à l'autre au changement de tour. Le reste du plateau reste dans l'ombre : les autres candidats restent visibles, simplement peu éclairés.
- Introduction cinématique avec présentation des joueurs.
- Chaîne de gains (100€ → 10 000€), banque, chaîne brisée, feedback bonne/mauvaise réponse.
- Chronomètre de manche + compte à rebours par question (**15 s**), avec montée de tension sur le compteur seul (le plateau, lui, ne clignote pas).
- Récapitulatif de manche (cagnotte, total banqué, stats).
- Vote secret (impossible de voter pour soi, résultats cachés jusqu'à la révélation).
- Révélation progressive des votes, élimination spectaculaire, **départage d'égalité côté serveur** (argent rapporté → bonnes réponses → rapidité).
- Mode spectateur pour les joueurs éliminés (voient tout, n'influencent plus rien).
- Finale à 2 joueurs (5 questions chacun), écran de victoire avec confettis.
- Reconnexion automatique (session stockée en `localStorage`, re-synchronisation de l'état complet).
- Sound design complet, bouton muet.
- Mobile-first, responsive desktop.

## Rendu du plateau

Le plateau est rendu en WebGL (Three.js / React Three Fiber), chargé à la
demande : il n'arrive qu'au début d'une manche, donc l'accueil, le lobby et
les écrans de vote s'affichent sans l'attendre.

Deux points à ne pas défaire :

- **Une seule copie de Three.js.** `stats-gl`, tiré par `@react-three/drei`,
  embarque sa propre version de three. Deux copies dans le bundle cassent
  tous les `instanceof` de three : le rendu s'initialise normalement puis ne
  dessine rien, sans la moindre erreur en console. `next.config.js` force
  donc la résolution de `three` vers une copie unique.
- **La version de three doit rester compatible avec `@react-three/fiber` 8**
  (qui impose React 18). C'est pourquoi three est épinglé en 0.168.

Sans WebGL (ou si le contexte est perdu), `components/Plateau.tsx` prend le
relais : même composition, en CSS/SVG.

## Limites connues / pistes pour la suite

- **Persistance** : les parties vivent en mémoire (process Node). Un redémarrage serveur efface les parties en cours. Prochaine étape naturelle : brancher Postgres/Supabase (parties, joueurs, manches, votes) comme prévu dans l'architecture cible — le code est déjà isolé dans `lib/gameEngine.js` pour faciliter ce branchement.
- **Scalabilité multi-instance** : un seul process Socket.io ; pour plusieurs instances il faudrait un adaptateur Redis.
- **Comptes / classement / historique** : non implémentés (le jeu fonctionne par pseudo, sans compte), mais l'architecture (ids de joueurs, stats par manche) est prête pour les brancher plus tard.
- **Audit de sécurité des dépendances** : `next@14.2.35` reste ciblé par des advisories npm très larges concernant des fonctionnalités non utilisées ici (Server Actions, `next/image`, middleware, App Router) — ce projet utilise uniquement le Pages Router avec un serveur custom minimal. À réévaluer avant une mise en production réelle (migration vers Next 15/16 recommandée à terme).
- Banque de questions volontairement limitée pour la démo (~65 questions) ; à étoffer pour éviter les répétitions sur de longues parties.
- **Poids des modèles** : 21 personnages × ~500 Ko dans `public/models`, dont 8 chargés par partie. Ils sont mis en cache par le navigateur mais ce sont ~4 Mo au premier chargement d'une manche. À passer en Draco/meshopt si cela devient gênant.
- **Expressions des candidats** : on se limite aux cinq animations fournies avec les modèles (attente, neutre, interaction, salut, encaissement). Pas d'animation faciale.

## Tests effectués

Un script de simulation (`test-sim.js`, à ne pas committer en prod) fait jouer 4 bots une partie complète via de vrais sockets pour valider : lobby → countdown → intro → manches → vote → égalité/départage → élimination → transition → finale → victoire. Testé avec succès de bout en bout.
