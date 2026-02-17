const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { checkConnection, client } = require('./elastic/client');
const requestLogger = require('./middlewares/requestLogger');
const errorHandler = require('./middlewares/errorHandler');
const todoRoutes = require('./routes/todoRoutes');
const logRoutes = require('./routes/logRoutes');
const todoService = require('./services/todoService');
const { logEvent } = require('./services/loggerService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api/todos', todoRoutes);
app.use('/api/logs', logRoutes);

// Health Check Endpoint
app.get('/health', async (req, res) => {
    let esStatus = 'disconnected';
    try {
        const health = await client.cluster.health();
        esStatus = health.status;
    } catch (e) {
        esStatus = 'down';
    }

    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date(),
        service: 'todo-api',
        elasticsearch: esStatus,
        todosCount: todoService.count()
    });
});

// Error Handler
app.use(errorHandler);

// Start Server
async function startServer() {
    await checkConnection();

    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);

        // Log Startup Event
        logEvent({
            logLevel: 'info',
            actionType: 'SYSTEM_STARTUP',
            message: `Server started on port ${PORT}`,
            metadata: { port: PORT, pid: process.pid }
        });
    });
}

startServer();
