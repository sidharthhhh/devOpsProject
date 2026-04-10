<p align="center">
  <h1 align="center">Node.js Backend Template</h1>
  <p align="center">
    A production-grade backend starter built with <strong>TypeScript</strong>, <strong>Express.js</strong>, and <strong>MySQL</strong>.
    <br />
    Designed for scalability, clean architecture, and rapid API development.
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MySQL-8.0+-4479A1?logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## Features

- **TypeScript** — strict mode, path aliases, full type safety
- **Express.js** — lightweight, battle-tested HTTP framework
- **MySQL** — connection pooling via `mysql2/promise`
- **Zod** — schema-based request validation (DTO layer)
- **Winston** — structured, environment-aware logging
- **Helmet** — secure HTTP headers out of the box
- **CORS** — cross-origin resource sharing enabled
- **Morgan** — HTTP request logging
- **Centralized error handling** — consistent error responses
- **Clean layered architecture** — controllers, services, repositories, DTOs

---

## Tech Stack

| Layer          | Technology              |
| -------------- | ----------------------- |
| Runtime        | Node.js + TypeScript    |
| HTTP Framework | Express.js              |
| Database       | MySQL (`mysql2/promise`) |
| Validation     | Zod                     |
| Logging        | Winston                 |
| Security       | Helmet, CORS            |
| HTTP Logging   | Morgan                  |

---

## Project Structure

```
src/
├── config/              # Environment & database configuration
│   ├── env.ts           # Typed env loader with validation
│   └── database.ts      # MySQL connection pool & query helper
│
├── controllers/         # HTTP request handlers
│   ├── health.controller.ts
│   └── example.controller.ts
│
├── services/            # Business logic layer
│   └── example.service.ts
│
├── repositories/        # Database query layer (raw SQL)
│   └── example.repository.ts
│
├── dto/                 # Zod validation schemas
│   └── example.dto.ts
│
├── routes/              # Express route definitions
│   ├── health.routes.ts
│   └── example.routes.ts
│
├── middleware/           # Cross-cutting concerns
│   ├── error.middleware.ts
│   └── validation.middleware.ts
│
├── utils/               # Shared utilities
│   ├── logger.ts        # Winston logger
│   └── response.ts      # Standardized response helpers
│
├── types/               # Shared TypeScript types & interfaces
│   └── index.ts
│
├── app.ts               # Express app configuration
└── server.ts            # Server entry point
```

---

## Getting Started

### Prerequisites

| Requirement | Version |
| ----------- | ------- |
| Node.js     | >= 18   |
| MySQL       | >= 8.0  |
| npm         | >= 9    |

### 1. Clone & Install

```bash
git clone <repository-url>
cd node-backend-template
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Update `.env` with your database credentials:

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=example
```

### 3. Set Up the Database

```sql
CREATE DATABASE IF NOT EXISTS example;

USE example;

CREATE TABLE IF NOT EXISTS examples (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 4. Run the Server

```bash
# Development (hot-reload)
npm run dev

# Production build
npm run build
npm start
```

---

## API Reference

> **Base URL:** `/api/v1`

### Health Check

| Method | Endpoint  | Description            |
| ------ | --------- | ---------------------- |
| GET    | `/health` | Service health status  |

**Response:**

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "status": "ok",
    "timestamp": "2026-04-10T08:30:00.000Z",
    "service": "node-backend-template"
  }
}
```

### Example Resource

| Method | Endpoint                | Description              |
| ------ | ----------------------- | ------------------------ |
| GET    | `/api/v1/examples`      | List all examples        |
| GET    | `/api/v1/examples/:id`  | Get an example by ID     |
| POST   | `/api/v1/examples`      | Create a new example     |
| DELETE | `/api/v1/examples/:id`  | Delete an example        |

**Create Example — Request:**

```bash
curl -X POST http://localhost:3000/api/v1/examples \
  -H "Content-Type: application/json" \
  -d '{"name": "My Example", "description": "A sample entry"}'
```

**Create Example — Response (`201`):**

```json
{
  "success": true,
  "message": "Example created successfully",
  "data": {
    "id": 1,
    "name": "My Example",
    "description": "A sample entry",
    "is_active": 1,
    "created_at": "2026-04-10T08:30:00.000Z",
    "updated_at": "2026-04-10T08:30:00.000Z"
  }
}
```

---

## Scripts

| Script           | Description                              |
| ---------------- | ---------------------------------------- |
| `npm run dev`    | Start dev server with hot-reload         |
| `npm run build`  | Compile TypeScript to `dist/`            |
| `npm start`      | Run compiled production build            |
| `npm run clean`  | Remove the `dist/` directory             |

---

## Architecture

This project follows **clean layered architecture** with clear separation of concerns:

```
Request → Route → Controller → Service → Repository → MySQL
                                  ↑
                             DTO (Zod)
```

| Layer            | Responsibility                                        |
| ---------------- | ----------------------------------------------------- |
| **Routes**       | Map HTTP endpoints to controller methods              |
| **Controllers**  | Handle HTTP request/response, delegate to services    |
| **Services**     | Business logic, orchestration, error handling         |
| **Repositories** | Database queries — the only layer that touches SQL    |
| **DTOs**         | Request body validation using Zod schemas             |
| **Middleware**   | Cross-cutting concerns (error handling, validation)   |

---

## Extending the Template

1. **Add a new module**
   - Create files in `dto/`, `repositories/`, `services/`, `controllers/`, and `routes/`
   - Follow the `example` module as a reference

2. **Register routes**
   - Import and mount your new routes in `app.ts`
   - Use the `/api/v1/` prefix for versioned endpoints

3. **Add middleware**
   - Place new middleware in `middleware/`
   - Register it in `app.ts` before or after routes as needed

4. **Add environment variables**
   - Add new variables to `.env.example`
   - Update the config in `config/env.ts`

---

## License

MIT
