import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

let sharedSocket: Socket | null = null;

export function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io({ transports: ["websocket", "polling"] });
  }
  return sharedSocket;
}

export function useSocket() {
  const socketRef = useRef<Socket>();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;
    setConnected(s.connected);
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, []);

  return { socket: socketRef.current || getSocket(), connected };
}
