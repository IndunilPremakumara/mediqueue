const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const dotenv = require("dotenv");
const { verifyToken } = require("./middleware/auth");

dotenv.config();

const app = express();
app.use(cors());

// Enhanced Request Logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusColor = res.statusCode >= 400 ? '❌' : '✅';
        console.log(`${statusColor} [Gateway] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});

// Health check (Public)
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

// Centralized Health Monitoring (Aggregator)
app.get('/api/health/all', async (req, res) => {
    const services = [
        { name: "User Service", url: "http://user-service:3001/health" },
        { name: "Appointment Service", url: "http://appointment-service:3002/health" },
        { name: "Queue Service", url: "http://queue-service:3003/health" },
        { name: "Notification Service", url: "http://notification-service:3004/health" }
    ];

    const results = await Promise.all(services.map(async (service) => {
        try {
            const start = Date.now();
            const response = await fetch(service.url, { signal: AbortSignal.timeout(2000) });
            const duration = Date.now() - start;
            return {
                name: service.name,
                status: response.ok ? "UP" : "DOWN",
                latency: `${duration}ms`,
                statusCode: response.status
            };
        } catch (err) {
            return {
                name: service.name,
                status: "DOWN",
                latency: "N/A",
                error: err.message
            };
        }
    }));

    res.json({
        timestamp: new Date().toISOString(),
        services: results,
        gateway: "UP"
    });
});

// Apply JWT verification to all routes except public ones (handled in middleware)
app.use((req, res, next) => {
    if (req.path === '/api/health/all') return next(); // Exclude health aggregator for testing/dashboard
    verifyToken(req, res, next);
});

app.use("/api/users", createProxyMiddleware({ target: "http://user-service:3001", changeOrigin: true, pathRewrite: { '^/api/users': '/auth' } }));
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
