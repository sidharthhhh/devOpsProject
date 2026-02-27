# Pre-built Node.js APM Dashboard

Because we are using `elastic-apm-node`, Elastic provides out-of-the-box, pre-built dashboards for our Node.js API. You don't need to manually create visualizations for the standard metrics!

## How to Access the Pre-built Dashboard

1. Start your Docker containers `docker-compose up -d`.
2. Start the API using `npm run dev` or `npm start` (it runs on port 4000).
3. Generate some traffic by creating, fetching, or deleting todos (e.g., `npm run seed` or manually via `curl`).
4. Log in to **[Kibana](http://localhost:5601)**.
5. In the main navigation menu (the hamburger icon on the top left), scroll down to **Observability** and select **APM**.
6. Under the **Services** tab, you will see `todo-api` listed.
7. Click on **todo-api** to view the pre-built dashboard which includes:
   - **Latency**: Average response times for your endpoints.
   - **Throughput**: Requests per minute.
   - **Transactions**: A breakdown of the most requested endpoints and their individual performance.
   - **Errors**: Automatically captured unhandled exceptions and HTTP error responses.
   - **Dependencies**: Time spent making external calls (e.g., to Elasticsearch or databases).

Enjoy the zero-configuration observability monitoring!
