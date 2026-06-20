const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
require("dotenv").config();
const { publishEvent } = require("../rabbitmq");
const { verifyToken, checkRole } = require("../middleware/auth");

const pool = new Pool({
  connectionString: process.env.DB_URI
});

// BOOK APPOINTMENT
router.post("/book", verifyToken, checkRole(["patient", "admin"]), async (req, res) => {
  const client = await pool.connect();

  try {
    const { patient_name, doctor_id, doctor_name, appointment_time } = req.body;

    if (!patient_name || !doctor_id || !appointment_time) {
      return res.status(400).json("Missing required booking information.");
    }

    // CHECK IF PATIENT ALREADY HAS AN ACTIVE APPOINTMENT
    const activeAppointment = await pool.query(
      "SELECT * FROM appointments WHERE patient_name = $1 AND status = 'booked'",
      [patient_name]
    );

    if (activeAppointment.rows.length > 0) {
      return res.status(400).json("You already have an active appointment.");
    }

    // CHECK IF DOCTOR IS AVAILABLE AT THAT TIME
    // const doctorAvailable = await pool.query(
    //   "SELECT * FROM appointments WHERE doctor_id = $1 AND appointment_time = $2",
    //   [doctor_id, appointment_time]
    // );

    // if (doctorAvailable.rows.length > 0) {
    //   return res.status(400).json("Doctor is not available at this time.");
    // }

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO appointments (patient_name, doctor_id, appointment_time)
       VALUES ($1, $2, $3) RETURNING *`,
      [patient_name, doctor_id, appointment_time]
    );

    await client.query("COMMIT");

    publishEvent("appointment.booked", {
      doctor_id,
      doctor_name: doctor_name || `Dr. ${doctor_id}`,
      patient_name,
      appointment_time
    });

    res.json(result.rows[0]);

  } catch (err) {
    if (client) await client.query("ROLLBACK");
    console.error("Booking Error:", err);
    res.status(500).json(err.message || "Internal server error during booking.");
  } finally {
    client.release();
  }
});

// CANCEL APPOINTMENT
router.post("/cancel", verifyToken, checkRole(["patient", "doctor", "admin"]), async (req, res) => {
  const { patient_name, doctor_id, doctor_name } = req.body;
  try {
    const result = await pool.query(
      "UPDATE appointments SET status = 'cancelled' WHERE patient_name = $1 AND doctor_id = $2 AND status = 'booked' RETURNING *",
      [patient_name, doctor_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json("No active appointment found to cancel.");
    }

    publishEvent("appointment.cancelled", {
      doctor_id,
      doctor_name: doctor_name || `Dr. ${doctor_id}`,
      patient_name
    });

    res.json({ message: "Appointment cancelled successfully" });
  } catch (err) {
    res.status(500).json(err.message);
  }
});

router.get("/patient/:name", verifyToken, async (req, res) => {
  try {
    const { name } = req.params;
    const result = await pool.query(
      "SELECT * FROM appointments WHERE patient_name = $1 ORDER BY created_at DESC LIMIT 1",
      [name]
    );
    if (result.rows.length === 0) {
      return res.status(404).json("No appointment found");
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

router.get("/all", verifyToken, checkRole(["doctor", "admin"]), async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM appointments");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

router.post("/complete", verifyToken, checkRole(["doctor", "admin"]), async (req, res) => {
  const { patient_name, doctor_id } = req.body;
  console.log(`[Appointment] Attempting to complete: Patient=${patient_name}, Doctor=${doctor_id}`);
  try {
    const result = await pool.query(
      "UPDATE appointments SET status = 'finished' WHERE patient_name = $1 AND doctor_id = $2 RETURNING *",
      [patient_name, doctor_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json("No appointment found to complete.");
    }

    publishEvent("appointment.finished", {
      doctor_id,
      patient_name
    });

    res.json({ message: "Appointment marked as finished" });
  } catch (err) {
    console.error("❌ Complete Consultation Error:", err);
    res.status(500).json(err.message);
  }
});

module.exports = router;