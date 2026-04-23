const jwt = require("jsonwebtoken");

const publicRoutes = [
  { path: "/api/users/login", method: "POST" },
  { path: "/api/users/register", method: "POST" },
  { path: "/health", method: "GET" }
];

const verifyToken = (req, res, next) => {
  // Check if the route is public or a socket.io request
  const isPublic = publicRoutes.some(route => 
    req.path === route.path && req.method === route.method
  ) || req.path.startsWith("/api/queue/socket.io");

  if (isPublic) {
    console.log(`[Auth] Public route allowed: ${req.path}`);
    return next();
  }

  console.log(`[Auth] Private route - checking token for: ${req.path}`);

  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = { verifyToken };
