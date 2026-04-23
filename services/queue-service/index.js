const express = require("express");
const Redis = require("ioredis");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { consumeEvents } = require("./rabbitmq");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  path: "/queue/socket.io",
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Initialize RabbitMQ consumer with retry logic
async function initializeRabbitMQ() {
  let retries = 30;
  while (retries > 0) {
    try {
      await consumeEvents(io);
      console.log("✅ RabbitMQ consumer connected");
      return;
    } catch (err) {
      retries--;
      console.log(`⚠️  RabbitMQ connection failed. Retries left: ${retries}`, err.message);
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  console.log("❌ Failed to connect RabbitMQ consumer after retries");
}

initializeRabbitMQ();

const redis = new Redis(process.env.REDIS_URL);

// Store connected users
let clients = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("joinQueue", ({ doctor_id }) => {
    socket.join(`doctor_${doctor_id}`);
    console.log(`Joined doctor_${doctor_id}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Export io to use in routes
app.set("io", io);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.get("/", (req, res) => {
  res.send("Queue Service with WebSocket Running");
});

// ROUTES
const queueRoutes = require("./routes/queue");
app.use("/queue", queueRoutes);

server.listen(3003, () => {
  console.log("Queue Service running on port 3003");
});