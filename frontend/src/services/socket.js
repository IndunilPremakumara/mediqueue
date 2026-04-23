import { io } from "socket.io-client";

const socket = io("http://localhost:8081", {
  path: "/api/queue/socket.io"
});

export default socket;