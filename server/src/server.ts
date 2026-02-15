import http from "http";

import app from "./app";
import { PORT } from "./config/env";

const server = http.createServer(app);

// Socket.io integration to be added in Phase 2
// const io = new Server(server, { cors: { origin: "*" } });

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});