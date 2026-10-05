# Audit — QUI VA TOMBER ?

Audit du projet existant (voir aussi [README.md](README.md) pour
l'architecture) avant la passe "immersion + personnages + responsive".

## Bugs trouvés et corrigés

1. **Chronomètre de manche à `0:00` au lancement** — `lib/gameEngine.js`.
   `scheduleRoundTimer()` (qui fixe `room.roundEndsAt`) était appelé par
   l'appelant *après* `startNewRound()`, qui diffuse déjà l'état aux clients.
   Résultat : le tout premier état reçu par les joueurs à chaque début de
   manche contenait `roundEndsAt: undefined`, donc un compte à rebours à
   zéro pendant un instant. Corrigé en déplaçant l'appel au tout début de
   `startNewRound()`, avant toute diffusion — source unique de vérité, plus
   de risque d'oubli à un futur point d'appel.

2. **Race condition sur la fin de manche** — `scheduleRoundTimer()`. Si le
   chronomètre de manche expirait pendant qu'une réponse venait d'être
   révélée (bannière "BONNE/MAUVAISE RÉPONSE") ou qu'un joueur venait de
   banquer (bannière "BANQUE !"), la manche se terminait immédiatement et
   coupait l'animation en cours côté client. Corrigé : le timer de fin de
   manche attend maintenant explicitement qu'aucune bannière de révélation
   ne soit active avant de clore la manche ; sinon il se contente de poser
   un drapeau et laisse le flux normal (`advanceTurnOrEndRound`) terminer la
   manche une fois l'animation en cours achevée.

3. **Finale toujours ouverte par le même joueur** — `startFinaleIntro()`.
   L'ordre de passage en finale reprenait l'ordre d'arrivée dans le lobby
   (donc quasi toujours l'hôte en premier). Corrigé : l'ordre des deux
   finalistes est désormais tiré au sort, comme l'ordre de passage à chaque
   manche normale.

4. **Erreur d'hydratation React sur CHAQUE chargement de page** —
   `components/Background.tsx`. Les positions des particules de fond
   étaient calculées avec `Math.random()` directement dans un `useMemo`
   exécuté aussi bien côté serveur (SSR) que côté client : les deux rendus
   ne pouvaient jamais correspondre, ce qui déclenchait un avertissement
   d'hydratation React dans la console à chaque navigation (bug "invisible"
   à l'écran mais bien réel — détecté uniquement en inspectant la console).
   Corrigé : les particules partent d'un tableau vide au rendu serveur et
   ne sont générées qu'après le montage côté client (`useEffect`), donc le
   HTML serveur et client coïncident parfaitement à l'hydratation.

## Points vérifiés, sans bug trouvé

- **Double soumission / double clic** : chaque action critique (répondre,
  banquer, voter, lancer la partie) est protégée à la fois côté client
  (bouton désactivé après action) et côté serveur (champ `answeredCurrent`,
  `Map` de votes, vérification de phase) — double protection déjà en place.
- **Anti-triche** : la bonne réponse n'est jamais incluse dans l'état envoyé
  aux clients avant la résolution serveur de la question (vérifié dans
  `getStateFor()` — `correctIndex` reste `null` tant que la réponse n'a pas
  été tranchée côté serveur, pour tous les joueurs y compris celui dont
  c'est le tour).
- **Vote** : impossible de voter pour soi-même ou pour un joueur déjà
  éliminé (vérifié côté serveur, pas seulement côté UI).
- **Égalité au vote** : départage testé en simulation réelle (4 bots) —
  fonctionne correctement sur le critère "argent rapporté à l'équipe".
- **Reconnexion / rafraîchissement de page** : testé — le token de session
  stocké en `localStorage` permet de retrouver l'état exact de la partie en
  cours, y compris pendant une question active.
- **Joueur qui revient après élimination** : un joueur éliminé reste
  marqué `eliminated: true` côté serveur de façon permanente pour la
  partie ; aucune action (réponse, vote) n'est acceptée de sa part même
  s'il force l'envoi d'un événement — le serveur revérifie `!player ||
  player.eliminated` d'une façon ou d'une autre à chaque action sensible.
- **Partie bloquée** : chaque phase a un timer de secours serveur (question
  10s, manche, vote 20s) qui fait avancer le jeu même si un joueur ne
  répond jamais — testé en simulation avec des bots qui timeout.

5. **Chevauchement mobile du bouton son avec la barre d'info de manche** —
   `pages/game/[code].tsx`. Le bouton muet (`position: fixed`, coin
   supérieur droit) n'était pas pris en compte par la barre "Manche X /
   Temps restant / N joueurs en jeu" pendant une manche : sur petit écran,
   le texte de droite passait sous le bouton et devenait illisible. Trouvé
   en testant réellement l'écran de manche à 375px de large (pas seulement
   l'accueil). Corrigé par une marge réservée à droite sur mobile.

## Plateau desktop et sobriété de l'animation

Suite à un retour explicite en cours de mission, la direction artistique a
été resserrée : plateau réaliste et sobre plutôt que spectaculaire par
accumulation d'effets.

- Les animations en boucle infinie (particules nombreuses et rapides,
  bandeau lumineux balayant l'écran en continu, reflet permanent sur le
  bouton principal) ont été supprimées ou réduites à un effet unique déclenché
  au montage — plus aucune animation ne tourne en continu pendant le jeu
  normal ; les effets marqués restent réservés aux moments importants
  (bonne/mauvaise réponse, banque, révélation, élimination, finale, victoire).
- `components/Background.tsx` : particules réduites et ralenties
  (ambiance discrète), suppression du balayage lumineux animé en continu,
  suppression des bandeaux "LED" en pointillés jugés trop "boîte de nuit" au
  profit d'un éclairage latéral statique et d'une vignette de profondeur.
- Un vrai plateau en trois niveaux a été ajouté pour l'écran de manche en
  desktop (`≥1024px`) : les autres candidats actifs sont assis de part et
  d'autre d'un "grand écran" central (chaîne + joueur actif + question),
  avec un cadre et un fond très légèrement texturés pour suggérer un
  pupitre/mur de studio sans aucune animation superflue. Sur mobile, ce
  rail de joueurs est simplement absent (`hidden lg:flex`) : la composition
  change réellement selon l'écran, elle ne se contente pas de redimensionner
  le même layout — conformément à la demande.

## Limites connues (non corrigées, hors budget de cette passe)

- **Pas de migration d'hôte** : si l'hôte quitte définitivement pendant le
  lobby (sans jamais se reconnecter), plus personne ne peut lancer la
  partie. La reconnexion de l'hôte fonctionne ; seule la perte *permanente*
  et définitive de l'hôte avant le lancement n'est pas gérée.
- **Siège réservé après déconnexion en lobby** : un joueur déconnecté avant
  le lancement garde sa place dans le compteur de places (`X / 8`) même
  s'il ne revient jamais, ce qui peut occuper un slot inutilement sur une
  longue attente. Snapshot de l'état actuel, pas un blocage (le lancement
  reste possible dès que les joueurs *connectés* sont ≥ 4 et tous prêts).
- **Pas de persistance** : les parties vivent en mémoire du process Node ;
  un redémarrage serveur efface les parties en cours (voir README).

## Personnages

Voir [ASSETS_LICENSES.md](ASSETS_LICENSES.md) pour le détail : les
portraits de personnages sont des illustrations vectorielles 100%
originales (aucun asset externe), par choix délibéré pour respecter
strictement les contraintes de licence demandées (pas de vraies personnes,
pas de personnages protégés, aucune licence douteuse).

## Tests effectués pour cette passe

- Relecture complète de `lib/gameEngine.js` et `server.js` à la recherche
  de races conditions, doubles soumissions, et désynchronisations état
  serveur/client.
- Partie complète simulée via 4 bots socket réels jusqu'à la victoire
  (lobby → countdown → intro → manche → vote → égalité/départage →
  élimination → transition → manche 2 → élimination → finale → victoire).
- Vérification visuelle en direct (navigateur) du lobby, de la manche en
  cours et du spotlight joueur actif avec les nouveaux portraits.
- Vérification de la console navigateur (erreurs React/réseau) — bug
  d'hydratation détecté et corrigé (voir ci-dessus).
- `tsc --noEmit` : aucune erreur TypeScript.
