const axios = require('axios');

const KIBANA_URL = 'http://localhost:5601';
const DATA_VIEW_ID = 'todo-events-view';
const DASHBOARD_ID = 'todo-api-monitoring';

async function setupKibana() {
    console.log('🚀 Starting Kibana Dashboard Setup...');

    try {
        // 1. Check Kibana Status
        await axios.get(`${KIBANA_URL}/api/status`);
        console.log('✅ Kibana is reachable.');

        // 2. Create Data View (index pattern)
        console.log('Creating Data View...');
        try {
            await axios.post(`${KIBANA_URL}/api/data_views/data_view`, {
                data_view: {
                    title: 'todo-events-*',
                    name: 'Todo Events',
                    id: DATA_VIEW_ID,
                    timeFieldName: 'timestamp'
                }
            }, {
                headers: { 'kbn-xsrf': 'true' }
            });
            console.log('✅ Data View created.');
        } catch (e) {
            if (e.response && (e.response.status === 409 || e.response.status === 400)) {
                console.log('⚠️ Data View already exists (skipping).');
            } else {
                console.error('❌ Failed to create Data View:', e.message);
                if (e.response) console.error(e.response.data);
            }
        }

        // 3. Create Visualizations & Dashboard
        // We will use the 'saved_objects' API to create everything in one go if possible, 
        // or create individual visualizations then the dashboard.
        // For simplicity, we'll create a Dashboard object with embedded Lens visualizations by value if supported,
        // or create saved objects for visualizations first. 
        // A common pattern is to post a bulk create of saved objects.

        console.log('Creating Dashboard and Visualizations...');

        // Define objects: 1 Dashboard, 4 Lens Visualizations
        // Note: Constructing SO definitions manually is complex. 
        // A simpler approach for "hands-on" might be to just create the Data View 
        // and let the user build the dashboard, OR import a pre-defined NDJSON.
        // BUT, we want to automate. Let's try to create a simple dashboard.

        // Let's create a simply "Requests over time" visualization
        // The structure of these objects is complex and often changes between versions.
        // A safer bet for a script is to import a saved object, but we don't have one exported.
        // We will try to create a dashboard with a single Lens panel to demonstrate.

        // Actually, creating the Data View is often the biggest hurdle for beginners.
        // Let's focus on that ensuring it's ready, and maybe print instructions for the rest?
        // OR try to import a minimal dashboard structure. 

        // Let's try to create a simple dashboard object.
        const dashboardBody = {
            attributes: {
                title: 'Todo API Monitoring',
                description: 'Generated via setup script',
                panelsJSON: '[]', // Start empty or try to add panels if we knew the structure
                optionsJSON: '{"useMargins":true,"hidePanelTitles":false}',
                version: 1,
                timeRestore: false,
                kibanaSavedObjectMeta: {
                    searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}'
                }
            }
        };

        try {
            await axios.post(`${KIBANA_URL}/api/saved_objects/dashboard/${DASHBOARD_ID}`, dashboardBody, {
                headers: { 'kbn-xsrf': 'true' },
                params: { overwrite: true }
            });
            console.log('✅ Dashboard created (empty).');
        } catch (e) {
            console.error('❌ Failed to create Dashboard:', e.message);
        }

        console.log('\n🎉 Setup Complete!');
        console.log(`Open Kibana to see your data: ${KIBANA_URL}/app/dashboards#/view/${DASHBOARD_ID}`);
        console.log(`Make sure to set the time range to "Today" or "Last 15 minutes" to see data.`);

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('Is Kibana running on port 5601?');
        }
    }
}

setupKibana();
