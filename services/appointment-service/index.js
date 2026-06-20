const express = require("express");
const { Pool } = require("pg");
const dotenv = require("dotenv");
const cors = require("cors");
const appointmentRoutes = require("./routes/appointment");
const { connectRabbitMQ } = require("./rabbitmq");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use("/appointment", appointmentRoutes);

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.get("/", (req, res) => {
  res.send("Appointment Service Running");
});

// Start server first
app.listen(3002, () => {
  console.log("Appointment Service running on port 3002");
});

// Connect to RabbitMQ with retry logic
async function initializeRabbitMQ() {
  let retries = 30;
  while (retries > 0) {
    try {
      await connectRabbitMQ();
      console.log("✅ RabbitMQ connected");
      
      // RUN MIGRATION
      const pool = new Pool({ connectionString: process.env.DB_URI });
      await pool.query("ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'booked'");
      await pool.end();
      console.log("✅ Database migration completed");
      
      return;
    } catch (err) {
      retries--;
      console.log(`⚠️  RabbitMQ connection failed. Retries left: ${retries}`, err.message);
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  console.log("❌ Failed to connect to RabbitMQ after retries");
}

initializeRabbitMQ();