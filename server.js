const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const engine = require("./lib/gameEngine");

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handle);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    let currentRoomCode = null;
    let currentPlayerId = null;

    socket.on("create_room", ({ name, settings }, cb) => {
      try {
        const { room, hostId, hostToken } = engine.createRoom(name, settings);
        currentRoomCode = room.code;
        currentPlayerId = hostId;
        engine.attachSocket(room, hostId, socket.id);
        socket.join(`player:${hostId}`);
        socket.join(`room:${room.code}`);
        cb?.({ ok: true, code: room.code, playerId: hostId, token: hostToken });
        engine.broadcastState(room, io);
      } catch (e) {
        cb?.({ ok: false, error: "Impossible de créer la partie." });
      }
    });

    socket.on("join_room", ({ code, name, character }, cb) => {
      const result = engine.joinRoom(code, name, io, character);
      if (result.error) return cb?.({ ok: false, error: result.error });
      currentRoomCode = result.room.code;
      currentPlayerId = result.player.id;
      engine.attachSocket(result.room, result.player.id, socket.id);
      socket.join(`player:${result.player.id}`);
      socket.join(`room:${result.room.code}`);
      cb?.({ ok: true, code: result.room.code, playerId: result.player.id, token: result.token });
      // engine.joinRoom a déjà diffusé l'état, mais ce socket n'avait pas
      // encore rejoint sa room `player:` — sans ce renvoi, le dernier
      // arrivant reste sans état jusqu'à la prochaine action d'un autre
      // joueur (écran de chargement bloqué).
      socket.emit("state", engine.getStateFor(result.room, result.player.id));
    });

    socket.on("reconnect_room", ({ code, playerId, token }, cb) => {
      const result = engine.reconnectPlayer(code, playerId, token, io);
      if (result.error) return cb?.({ ok: false, error: result.error });
      currentRoomCode = result.room.code;
      currentPlayerId = playerId;
      engine.attachSocket(result.room, playerId, socket.id);
      socket.join(`player:${playerId}`);
      socket.join(`room:${result.room.code}`);
      cb?.({ ok: true });
      // même raison que pour join_room : la diffusion faite par l'engine
      // est partie avant que ce socket ne rejoigne sa room.
      socket.emit("state", engine.getStateFor(result.room, playerId));
    });

    socket.on("set_character", ({ index }) => {
      const room = engine.findRoom(currentRoomCode);
      if (room) engine.setCharacter(room, currentPlayerId, index, io);
    });

    socket.on("toggle_ready", () => {
      const room = engine.findRoom(currentRoomCode);
      if (room) engine.toggleReady(room, currentPlayerId, io);
    });

    socket.on("start_game", (_, cb) => {
      const room = engine.findRoom(currentRoomCode);
      if (!room) return cb?.({ ok: false });
      const result = engine.startGame(room, currentPlayerId, io);
      cb?.(result);
    });

    socket.on("choose_bank", () => {
      const room = engine.findRoom(currentRoomCode);
      if (room) engine.bankChain(room, io, currentPlayerId);
    });

    socket.on("submit_answer", ({ choiceIndex }) => {
      const room = engine.findRoom(currentRoomCode);
      if (room) engine.submitAnswer(room, io, currentPlayerId, choiceIndex);
    });

    socket.on("submit_vote", ({ targetId }) => {
      const room = engine.findRoom(currentRoomCode);
      if (room) engine.submitVote(room, io, currentPlayerId, targetId);
    });

    socket.on("host_pause", () => {
      const room = engine.findRoom(currentRoomCode);
      if (room) engine.pauseGame(room, io, currentPlayerId);
    });

    socket.on("disconnect", () => {
      const room = engine.findRoom(currentRoomCode);
      if (room && currentPlayerId) {
        // on passe l'id du socket : si le joueur est déjà revenu par un
        // autre socket, cette déconnexion-ci ne le concerne plus
        engine.markDisconnected(room, currentPlayerId, io, socket.id);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> QUI VA TOMBER ? prêt sur http://localhost:${port}`);
  });
});
