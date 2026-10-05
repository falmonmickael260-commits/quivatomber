// Banque de questions - QUI VA TOMBER ?
// Chaque question: { id, category, difficulty, question, choices: [4], correctIndex }

const RAW = [
  // --- Culture générale ---
  ["Culture générale","facile","Combien de continents y a-t-il sur Terre ?",["5","6","7","8"],2],
  ["Culture générale","facile","Quelle est la monnaie utilisée en France ?",["Le franc","L'euro","Le dollar","La livre"],1],
  ["Culture générale","moyen","Quel est le plus long fleuve du monde ?",["Le Nil","L'Amazone","Le Yangtsé","Le Mississippi"],1],
  ["Culture générale","moyen","Combien de côtés a un hexagone ?",["5","6","7","8"],1],
  ["Culture générale","difficile","Quel philosophe a écrit « Le Discours de la méthode » ?",["Kant","Descartes","Voltaire","Rousseau"],1],
  ["Culture générale","facile","Quelle est la couleur obtenue en mélangeant bleu et jaune ?",["Violet","Orange","Vert","Rose"],2],
  ["Culture générale","moyen","Combien de jours compte une année bissextile ?",["364","365","366","367"],2],
  ["Culture générale","difficile","Quel est le plus petit pays du monde ?",["Monaco","Saint-Marin","Vatican","Liechtenstein"],2],

  // --- Histoire ---
  ["Histoire","facile","En quelle année a eu lieu la Révolution française ?",["1789","1799","1804","1776"],0],
  ["Histoire","moyen","Qui était empereur des Français en 1810 ?",["Louis XIV","Napoléon Bonaparte","Charlemagne","Louis XVI"],1],
  ["Histoire","moyen","En quelle année a pris fin la Seconde Guerre mondiale ?",["1943","1944","1945","1946"],2],
  ["Histoire","difficile","Quel traité a mis fin à la Première Guerre mondiale ?",["Traité de Vienne","Traité de Versailles","Traité de Paris","Traité de Rome"],1],
  ["Histoire","facile","Quel mur est tombé en 1989 ?",["Le mur de Chine","Le mur de Berlin","Le mur d'Hadrien","Le mur d'Atlantique"],1],
  ["Histoire","difficile","Qui a été le premier président de la Ve République française ?",["Georges Pompidou","Charles de Gaulle","François Mitterrand","René Coty"],1],

  // --- Géographie ---
  ["Géographie","facile","Quelle est la capitale du Canada ?",["Toronto","Vancouver","Ottawa","Montréal"],2],
  ["Géographie","facile","Quel est le plus grand désert du monde ?",["Gobi","Sahara","Antarctique","Kalahari"],2],
  ["Géographie","moyen","Dans quel pays se trouve la ville de Kyoto ?",["Chine","Corée du Sud","Japon","Thaïlande"],2],
  ["Géographie","moyen","Quel océan borde la côte ouest de l'Amérique du Sud ?",["Atlantique","Indien","Arctique","Pacifique"],3],
  ["Géographie","difficile","Quelle est la capitale de l'Australie ?",["Sydney","Melbourne","Canberra","Perth"],2],
  ["Géographie","facile","Quel pays a la forme d'une botte ?",["Espagne","Italie","Grèce","Portugal"],1],
  ["Géographie","difficile","Quel est le point culminant d'Europe ?",["Mont Blanc","Mont Elbrouz","Cervin","Etna"],1],

  // --- Sciences ---
  ["Sciences","facile","Combien de planètes compte le système solaire ?",["7","8","9","10"],1],
  ["Sciences","moyen","Quel est le symbole chimique de l'or ?",["Ag","Au","Or","Go"],1],
  ["Sciences","moyen","Quelle est la vitesse de la lumière approximativement ?",["300 000 km/s","150 000 km/s","1 000 000 km/s","30 000 km/s"],0],
  ["Sciences","difficile","Quel scientifique a formulé la théorie de la relativité ?",["Isaac Newton","Albert Einstein","Niels Bohr","Galilée"],1],
  ["Sciences","facile","Quel organe pompe le sang dans le corps humain ?",["Le foie","Le cœur","Le poumon","Le rein"],1],
  ["Sciences","difficile","Combien d'os compte le corps humain adulte ?",["186","206","226","246"],1],

  // --- Sport ---
  ["Sport","facile","Combien de joueurs compose une équipe de football sur le terrain ?",["9","10","11","12"],2],
  ["Sport","moyen","Tous les combien d'années ont lieu les Jeux Olympiques d'été ?",["2 ans","3 ans","4 ans","5 ans"],2],
  ["Sport","moyen","Dans quel sport utilise-t-on un volant ?",["Tennis","Badminton","Squash","Ping-pong"],1],
  ["Sport","difficile","Quel pays a remporté la Coupe du monde de football 2018 ?",["Brésil","Croatie","France","Allemagne"],2],
  ["Sport","facile","Combien de points vaut un panier à trois points en basketball ?",["1","2","3","4"],2],

  // --- Cinéma ---
  ["Cinéma","facile","Qui réalise la saga Star Wars originale ?",["Steven Spielberg","George Lucas","James Cameron","Ridley Scott"],1],
  ["Cinéma","moyen","Quel film a remporté l'Oscar du meilleur film en 1998 ?",["Titanic","Le Patient anglais","Shakespeare in Love","Forrest Gump"],0],
  ["Cinéma","moyen","Quel acteur joue Iron Man dans l'univers Marvel ?",["Chris Evans","Robert Downey Jr.","Chris Hemsworth","Mark Ruffalo"],1],
  ["Cinéma","difficile","Qui a réalisé « Pulp Fiction » ?",["Martin Scorsese","Quentin Tarantino","David Fincher","Christopher Nolan"],1],
  ["Cinéma","facile","Quel est le nom du poisson-clown dans « Le Monde de Nemo » ?",["Marin","Némo","Dory","Bruce"],1],

  // --- Musique ---
  ["Musique","facile","Combien de cordes a une guitare classique ?",["4","5","6","7"],2],
  ["Musique","moyen","Quel groupe a interprété « Bohemian Rhapsody » ?",["The Beatles","Queen","Pink Floyd","Led Zeppelin"],1],
  ["Musique","difficile","Quel compositeur est devenu sourd à la fin de sa vie ?",["Mozart","Bach","Beethoven","Chopin"],2],
  ["Musique","moyen","Quel instrument Jimi Hendrix jouait-il principalement ?",["Batterie","Guitare","Basse","Piano"],1],

  // --- Télévision ---
  ["Télévision","facile","Dans quelle ville se déroule la série « Friends » ?",["Los Angeles","Chicago","New York","Boston"],2],
  ["Télévision","moyen","Quel est le nom de la famille dans « Les Simpson » ?",["Les Griffin","Les Simpson","Les Smith","Les Taylor"],1],
  ["Télévision","difficile","Dans « Game of Thrones », quelle maison a pour emblème un loup ?",["Lannister","Stark","Targaryen","Baratheon"],1],

  // --- Technologie ---
  ["Technologie","facile","Que signifie le sigle « PC » ?",["Personal Computer","Private Code","Public Channel","Program Center"],0],
  ["Technologie","moyen","Quelle entreprise a créé l'iPhone ?",["Samsung","Google","Apple","Microsoft"],2],
  ["Technologie","difficile","Quel langage de programmation a été créé par Guido van Rossum ?",["Java","Python","Ruby","C++"],1],
  ["Technologie","moyen","Que signifie « Wi-Fi » dans le langage courant ?",["Wireless Fidelity","Wide Field","Wire Finder","World Fiber"],0],

  // --- Société ---
  ["Société","facile","Quel est l'âge légal pour voter en France ?",["16 ans","18 ans","21 ans","25 ans"],1],
  ["Société","moyen","Quelle organisation internationale a son siège à New York ?",["L'OTAN","L'ONU","L'UE","L'OMS"],1],
  ["Société","difficile","Quel économiste est associé à la théorie de la « main invisible » ?",["Karl Marx","Adam Smith","John Keynes","David Ricardo"],1],

  // --- Insolite ---
  ["Insolite","facile","Quel animal peut dormir les yeux ouverts ?",["Le chat","Le poisson","Le lapin","Le chien"],1],
  ["Insolite","moyen","Quel est le seul mammifère capable de voler ?",["L'écureuil volant","La chauve-souris","Le colibri","Le papillon"],1],
  ["Insolite","difficile","Combien de cœurs possède une pieuvre ?",["1","2","3","4"],2],
  ["Insolite","facile","Quelle est la durée de vie moyenne d'un escargot ?",["1 an","5 ans","10 ans","20 ans"],1],
];

const QUESTIONS = RAW.map((r, i) => ({
  id: `q_${i}`,
  category: r[0],
  difficulty: r[1],
  question: r[2],
  choices: r[3],
  correctIndex: r[4],
}));

function pickQuestions(count, difficulty, excludeIds = new Set()) {
  let pool = QUESTIONS.filter((q) => !excludeIds.has(q.id));
  if (difficulty && difficulty !== "mixte") {
    const filtered = pool.filter((q) => q.difficulty === difficulty);
    if (filtered.length >= count) pool = filtered;
  }
  // shuffle
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

module.exports = { QUESTIONS, pickQuestions };
