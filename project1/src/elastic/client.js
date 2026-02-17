const { Client } = require('@elastic/elasticsearch');
const dotenv = require('dotenv');

dotenv.config();

const client = new Client({
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    auth: process.env.ELASTICSEARCH_USERNAME ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
    } : undefined,
    // Decrease timeout for faster failure detection in dev
    requestTimeout: 3000
});

async function checkConnection() {
    let retries = 5;
    while (retries > 0) {
        try {
            const health = await client.cluster.health({});
            console.log('✅ Elasticsearch connected:', health.status);
            return true;
        } catch (err) {
            console.error(`⚠️ Elasticsearch connection failed, retrying... (${retries} left)`);
            retries--;
            await new Promise(res => setTimeout(res, 2000));
        }
    }
    console.error('❌ Could not connect to Elasticsearch after multiple retries.');
    return false;
}

module.exports = {
    client,
    checkConnection
};
