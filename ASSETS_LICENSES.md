# Licences des assets — QUI VA TOMBER ?

## Décision sur les portraits de personnages

La mission demandait des personnages "réalistes" sourcés sur des bibliothèques
libres de droits (CC0, domaine public, etc.), avec interdiction explicite de :

- récupérer des photos de **personnes réelles** (risque de droit à l'image),
- récupérer des **personnages protégés** (séries, films, jeux),
- utiliser un asset dont la licence n'est pas clairement vérifiable.

Après évaluation des sources usuelles (Unsplash, Pexels, Pixabay, OpenGameArt,
Sketchfab…), aucune ne permet de remplir **simultanément** les trois
contraintes ci-dessus avec une garantie fiable :

- les portraits "réalistes" de qualité sur ces plateformes sont presque
  toujours des **photographies de vraies personnes** (modèles ayant cédé
  leurs droits pour un usage stock — pas pour incarner un "personnage" dans
  un jeu, ce qui est une utilisation différente et plus sensible) ;
- les visages générés par IA disponibles publiquement n'ont pas de licence
  vérifiable de façon fiable sans accès web complet au moment du contrôle ;
- télécharger des binaires externes d'origine incertaine dans un dépôt de
  code n'est pas une pratique sûre.

**Décision retenue : aucun asset visuel externe.** Les 8 "personnages" du jeu
([components/CharacterPortrait.tsx](components/CharacterPortrait.tsx)) sont
des illustrations vectorielles **entièrement originales**, créées pour ce
projet, sous forme de silhouettes stylisées "plateau TV" (éclairage de
studio, contre-jour, pas de visage dessiné pour éviter tout effet "mauvaise
IA" ou cartoon). Zéro dépendance externe, zéro risque de licence, zéro poids
réseau supplémentaire (SVG généré en code).

Aucun autre asset binaire (image, police, son) n'est utilisé dans ce projet :

- les polices (`Bebas Neue`, `Oswald`, `Inter`) sont chargées via Google
  Fonts (service géré par Google, polices sous licence Open Font License,
  usage web standard et gratuit) ;
- tous les effets sonores sont **générés en direct par code** via l'API Web
  Audio (`hooks/useSound.tsx`) — aucun fichier `.mp3`/`.wav` n'est embarqué.

## Pour aller plus loin en production

Si une identité visuelle plus photoréaliste est souhaitée pour un lancement
réel, les options les plus sûres sont, par ordre de préférence :

1. **Commander des illustrations originales** à un·e illustrateur·rice
   (aucun risque de licence, identité visuelle propre à la marque).
2. **Générer des portraits via un outil d'IA générative** sous contrat
   explicite autorisant l'usage commercial (ex. offres entreprise de
   générateurs d'images), en conservant la preuve de licence.
3. Utiliser un service d'avatars paramétriques largement adopté et
   clairement licencié (ex. DiceBear, licence MIT pour le moteur ; vérifier
   la licence propre à chaque style d'illustration avant intégration).

Dans tous les cas : consigner dans ce fichier la source, l'auteur, l'URL, la
licence exacte et les conditions d'usage avant tout ajout.

## Journal des assets

| Asset | Source | Auteur | Licence | Usage | Emplacement |
|---|---|---|---|---|---|
| Portraits de personnages (8 archétypes) | Création originale pour ce projet | Équipe QUI VA TOMBER ? | Propriété du projet | Avatars des joueurs | `components/CharacterPortrait.tsx` |
| Polices Bebas Neue / Oswald / Inter | Google Fonts | Voir Google Fonts | Open Font License | Typographie du jeu | `styles/globals.css` (import) |
| Effets sonores | Générés par code (oscillateurs Web Audio) | Équipe QUI VA TOMBER ? | Propriété du projet | Sound design | `hooks/useSound.tsx` |
