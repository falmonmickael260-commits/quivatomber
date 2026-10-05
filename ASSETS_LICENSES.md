# Licences des assets — QUI VA TOMBER ?

## Candidats sur le plateau — modèles 3D

**Source : pack « Universal Base Characters » de Quaternius, licence CC0
(domaine public).** Mêmes modèles que ceux employés par le dépôt sœur
`falmonmickael260-commits/QuizzMaster` (et par quizzmaster.fr) : les
fichiers `public/models/*.glb` en sont repris tels quels.

21 personnages (10 féminins, 11 masculins), chacun riggé avec son
squelette et cinq animations intégrées — `Idle`, `Idle_Neutral`,
`Interact`, `Wave`, `HitRecieve` — que `components/stage/Character3D.tsx`
fait correspondre aux moments d'une manche (attente, réflexion, réponse
donnée, bonne réponse, échec). Aucune texture : les matériaux sont dans le
modèle, ce qui garde chaque fichier autour de 500 Ko.

Chaque personnage a aussi son portrait `public/characters/<nom>.png`, de
même nom de fichier : le portrait du lobby et le candidat sur le plateau
sont donc visiblement la même personne. Le serveur attribue une apparence
par joueur, sans remise (`lib/gameEngine.js`), pour qu'aucun candidat
d'une même partie n'ait de sosie.

## Portraits de personnages

**Source : pack "Universal Base Characters" de Quaternius, licence CC0
(domaine public).** Quaternius publie l'intégralité de ses modèles 3D en
CC0 : utilisation libre, y compris commerciale, modification autorisée,
aucune attribution requise. Page officielle du pack :
https://quaternius.itch.io/universal-base-characters

21 portraits (rendus statiques 256×256 des modèles 3D, fond sombre)
couvrant 10 silhouettes féminines et 11 masculines, tenues variées
(aventurier, soldat, costume, sorcière, roi, combinaison spatiale,
fermier, punk, plage, etc.) — assez de variété pour que chaque candidat
d'une partie à 8 joueurs soit instantanément reconnaissable.

Ce sont les rendus statiques des mêmes modèles : employés pour le lobby,
l'écran de présentation, le vote, et le plateau de repli sans WebGL.

Fichiers : `public/characters/*.png` — intégrés dans
[components/CharacterPortrait.tsx](components/CharacterPortrait.tsx), qui
choisit un portrait par joueur à partir de son `avatarSeed` et ajoute un
cadrage, un léger halo lumineux (couleur du plateau) et un contour — mise
en scène uniquement, les images elles-mêmes ne sont pas modifiées.

**Chaîne de provenance** : ces fichiers ont été récupérés tels quels
depuis le dépôt sœur `falmonmickael260-commits/QuizzMaster` (commits
`651ece8`…`717c522`, "Modèles 3D CC0 Quaternius"), qui les a lui-même
téléchargés automatiquement depuis la page itch.io officielle de
Quaternius via un pipeline versionné
(`.github/workflows/assets.yml` de ce dépôt sœur, action "Téléchargement
gratuit itch.io"). Rien n'a été pris sur une source tierce non vérifiée.

Ce choix répondait à la contrainte initiale (personnages réalistes, sans
vraie personne identifiable, sans personnage protégé, licence vérifiable) :
voir l'historique de ce fichier pour la première version de ce projet, où
cette contrainte avait conduit à des silhouettes 100% originales en
l'absence d'une source externe fiable alors identifiée — remplacées ici par
ces portraits CC0 une fois la source confirmée.

## Autres assets

- **Polices** (`Bebas Neue`, `Oswald`, `Inter`) : chargées via Google
  Fonts, licence Open Font License, usage web standard et gratuit.
- **Effets sonores** : générés en direct par code via l'API Web Audio
  (`hooks/useSound.tsx`) — aucun fichier `.mp3`/`.wav` embarqué, donc
  aucune question de licence sur ce point.

## Journal des assets

| Asset | Source | Auteur | Licence | Usage | Emplacement |
|---|---|---|---|---|---|
| 21 portraits de personnages | Quaternius — pack "Universal Base Characters" (via le pipeline du dépôt `QuizzMaster`) | Quaternius | CC0 (domaine public) | Avatars des joueurs | `public/characters/*.png`, `components/CharacterPortrait.tsx` |
| Polices Bebas Neue / Oswald / Inter | Google Fonts | Voir Google Fonts | Open Font License | Typographie du jeu | `styles/globals.css` (import) |
| Effets sonores | Générés par code (oscillateurs Web Audio) | Équipe QUI VA TOMBER ? | Propriété du projet | Sound design | `hooks/useSound.tsx` |
