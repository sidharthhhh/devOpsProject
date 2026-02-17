const { client } = require('../elastic/client');

const INDEX_PATTERN = 'todo-events-*';

exports.searchLogs = async (req, res, next) => {
    try {
        const { q, limit = 20 } = req.query;

        // Build query
        const query = q
            ? {
                multi_match: {
                    query: q,
                    fields: ['actionType', 'errorMessage', 'endpoint', 'serviceName', 'logLevel']
                }
            }
            : { match_all: {} };

        const result = await client.search({
            index: INDEX_PATTERN,
            size: limit,
            sort: [{ timestamp: 'desc' }],
            query
        });

        const hits = result.hits.hits.map(h => h._source);
        res.json({
            total: result.hits.total.value,
            count: hits.length,
            logs: hits
        });
    } catch (error) {
        next(error);
    }
};

exports.getAnalytics = async (req, res, next) => {
    try {
        const result = await client.search({
            index: INDEX_PATTERN,
            size: 0, // We only want aggregations, no hits
            aggs: {
                actions_count: {
                    terms: { field: "actionType" }
                },
                status_code_count: {
                    terms: { field: "httpStatus" }
                },
                log_levels: {
                    terms: { field: "logLevel" }
                }
            }
        });

        res.json({
            actions: result.aggregations.actions_count.buckets,
            statusCodes: result.aggregations.status_code_count.buckets,
            logLevels: result.aggregations.log_levels.buckets
        });
    } catch (error) {
        next(error);
    }
};
