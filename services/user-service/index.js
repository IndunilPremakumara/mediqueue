const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const authRoutes = require("./routes/auth");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use("/auth", authRoutes);

console.log("Loaded URI:", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("ERROR:", err.message));

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.get("/", (req, res) => {
  res.send("User Service Running");
});

app.listen(3001, () => {
  console.log("User Service running on port 3001");
});