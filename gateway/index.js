const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const dotenv = require("dotenv");
const { verifyToken } = require("./middleware/auth");

dotenv.config();

const app = express();
app.use(cors());

// Request logger
app.use((req, res, next) => {
    console.log(`[Gateway] ${req.method} ${req.path}`);
    next();
});

// Health check (Public)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Public route for user registration and login
app.use("/api/auth", createProxyMiddleware({ target: "http://user-service:3001", changeOrigin: true, pathRewrite: { '^/api/auth': '/auth' } }));

// Apply JWT verification to all other routes
app.use(verifyToken);

app.use("/api/appointments", createProxyMiddleware({ target: "http://appointment-service:3002", changeOrigin: true, pathRewrite: { '^/api/appointments': '/appointment' } }));
const queueProxy = createProxyMiddleware({
    target: "http://queue-service:3003",
    changeOrigin: true,
    ws: true,
    pathRewrite: { '^/api/queue': '/queue' }
});

app.use("/api/queue", queueProxy);

const server = app.listen(8080, () => {
    console.log("Gateway running on port 8080");
});

// Handle WebSocket upgrades for the queue service
server.on('upgrade', (req, socket, head) => {
    console.log(`[Gateway] ⬆️  WebSocket Upgrade: ${req.url}`);
    if (req.url.startsWith('/api/queue')) {
        queueProxy.upgrade(req, socket, head);
    } else {
        socket.destroy();
    }
});
