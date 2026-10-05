const { nanoid, customAlphabet } = require("nanoid");
const { QUESTIONS, pickQuestions } = require("./questions");

const codeGen = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

const CHAIN_STEPS = [100, 200, 300, 500, 1000, 1500, 2000, 3000, 4500, 6000, 8000, 10000];
const ANSWER_DELAY_MS = 2600; // pause after reveal of correct/wrong before next turn
const QUESTION_TIME_SEC = 10;
const VOTE_TIME_SEC = 20;
const INTRO_DURATION_MS = 5200;
const ROUND_SUMMARY_DURATION_MS = 6000;
const REVEAL_STEP_MS = 1500;
const ELIMINATION_DURATION_MS = 4200;
const TRANSITION_DURATION_MS = 2600;
const FINALE_INTRO_DURATION_MS = 4500;
const FINALE_QUESTIONS_PER_PLAYER = 5;

/** @type {Map<string, Room>} */
const rooms = new Map();

function makeAvatarSeed() {
  return Math.floor(Math.random() * 1000000);
}

function createRoom(hostName, settings) {
  let code;
  do {
    code = codeGen();
  } while (rooms.has(code));

  const hostId = nanoid(12);
  const hostToken = nanoid(24);

  const room = {
    code,
    hostId,
    createdAt: Date.now(),
    settings: {
      maxPlayers: clamp(settings?.maxPlayers ?? 8, 4, 8),
      roundDuration: clamp(settings?.roundDuration ?? 120, 60, 240),
      difficulty: settings?.difficulty ?? "mixte",
    },
    players: new Map(), // id -> player
    phase: "LOBBY",
    roundNumber: 0,
    turnOrder: [],
    turnIndex: 0,
    chain: 0,
    chainLevel: 0,
    roundBanked: 0,
    totalBankedAllPlayers: 0,
    currentQuestion: null,
    currentQuestionDeadline: null,
    currentTurnPlayerId: null,
    usedQuestionIds: new Set(),
    votes: new Map(),
    voteDeadline: null,
    lastAnswerResult: null,
    lastBankEvent: null,
    eliminationResult: null,
    tieBreak: null,
    roundStats: null,
    finale: null,
    winnerId: null,
    timers: {},
    paused: false,
  };

  addPlayer(room, hostId, hostName, hostToken, true);
  rooms.set(code, room);
  return { room, hostId, hostToken };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function addPlayer(room, id, name, token, isHost) {
  const player = {
    id,
    token,
    name: (name || "Joueur").slice(0, 18),
    avatarSeed: makeAvatarSeed(),
    isHost: !!isHost,
    connected: true,
    ready: isHost ? false : false,
    eliminated: false,
    banked: 0,
    roundContribution: 0,
    roundCorrect: 0,
    roundWrong: 0,
    roundResponseTimes: [],
    correctCount: 0,
    wrongCount: 0,
    responseTimes: [],
    answeredCurrent: false,
    joinedAt: Date.now(),
  };
  room.players.set(id, player);
  return player;
}

function findRoom(code) {
  return rooms.get((code || "").toUpperCase());
}

function activePlayers(room) {
  return [...room.players.values()].filter((p) => !p.eliminated);
}

function connectedPlayers(room) {
  return [...room.players.values()].filter((p) => p.connected);
}

function joinRoom(code, name, io) {
  const room = findRoom(code);
  if (!room) return { error: "Code de partie introuvable." };
  if (room.phase !== "LOBBY") return { error: "La partie a déjà commencé." };
  if (room.players.size >= room.settings.maxPlayers)
    return { error: "La partie est pleine." };

  const id = nanoid(12);
  const token = nanoid(24);
  const player = addPlayer(room, id, name, token, false);
  broadcastState(room, io);
  return { room, player, token };
}

function reconnectPlayer(code, playerId, token, io) {
  const room = findRoom(code);
  if (!room) return { error: "Partie introuvable." };
  const player = room.players.get(playerId);
  if (!player || player.token !== token) return { error: "Session invalide." };
  player.connected = true;
  clearTimer(room, `disconnect_${playerId}`);
  broadcastState(room, io);
  return { room, player };
}

function markDisconnected(room, playerId, io) {
  const player = room.players.get(playerId);
  if (!player) return;
  player.connected = false;
  broadcastState(room, io);
  // Give 90s to reconnect before auto-handling (host migration / nothing drastic for MVP)
  setTimer(room, `disconnect_${playerId}`, 90000, () => {
    // keep player in game (treated as eliminated-from-turn but data retained)
    broadcastState(room, io);
  });
}

function toggleReady(room, playerId, io) {
  const player = room.players.get(playerId);
  if (!player || room.phase !== "LOBBY") return;
  player.ready = !player.ready;
  broadcastState(room, io);
}

function canStart(room) {
  const connected = connectedPlayers(room);
  return (
    room.phase === "LOBBY" &&
    connected.length >= 4 &&
    connected.length <= room.settings.maxPlayers &&
    connected.every((p) => p.ready)
  );
}

function startGame(room, playerId, io) {
  if (playerId !== room.hostId) return { error: "Seul l'hôte peut démarrer." };
  if (!canStart(room)) return { error: "Conditions non réunies (4+ joueurs, tous prêts)." };

  room.phase = "COUNTDOWN";
  broadcastState(room, io);

  setTimer(room, "countdown", 3600, () => {
    room.phase = "INTRO";
    broadcastState(room, io);
    setTimer(room, "intro", INTRO_DURATION_MS, () => {
      startNewRound(room, io);
      scheduleRoundTimer(room, io);
    });
  });

  return { ok: true };
}

function startNewRound(room, io) {
  room.roundNumber += 1;
  room.chain = 0;
  room.chainLevel = 0;
  room.roundBanked = 0;
  room.turnIndex = 0;
  room.lastAnswerResult = null;
  room.lastBankEvent = null;
  room.roundStats = null;
  room.eliminationResult = null;
  room.tieBreak = null;

  for (const p of activePlayers(room)) {
    p.roundContribution = 0;
    p.roundCorrect = 0;
    p.roundWrong = 0;
    p.roundResponseTimes = [];
  }

  room.turnOrder = activePlayers(room)
    .map((p) => p.id)
    .sort(() => Math.random() - 0.5);

  room.phase = "ROUND_PLAY";
  broadcastState(room, io);
  serveNextQuestion(room, io);
}

function serveNextQuestion(room, io) {
  const order = room.turnOrder.filter((id) => {
    const p = room.players.get(id);
    return p && !p.eliminated;
  });
  room.turnOrder = order;
  if (order.length === 0) return endRound(room, io);

  const playerId = order[room.turnIndex % order.length];
  room.currentTurnPlayerId = playerId;

  const qs = pickQuestions(1, room.settings.difficulty, room.usedQuestionIds);
  const q = qs[0] || pickQuestions(1, "mixte", new Set())[0];
  room.usedQuestionIds.add(q.id);
  room.currentQuestion = q;
  room.currentQuestionDeadline = Date.now() + QUESTION_TIME_SEC * 1000;

  for (const p of room.players.values()) p.answeredCurrent = false;

  broadcastState(room, io);

  setTimer(room, "question", QUESTION_TIME_SEC * 1000 + 150, () => {
    if (room.phase !== "ROUND_PLAY") return;
    if (room.currentQuestion?.id === q.id) {
      resolveAnswer(room, io, playerId, null, true);
    }
  });
}

function resolveAnswer(room, io, playerId, choiceIndex, timedOut) {
  if (room.phase !== "ROUND_PLAY") return;
  if (playerId !== room.currentTurnPlayerId) return;
  const player = room.players.get(playerId);
  if (!player || player.answeredCurrent) return;
  const q = room.currentQuestion;
  if (!q) return;

  player.answeredCurrent = true;
  clearTimer(room, "question");

  const full = QUESTIONS.find((x) => x.id === q.id);
  const correct = !timedOut && full && choiceIndex === full.correctIndex;
  const responseTime = timedOut
    ? QUESTION_TIME_SEC
    : Math.max(0.2, (QUESTION_TIME_SEC * 1000 - (room.currentQuestionDeadline - Date.now())) / 1000);

  player.responseTimes.push(responseTime);
  player.roundResponseTimes.push(responseTime);

  let chainBefore = room.chain;
  if (correct) {
    room.chainLevel = Math.min(room.chainLevel + 1, CHAIN_STEPS.length);
    room.chain = CHAIN_STEPS[room.chainLevel - 1];
    const delta = room.chain - chainBefore;
    player.correctCount += 1;
    player.roundCorrect += 1;
    player.roundContribution += delta;
  } else {
    room.chain = 0;
    room.chainLevel = 0;
    player.wrongCount += 1;
    player.roundWrong += 1;
  }

  room.lastAnswerResult = {
    playerId,
    correct,
    timedOut: !!timedOut,
    correctIndex: full.correctIndex,
    chainBefore,
    chainAfter: room.chain,
    questionId: q.id,
  };
  room.currentQuestion = { ...q, correctIndex: full.correctIndex }; // reveal now safe
  broadcastState(room, io);

  setTimer(room, "afterAnswer", ANSWER_DELAY_MS, () => {
    room.lastAnswerResult = null;
    room.currentQuestion = null;
    advanceTurnOrEndRound(room, io);
  });
}

function bankChain(room, io, playerId) {
  if (room.phase !== "ROUND_PLAY") return;
  if (playerId !== room.currentTurnPlayerId) return;
  const player = room.players.get(playerId);
  if (!player || player.answeredCurrent) return;
  if (room.chain <= 0) return;

  player.answeredCurrent = true;
  clearTimer(room, "question");

  const amount = room.chain;
  player.banked += amount;
  room.roundBanked += amount;
  room.totalBankedAllPlayers += amount;
  room.lastBankEvent = { playerId, amount, newTotal: player.banked };
  room.chain = 0;
  room.chainLevel = 0;
  room.currentQuestion = null;
  broadcastState(room, io);

  setTimer(room, "afterBank", 2200, () => {
    room.lastBankEvent = null;
    advanceTurnOrEndRound(room, io);
  });
}

function advanceTurnOrEndRound(room, io) {
  if (room.phase !== "ROUND_PLAY") return;
  if (Date.now() >= (room.roundEndsAt || Infinity) || room.forceEndRound) {
    return endRound(room, io);
  }
  room.turnIndex += 1;
  serveNextQuestion(room, io);
}

// Called once at round start to schedule the hard end-of-round timer
function scheduleRoundTimer(room, io) {
  room.roundEndsAt = Date.now() + room.settings.roundDuration * 1000;
  setTimer(room, "roundEnd", room.settings.roundDuration * 1000, () => {
    room.forceEndRound = true;
    // let current question resolve naturally; if none in flight, end now
    if (!room.currentQuestion) endRound(room, io);
  });
}

function endRound(room, io) {
  clearTimer(room, "question");
  clearTimer(room, "roundEnd");
  room.forceEndRound = false;
  room.currentQuestion = null;
  room.currentTurnPlayerId = null;

  const active = activePlayers(room);
  const totalCorrect = active.reduce((s, p) => s + p.roundCorrect, 0);
  const totalWrong = active.reduce((s, p) => s + p.roundWrong, 0);
  const allTimes = active.flatMap((p) => p.roundResponseTimes);
  const avgTime = allTimes.length ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length : 0;

  room.roundStats = {
    roundNumber: room.roundNumber,
    cagnotteManche: room.roundBanked,
    totalBanque: room.totalBankedAllPlayers,
    bonnesReponses: totalCorrect,
    mauvaisesReponses: totalWrong,
    tempsMoyen: Math.round(avgTime * 10) / 10,
  };

  room.phase = "ROUND_SUMMARY";
  broadcastState(room, io);

  setTimer(room, "roundSummary", ROUND_SUMMARY_DURATION_MS, () => {
    if (active.length <= 2) {
      startFinaleIntro(room, io);
    } else {
      startVote(room, io);
    }
  });
}

function startVote(room, io) {
  room.votes = new Map();
  room.phase = "VOTE";
  room.voteDeadline = Date.now() + VOTE_TIME_SEC * 1000;
  broadcastState(room, io);

  setTimer(room, "vote", VOTE_TIME_SEC * 1000 + 150, () => {
    finalizeVotes(room, io);
  });
}

function submitVote(room, io, voterId, targetId) {
  if (room.phase !== "VOTE") return;
  const voter = room.players.get(voterId);
  if (!voter || voter.eliminated) return;
  if (voterId === targetId) return;
  const target = room.players.get(targetId);
  if (!target || target.eliminated) return;
  if (room.votes.has(voterId)) return;

  room.votes.set(voterId, targetId);
  broadcastState(room, io);

  const active = activePlayers(room);
  if (room.votes.size >= active.length) {
    clearTimer(room, "vote");
    finalizeVotes(room, io);
  }
}

function finalizeVotes(room, io) {
  if (room.phase !== "VOTE") return;
  const active = activePlayers(room);
  const tally = new Map(active.map((p) => [p.id, 0]));
  for (const targetId of room.votes.values()) {
    if (tally.has(targetId)) tally.set(targetId, tally.get(targetId) + 1);
  }

  const results = active
    .map((p) => ({ playerId: p.id, name: p.name, votes: tally.get(p.id) || 0 }))
    .sort((a, b) => b.votes - a.votes);

  const maxVotes = results[0]?.votes ?? 0;
  const topTied = results.filter((r) => r.votes === maxVotes);

  room.phase = "REVEAL";
  room.revealResults = results;
  broadcastState(room, io);

  setTimer(room, "revealDelay", results.length * REVEAL_STEP_MS + 1800, () => {
    if (topTied.length > 1) {
      runTieBreak(room, io, topTied.map((t) => t.playerId), results);
    } else {
      eliminatePlayer(room, io, topTied[0].playerId, results, null);
    }
  });
}

function runTieBreak(room, io, tiedIds, results) {
  const candidates = tiedIds.map((id) => room.players.get(id));
  candidates.sort((a, b) => {
    if (a.roundContribution !== b.roundContribution) return a.roundContribution - b.roundContribution;
    if (a.roundCorrect !== b.roundCorrect) return a.roundCorrect - b.roundCorrect;
    const avgA = avg(a.roundResponseTimes);
    const avgB = avg(b.roundResponseTimes);
    return avgB - avgA; // slower (higher avg) is worse -> sorts first
  });
  const loser = candidates[0];

  room.tieBreak = {
    candidates: candidates.map((c) => ({
      playerId: c.id,
      name: c.name,
      contribution: c.roundContribution,
      correct: c.roundCorrect,
      avgTime: Math.round(avg(c.roundResponseTimes) * 10) / 10,
    })),
    loserId: loser.id,
  };
  room.phase = "TIEBREAK";
  broadcastState(room, io);

  setTimer(room, "tieBreakDelay", 4200, () => {
    eliminatePlayer(room, io, loser.id, results, room.tieBreak);
  });
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function eliminatePlayer(room, io, playerId, results, tieBreak) {
  const player = room.players.get(playerId);
  if (player) player.eliminated = true;

  room.eliminationResult = {
    playerId,
    name: player?.name,
    results,
    tieBreak,
  };
  room.phase = "ELIMINATION";
  broadcastState(room, io);

  setTimer(room, "eliminationDelay", ELIMINATION_DURATION_MS, () => {
    const remaining = activePlayers(room);
    room.phase = "ROUND_TRANSITION";
    room.remainingCount = remaining.length;
    broadcastState(room, io);

    setTimer(room, "transitionDelay", TRANSITION_DURATION_MS, () => {
      if (remaining.length <= 2) {
        startFinaleIntro(room, io);
      } else {
        startNewRound(room, io);
        scheduleRoundTimer(room, io);
      }
    });
  });
}

function startFinaleIntro(room, io) {
  const finalists = activePlayers(room);
  room.phase = "FINALE_INTRO";
  room.finale = {
    players: finalists.map((p) => p.id),
    scores: Object.fromEntries(finalists.map((p) => [p.id, 0])),
    turnIndex: 0,
    questionsAsked: 0,
    totalQuestions: FINALE_QUESTIONS_PER_PLAYER * finalists.length,
  };
  broadcastState(room, io);

  setTimer(room, "finaleIntroDelay", FINALE_INTRO_DURATION_MS, () => {
    room.phase = "FINALE";
    broadcastState(room, io);
    serveFinaleQuestion(room, io);
  });
}

function serveFinaleQuestion(room, io) {
  const f = room.finale;
  if (f.questionsAsked >= f.totalQuestions) {
    return endFinale(room, io);
  }
  const playerId = f.players[f.turnIndex % f.players.length];
  room.currentTurnPlayerId = playerId;

  const qs = pickQuestions(1, room.settings.difficulty, room.usedQuestionIds);
  const q = qs[0] || pickQuestions(1, "mixte", new Set())[0];
  room.usedQuestionIds.add(q.id);
  room.currentQuestion = q;
  room.currentQuestionDeadline = Date.now() + QUESTION_TIME_SEC * 1000;
  for (const p of room.players.values()) p.answeredCurrent = false;

  broadcastState(room, io);

  setTimer(room, "finaleQuestion", QUESTION_TIME_SEC * 1000 + 150, () => {
    if (room.phase !== "FINALE") return;
    if (room.currentQuestion?.id === q.id) {
      resolveFinaleAnswer(room, io, playerId, null, true);
    }
  });
}

function resolveFinaleAnswer(room, io, playerId, choiceIndex, timedOut) {
  if (room.phase !== "FINALE") return;
  if (playerId !== room.currentTurnPlayerId) return;
  const player = room.players.get(playerId);
  if (!player || player.answeredCurrent) return;
  const q = room.currentQuestion;
  if (!q) return;

  player.answeredCurrent = true;
  clearTimer(room, "finaleQuestion");

  const full = QUESTIONS.find((x) => x.id === q.id);
  const correct = !timedOut && full && choiceIndex === full.correctIndex;
  if (correct) {
    room.finale.scores[playerId] = (room.finale.scores[playerId] || 0) + 1;
    player.correctCount += 1;
  } else {
    player.wrongCount += 1;
  }

  room.lastAnswerResult = {
    playerId,
    correct,
    timedOut: !!timedOut,
    correctIndex: full.correctIndex,
    questionId: q.id,
    finale: true,
  };
  room.currentQuestion = { ...q, correctIndex: full.correctIndex };
  room.finale.questionsAsked += 1;
  broadcastState(room, io);

  setTimer(room, "afterFinaleAnswer", ANSWER_DELAY_MS, () => {
    room.lastAnswerResult = null;
    room.currentQuestion = null;
    room.finale.turnIndex += 1;
    serveFinaleQuestion(room, io);
  });
}

function endFinale(room, io) {
  const f = room.finale;
  const [idA, idB] = f.players;
  const scoreA = f.scores[idA] || 0;
  const scoreB = f.scores[idB] || 0;
  let winnerId;
  if (scoreA !== scoreB) {
    winnerId = scoreA > scoreB ? idA : idB;
  } else {
    const pA = room.players.get(idA);
    const pB = room.players.get(idB);
    if (pA.banked !== pB.banked) winnerId = pA.banked > pB.banked ? idA : idB;
    else if (pA.correctCount !== pB.correctCount) winnerId = pA.correctCount > pB.correctCount ? idA : idB;
    else winnerId = Math.random() < 0.5 ? idA : idB;
  }

  room.winnerId = winnerId;
  room.currentTurnPlayerId = null;
  room.phase = "VICTORY";
  broadcastState(room, io);
}

function pauseGame(room, io, playerId) {
  if (playerId !== room.hostId) return;
  room.paused = !room.paused;
  broadcastState(room, io);
}

function setTimer(room, key, ms, fn) {
  clearTimer(room, key);
  room.timers[key] = setTimeout(() => {
    delete room.timers[key];
    fn();
  }, ms);
}

function clearTimer(room, key) {
  if (room.timers[key]) {
    clearTimeout(room.timers[key]);
    delete room.timers[key];
  }
}

function sanitizePlayers(room) {
  return [...room.players.values()].map((p) => ({
    id: p.id,
    name: p.name,
    avatarSeed: p.avatarSeed,
    isHost: p.isHost,
    connected: p.connected,
    ready: p.ready,
    eliminated: p.eliminated,
    banked: p.banked,
    correctCount: p.correctCount,
    wrongCount: p.wrongCount,
  }));
}

function getStateFor(room, viewerId) {
  const viewer = room.players.get(viewerId);
  const isActiveTurn = room.currentTurnPlayerId === viewerId;
  let question = null;
  if (room.currentQuestion) {
    const revealing = "correctIndex" in room.currentQuestion;
    question = {
      id: room.currentQuestion.id,
      category: room.currentQuestion.category,
      difficulty: room.currentQuestion.difficulty,
      question: room.currentQuestion.question,
      choices: room.currentQuestion.choices,
      correctIndex: revealing ? room.currentQuestion.correctIndex : null,
    };
  }

  return {
    code: room.code,
    phase: room.phase,
    settings: room.settings,
    hostId: room.hostId,
    viewerId,
    isSpectator: !!viewer?.eliminated,
    players: sanitizePlayers(room),
    roundNumber: room.roundNumber,
    turnOrder: room.turnOrder,
    currentTurnPlayerId: room.currentTurnPlayerId,
    isMyTurn: isActiveTurn,
    chain: room.chain,
    chainLevel: room.chainLevel,
    chainSteps: CHAIN_STEPS,
    roundBanked: room.roundBanked,
    totalBankedAllPlayers: room.totalBankedAllPlayers,
    question,
    questionDeadline: room.currentQuestionDeadline,
    lastAnswerResult: room.lastAnswerResult,
    lastBankEvent: room.lastBankEvent,
    roundEndsAt: room.roundEndsAt || null,
    hasVoted: room.votes?.has(viewerId) || false,
    voteDeadline: room.voteDeadline || null,
    voteCount: room.votes ? room.votes.size : 0,
    activeCount: activePlayers(room).length,
    revealResults: room.phase === "REVEAL" || room.phase === "TIEBREAK" || room.phase === "ELIMINATION" ? room.revealResults : null,
    tieBreak: room.tieBreak,
    eliminationResult: room.eliminationResult,
    remainingCount: room.remainingCount,
    roundStats: room.roundStats,
    finale: room.finale,
    winnerId: room.winnerId,
    canStart: canStart(room),
    paused: room.paused,
  };
}

function broadcastState(room, io) {
  for (const p of room.players.values()) {
    io.to(`player:${p.id}`).emit("state", getStateFor(room, p.id));
  }
}

function submitAnswer(room, io, playerId, choiceIndex) {
  if (room.phase === "FINALE") {
    resolveFinaleAnswer(room, io, playerId, choiceIndex, false);
  } else {
    resolveAnswer(room, io, playerId, choiceIndex, false);
  }
}

module.exports = {
  rooms,
  createRoom,
  findRoom,
  joinRoom,
  reconnectPlayer,
  markDisconnected,
  toggleReady,
  startGame,
  scheduleRoundTimer,
  resolveAnswer,
  resolveFinaleAnswer,
  submitAnswer,
  bankChain,
  submitVote,
  pauseGame,
  broadcastState,
  getStateFor,
  CHAIN_STEPS,
};
