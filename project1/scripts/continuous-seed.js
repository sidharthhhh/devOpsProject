const axios = require('axios');

const API_URL = 'http://localhost:4000/api/todos';

const sampleTodos = [
    { title: 'Learn Elasticsearch Basics', description: 'Understand indices and documents', priority: 'high', status: 'completed' },
    { title: 'Setup Docker Compose', description: 'Run ES and Kibana locally', priority: 'high', status: 'pending' },
    { title: 'Build Node.js API', description: 'Create REST endpoints', priority: 'medium', status: 'pending' },
    { title: 'Implement Logging', description: 'Add Elasticsearch client', priority: 'medium', status: 'pending' },
    { title: 'Create Kibana Dashboards', description: 'Visualize API metrics', priority: 'low', status: 'pending' },
    { title: 'Fix Bugs', description: 'Resolve random application errors', priority: 'high', status: 'in-progress' }
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function randomCreate() {
    try {
        const todo = sampleTodos[Math.floor(Math.random() * sampleTodos.length)];
        const res = await axios.post(API_URL, todo);
        console.log(`[POST] Created: ${res.data.title}`);
        return res.data.id;
    } catch (error) {
        console.error(`[POST] Error creating todo: ${error.message}`);
        return null;
    }
}

async function randomRead(id) {
    try {
        if (id) {
            await axios.get(`${API_URL}/${id}`);
            console.log(`[GET] Read specific todo: ${id}`);
        } else {
            await axios.get(API_URL);
            console.log(`[GET] Read all todos`);
        }
    } catch (error) {
        console.error(`[GET] Error reading: ${error.message}`);
    }
}

async function randomUpdate(id) {
    if (!id) return;
    try {
        const statuses = ['pending', 'in-progress', 'completed'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        await axios.put(`${API_URL}/${id}`, { status });
        console.log(`[PUT] Updated: ${id} to ${status}`);
    } catch (error) {
        console.error(`[PUT] Error updating: ${error.message}`);
    }
}

async function randomDelete(id) {
    if (!id) return;
    try {
        await axios.delete(`${API_URL}/${id}`);
        console.log(`[DELETE] Deleted: ${id}`);
    } catch (error) {
        console.error(`[DELETE] Error deleting: ${error.message}`);
    }
}

async function generateError() {
    try {
        // Intentional 404
        await axios.get(`${API_URL}/not-a-real-id-12345`);
    } catch (error) {
        console.log(`[ERROR] Generated 404 intentionally`);
    }

    try {
        // Intentional 400
        await axios.post(API_URL, {});
    } catch (error) {
        console.log(`[ERROR] Generated 400 intentionally`);
    }

    try {
        // Intentional Custom 500 Error
        await axios.get(`${API_URL}/error`);
    } catch (error) {
        console.log(`[ERROR] Generated Custom 500 intentionally: ${error.message}`);
    }
}

async function runTraffic() {
    console.log("🚀 Starting continuous traffic generation...");
    console.log("Press Ctrl+C to stop.");

    let activeIds = [];

    while (true) {
        const action = Math.random();

        // 30% chance to Create
        if (action < 0.3) {
            const id = await randomCreate();
            if (id) activeIds.push(id);
        }
        // 40% chance to Read
        else if (action < 0.7) {
            // Read specifically if we have IDs, otherwise read all
            if (activeIds.length > 0 && Math.random() > 0.5) {
                const id = activeIds[Math.floor(Math.random() * activeIds.length)];
                await randomRead(id);
            } else {
                await randomRead(null);
            }
        }
        // 10% chance to Update
        else if (action < 0.8) {
            if (activeIds.length > 0) {
                const id = activeIds[Math.floor(Math.random() * activeIds.length)];
                await randomUpdate(id);
            }
        }
        // 10% chance to Delete
        else if (action < 0.9) {
            if (activeIds.length > 0) {
                const index = Math.floor(Math.random() * activeIds.length);
                const id = activeIds[index];
                await randomDelete(id);
                activeIds.splice(index, 1); // remove from our local array
            }
        }
        // 10% chance to generate explicit Errors
        else {
            await generateError();
        }

        // Wait a random amount of time between 500ms and 2000ms
        const delay = Math.floor(Math.random() * 1500) + 500;
        await sleep(delay);
    }
}

runTraffic();
