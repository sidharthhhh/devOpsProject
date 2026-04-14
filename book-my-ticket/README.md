# Book My Ticket - Seat Booking Platform

A simplified seat booking platform with JWT-based authentication, built with Express.js and PostgreSQL.

## Features

- User registration and login with JWT authentication
- Secure password storage using bcrypt
- Protected seat booking endpoints
- View all available seats (public)
- View user's bookings (authenticated)
- Transaction-based booking to prevent race conditions
- Docker Compose setup for PostgreSQL

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Containerization**: Docker Compose

## Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose
- npm or yarn

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd booking-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and update with your values:

```bash
cp .env.example .env
```

Edit `.env` and set your JWT secret (minimum 32 characters):

```env
JWT_SECRET=your-super-secret-key-minimum-32-characters-long-change-this-in-production
JWT_EXPIRATION=24h
DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=sql_class_2_db
BCRYPT_ROUNDS=10
PORT=8080
```

### 4. Start PostgreSQL with Docker Compose

```bash
docker-compose up -d
```

This will:
- Start PostgreSQL on port 5433
- Create the database and tables automatically
- Insert 20 initial seats

### 5. Start the Application

```bash
node index.mjs
```

The server will start on `http://localhost:8080`

## API Documentation

### Authentication Flow

1. **Register** a new user account
2. **Login** to receive a JWT token
3. Use the token in the `Authorization` header for protected endpoints

### Endpoints

#### 1. Register User

**POST** `/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "userId": 1,
  "message": "User registered successfully"
}
```

**Error Responses:**
- `400` - Invalid email format or missing fields
- `409` - Email already registered
- `500` - Server error

---

#### 2. Login

**POST** `/login`

Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

**Error Responses:**
- `400` - Missing email or password
- `401` - Invalid credentials
- `500` - Server error

---

#### 3. Get All Seats (Public)

**GET** `/seats`

View all seats and their booking status. No authentication required.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "isbooked": 1,
    "user_id": 1,
    "booked_at": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": 2,
    "name": null,
    "isbooked": 0,
    "user_id": null,
    "booked_at": null
  }
]
```

---

#### 4. Book a Seat (Protected)

**PUT** `/:id/:name`

Book a seat for the authenticated user.

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**URL Parameters:**
- `id` - Seat ID to book
- `name` - Your name for the booking

**Example:**
```
PUT /5/John%20Doe
```

**Response (200 OK):**
```json
{
  "success": true,
  "seatId": 5,
  "userId": 1,
  "name": "John Doe",
  "message": "Seat booked successfully"
}
```

**Error Responses:**
- `400` - Seat already booked
- `401` - Missing or invalid token
- `500` - Server error

---

#### 5. Get My Bookings (Protected)

**GET** `/my-bookings`

View all bookings for the authenticated user.

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Response (200 OK):**
```json
{
  "bookings": [
    {
      "id": 5,
      "name": "John Doe",
      "booked_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Error Responses:**
- `401` - Missing or invalid token
- `500` - Server error

---

## Example Usage with cURL

### Register a User

```bash
curl -X POST http://localhost:8080/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Login

```bash
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Save the token from the response.

### View All Seats

```bash
curl http://localhost:8080/seats
```

### Book a Seat

```bash
curl -X PUT http://localhost:8080/5/John%20Doe \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### View My Bookings

```bash
curl http://localhost:8080/my-bookings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Seats Table

```sql
CREATE TABLE seats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    isbooked INT DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    booked_at TIMESTAMP
);
```

## Security Features

- **Password Hashing**: Passwords are hashed using bcrypt with 10 salt rounds
- **JWT Authentication**: Stateless authentication with signed tokens
- **SQL Injection Prevention**: Parameterized queries throughout
- **Transaction-based Booking**: Prevents race conditions with `FOR UPDATE` locks
- **Environment-based Secrets**: Sensitive configuration externalized

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Missing or invalid input fields |
| `INVALID_EMAIL` | Email format is invalid |
| `INVALID_PASSWORD` | Password doesn't meet requirements |
| `EMAIL_EXISTS` | Email already registered |
| `INVALID_CREDENTIALS` | Wrong email or password |
| `TOKEN_MISSING` | Authorization header not provided |
| `TOKEN_EXPIRED` | JWT token has expired |
| `TOKEN_INVALID` | JWT token is malformed or invalid |
| `SERVER_ERROR` | Internal server error |

## Development

### Project Structure

```
.
├── config/
│   └── env.js              # Environment configuration
├── middleware/
│   └── authenticateToken.js # JWT authentication middleware
├── services/
│   └── authService.js      # Authentication service
├── index.mjs               # Main application file
├── init.sql                # Database initialization
├── docker-compose.yml      # Docker Compose configuration
├── .env                    # Environment variables (not in git)
├── .env.example            # Environment template
└── README.md               # This file
```

### Stopping the Database

```bash
docker-compose down
```

To remove volumes (delete all data):

```bash
docker-compose down -v
```

## Production Considerations

1. **JWT Secret**: Use a strong, randomly generated secret (minimum 32 characters)
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Add rate limiting to prevent brute force attacks
4. **CORS**: Configure CORS properly for your frontend domain
5. **Logging**: Implement proper logging and monitoring
6. **Database**: Use connection pooling and proper indexes
7. **Environment Variables**: Never commit `.env` to version control

## License

ISC

## Author

Your Name
