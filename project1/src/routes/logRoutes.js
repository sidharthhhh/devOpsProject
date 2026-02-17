const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');

// GET /api/logs/search?q=error
router.get('/search', logController.searchLogs);

// GET /api/logs/analytics
router.get('/analytics', logController.getAnalytics);

module.exports = router;
