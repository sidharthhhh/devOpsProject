# Project 2: ELK Stack Setup

This project sets up a local development environment for **Elasticsearch** and **Kibana** using Docker Compose.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1.  **Start the services:**
    Open a terminal in this directory and run:
    ```bash
    docker-compose up -d
    ```

2.  **Verify Elasticsearch:**
    Open your browser or use curl to check if Elasticsearch is running:
    [http://localhost:9200](http://localhost:9200)

    You should see a JSON response with cluster information.

3.  **Access Kibana:**
    Once Elasticsearch is up, Kibana will start. Access the Kibana dashboard at:
    [http://localhost:5601](http://localhost:5601)

## Configuration Details

- **Elasticsearch**:
    - Version: 8.11.1
    - Port: 9200
    - Security: Disabled (`xpack.security.enabled=false`) for easier local development.
    - Discovery: Single-node mode.

- **Kibana**:
    - Version: 8.11.1
    - Port: 5601
    - Connected to: `http://elasticsearch:9200`

## Integration with Node.js

To integrate this setup with your Node.js application:
1.  Target `http://localhost:9200` as your Elasticsearch host.
2.  No authentication is required as security is disabled.
3.  Ensure your Node.js app is on the same network or can access localhost ports if running outside Docker.
