const { client } = require('../elastic/client');
const { v4: uuidv4 } = require('uuid');

const INDEX_PREFIX = 'todo-events';

// Helper to get daily index name: todo-events-YYYY.MM.DD
function getIndexName() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${INDEX_PREFIX}-${year}.${month}.${day}`;
}

/**
 * Sends a log event to Elasticsearch
 * @param {Object} eventData - The data to log
 */
async function logEvent(eventData) {
    const doc = {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        serviceName: 'todo-api',
        environment: process.env.NODE_ENV || 'dev',
        ...eventData
    };

    const index = getIndexName();

    try {
        await client.index({
            index,
            document: doc
        });
    } catch (err) {
        // In a real app, you might write to a fallback file or stdout
        console.error('⚠️ Failed to send log to Elasticsearch:', err.message);
    }
}

module.exports = {
    logEvent
};
