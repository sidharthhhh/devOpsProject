const { v4: uuidv4 } = require('uuid');
const { logEvent } = require('../services/loggerService');

const requestLogger = (req, res, next) => {
    // Generate Request ID
    req.requestId = uuidv4();
    const startTime = Date.now();

    // Capture original end function to intercept response
    const originalEnd = res.end;
    let responseBody = null;

    // Intercept the response to log the status and duration AFTER the request is done
    res.on('finish', () => {
        const duration = Date.now() - startTime;

        // Determine action type based on Method/Path
        let actionType = 'UNKNOWN';
        if (req.method === 'POST' && req.path.includes('/todos')) actionType = 'CREATE_TODO';
        else if (req.method === 'GET' && req.path.match(/\/todos\/[^/]+$/)) actionType = 'FETCH_TODO';
        else if (req.method === 'GET' && req.path.includes('/todos')) actionType = 'LIST_TODOS';
        else if (req.method === 'PUT' && req.path.includes('/todos')) actionType = 'UPDATE_TODO';
        else if (req.method === 'DELETE' && req.path.includes('/todos')) actionType = 'DELETE_TODO';
        else if (req.path.includes('/health')) actionType = 'HEALTH_CHECK';

        // Safety: Remove sensitive data from payload if needed
        const safePayload = { ...req.body };

        // Construct Log Document
        const logData = {
            logLevel: res.statusCode >= 400 ? 'error' : 'info',
            actionType,
            // Safely attempt to get todoId (req.params might be empty in global middleware)
            todoId: (req.params && req.params.id) ? req.params.id : (req.path.match(/\/todos\/([a-f0-9-]+)$/) || [])[1] || null,
            requestId: req.requestId,
            userAgent: req.get('user-agent'),
            ipAddress: req.ip,
            endpoint: req.originalUrl,
            method: req.method,
            httpStatus: res.statusCode,
            responseTimeMs: duration,
            errorMessage: res.locals.errorMessage || null, // Capture from error handler if set
            payloadSnapshot: JSON.stringify(safePayload),
            metadata: {}
        };

        // Fire and forget logging (don't await to avoid slowing response)
        logEvent(logData);
    });

    next();
};

module.exports = requestLogger;
