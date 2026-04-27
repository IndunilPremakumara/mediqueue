const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes"
});

// REGISTER
router.post(
  "/register",
  authLimiter,
  [
    body("email").isEmail().withMessage("Invalid email format"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    body("name").notEmpty().withMessage("Name is required"),
    body("role").optional().isIn(["patient", "doctor", "admin"]).withMessage("Invalid role")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email, password, role } = req.body;

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        name,
        email,
        password: hashedPassword,
        role
      });

      await user.save();

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        token,
        role: user.role,
        name: user.name,
        email: user.email,
        id: user._id,
        message: "User registered successfully"
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json("Email already exists");
      }
      res.status(500).json(err.message || "Internal server error");
    }
  });

// LOGIN
router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Invalid email format"),
    body("password").notEmpty().withMessage("Password is required")
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) return res.status(404).json("User not found");

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json("Invalid credentials");

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        token,
        role: user.role,
        name: user.name,
        email: user.email,
        id: user._id
      });

    } catch (err) {
      res.status(500).json(err);
    }
  });

// GET ALL DOCTORS
router.get("/doctors", async (req, res) => {
  try {
    console.log("🔍 Fetching doctors...");
    const doctors = await User.find({ role: "doctor" }, "name _id");
    console.log(`✅ Found ${doctors.length} doctors`);
    res.json(doctors);
  } catch (err) {
    console.log("❌ Error fetching doctors:", err.message);
    res.status(500).json(err);
  }
});

// GET USER BY ID (for inter-service calls)
router.get("/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id, "name role email");
    if (!user) return res.status(404).json("User not found");
    res.json(user);
  } catch (err) {
    res.status(500).json(err.message);
  }
});

module.exports = router;