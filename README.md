# DevOps Learning Projects

This repository contains practical DevOps projects focusing on modern observability, containerization, and backend development.

## Projects

### 1. [todo-observability-elastic](./project1)

A complete **Node.js + Express** Todo application integrated with **Elasticsearch** and **Kibana**.

**Key Features:**
-   **Full CRUD API**: Manage todos with a RESTful interface.
-   **Event Logging**: Every request, error, and system event is logged to Elasticsearch.
-   **Visualizations**: Kibana dashboards for traffic analysis, error rates, and performance monitoring.
-   **Dockerized Stack**: Elasticsearch and Kibana run in Docker containers.
-   **Bonus**: API endpoints to search logs and view analytics directly from Node.js.

**Tech Stack:**
-   Node.js (Express)
-   Elasticsearch 8.x
-   Kibana 8.x
-   Docker Compose


---

### 2. [ELK Stack Setup](./project2)

A dedicated **Docker Compose** setup for running **Elasticsearch** and **Kibana** locally.

**Key Features:**
-   **Instant Setup**: Quickly spin up a local ELK stack with a single command.
-   **Development Ready**: Pre-configured for local development with security disabled for easier testing.
-   **Latest Versions**: Uses local Docker images (v8.11.1).

**Tech Stack:**
-   Elasticsearch: 8.11.1
-   Kibana: 8.11.1
-   Docker Compose

---

## Getting Started

To run a specific project, navigate to its directory and follow the README instructions therein.

**Example:**
```bash
cd project1
npm install
docker-compose up -d
npm run dev
```
