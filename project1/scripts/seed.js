const axios = require('axios');

const API_URL = 'http://localhost:3000/api/todos';

const sampleTodos = [
    { title: 'Learn Elasticsearch Basics', description: 'Understand indices and documents', priority: 'high', status: 'completed' },
    { title: 'Setup Docker Compose', description: 'Run ES and Kibana locally', priority: 'high', status: 'completed' },
    { title: 'Build Node.js API', description: 'Create Express routes', priority: 'medium', status: 'pending' },
    { title: 'Implement Logging', description: 'Send events to ES', priority: 'high', status: 'pending' },
    { title: 'Create Kibana Dashboards', description: 'Visualize the data', priority: 'medium', status: 'pending' },
    { title: 'Fix Bugs', description: 'Review error logs', priority: 'low', status: 'pending' }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function seed() {
    console.log('🌱 Starting seed process...');

    try {
        // 1. Create Todos
        console.log('Adding todos...');
        const createdIds = [];
        for (const todo of sampleTodos) {
            try {
                const res = await axios.post(API_URL, todo);
                createdIds.push(res.data.id);
                console.log(`Created: ${todo.title}`);
                await sleep(200); // Small delay to spread timestamps
            } catch (e) {
                console.error('Error creating todo:', e.message);
            }
        }

        // 2. generate some reads
        console.log('Generating read traffic...');
        for (let i = 0; i < 5; i++) {
            await axios.get(API_URL); // List all
            if (createdIds.length > 0) {
                const randomId = createdIds[Math.floor(Math.random() * createdIds.length)];
                await axios.get(`${API_URL}/${randomId}`); // Get one
            }
            await sleep(100);
        }

        // 3. Generate some updates
        console.log('Generating updates...');
        if (createdIds.length > 0) {
            const updateId = createdIds[0];
            await axios.put(`${API_URL}/${updateId}`, { title: 'Learn Elasticsearch Basics (Updated)', status: 'pending' });
        }

        // 4. Generate some deletes
        console.log('Generating deletes...');
        if (createdIds.length > 1) {
            // Delete the second one
            await axios.delete(`${API_URL}/${createdIds[1]}`);
        }

        // 5. Generate some 404s (Errors)
        console.log('Generating errors (404s)...');
        try {
            await axios.get(`${API_URL}/non-existent-id`);
        } catch (e) { /* ignore */ }

        try {
            await axios.delete(`${API_URL}/non-existent-id`);
        } catch (e) { /* ignore */ }

        console.log('✅ Seeding complete! Check Kibana for logs.');

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error('❌ Could not connect to API. Is the server running on port 3000?');
        } else {
            console.error('❌ User error:', error.message);
        }
    }
}

seed();
