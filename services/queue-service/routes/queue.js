const express = require("express");
const router = express.Router();
const Redis = require("ioredis");
const { verifyToken, checkRole } = require("../middleware/auth");

const redis = new Redis(process.env.REDIS_URL);

// ADD PATIENT TO QUEUE
router.post("/add", verifyToken, checkRole(["patient", "admin"]), async (req, res) => {
  try {
    const io = req.app.get("io");
    const { patient_name, doctor_id } = req.body;
    const queueKey = `queue:${doctor_id}`;
    const score = Date.now();

    await redis.zadd(queueKey, score, patient_name);

    const position = await redis.zrank(queueKey, patient_name);

    io.to(`doctor_${doctor_id}`).emit("queueUpdated", {
      message: "New patient added",
    });

    res.json({
      message: "Added to queue",
      position: position + 1
    });

  } catch (err) {
    res.status(500).json(err);
  }
});

// GET QUEUE POSITION
router.get("/position/:doctor_id/:patient_name", verifyToken, async (req, res) => {
  try {
    const { doctor_id, patient_name } = req.params;

    const queueKey = `queue:${doctor_id}`;

    const position = await redis.zrank(queueKey, patient_name);

    if (position === null) {
      return res.status(404).json("Not in queue");
    }

    res.json({
      position: position + 1
    });

  } catch (err) {
    res.status(500).json(err);
  }
});


// CALL NEXT PATIENT (Doctor action)
router.post("/next/:doctor_id", verifyToken, checkRole(["doctor", "admin"]), async (req, res) => {
  try {
    const io = req.app.get("io");
    const { doctor_id } = req.params;
    const queueKey = `queue:${doctor_id}`;

    const nextPatient = await redis.zpopmin(queueKey);
    const nextPatientName = nextPatient[0];
    let apptTime = "N/A";
    
    if (nextPatientName) {
      apptTime = await redis.hget(`info:${doctor_id}:${nextPatientName}`, "time") || "N/A";
    }

    // Emit update
    io.to(`doctor_${doctor_id}`).emit("queueUpdated", {
      message: "Queue updated",
      nowServing: nextPatientName || null,
      time: apptTime
    });

    res.json({ nowServing: nextPatientName || null, time: apptTime });

      } catch (err) {
        res.status(500).json(err);
      }
    });

// GET FULL QUEUE LIST
router.get("/list/:doctor_id", verifyToken, checkRole(["doctor", "admin"]), async (req, res) => {
  try {
    const { doctor_id } = req.params;
    const queueKey = `queue:${doctor_id}`;
    
    // Get all members with their scores (timestamps)
    const list = await redis.zrange(queueKey, 0, -1, "WITHSCORES");
    
    // Redis returns [name1, score1, name2, score2, ...]
    const patients = [];
    for (let i = 0; i < list.length; i += 2) {
      const pName = list[i];
      const apptTime = await redis.hget(`info:${doctor_id}:${pName}`, "time") || "N/A";
      
      patients.push({
        name: pName,
        joinedAt: new Date(parseInt(list[i + 1])),
        time: apptTime
      });
    }
    
    res.json(patients);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;