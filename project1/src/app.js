const dotenv = require('dotenv');
dotenv.config();

// Start APM Agent
const apm = require('elastic-apm-node').start();

const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');
const todoRoutes = require('./routes/todoRoutes');
const todoService = require('./services/todoService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/todos', todoRoutes);

// Health Check Endpoint
app.get('/health', async (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date(),
        service: 'todo-api',
        todosCount: todoService.count()
    });
});

// Error Handler
app.use(errorHandler);

// Start Server
async function startServer() {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

startServer();
