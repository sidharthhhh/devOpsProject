# Production Setup Guide

## Overview

This guide explains how to set up the Book My Ticket system in production where you need to manually initialize seats.

## New Endpoints for Production

### 1. Initialize Seats
**POST /initialize-seats**

Creates 20 vacant seats in the database.

**When to use:**
- First time deployment to production
- After database migration
- When you need to set up seats without Docker

**Example:**
```bash
curl -X POST https://your-api.com/initialize-seats
```

**Response:**
```json
{
  "success": true,
  "message": "20 vacant seats created successfully",
  "seatsCreated": 20,
  "seats": [...]
}
```

**Protection:**
- Won't create seats if they already exist
- Returns error if seats are already initialized

---

### 2. Reset Seats
**DELETE /reset-seats**

Deletes ALL seats from the database.

**When to use:**
- Testing environment reset
- Before re-initializing seats
- Emergency cleanup

**Example:**
```bash
curl -X DELETE https://your-api.com/reset-seats
```

**Response:**
```json
{
  "success": true,
  "message": "All seats deleted",
  "deletedCount": 20
}
```

**⚠️ WARNING:** This deletes ALL seats including booked ones. Use with caution!

---

## Production Deployment Steps

### Step 1: Deploy Application

Deploy your Node.js application to your production server (AWS, Heroku, DigitalOcean, etc.)

### Step 2: Set Environment Variables

Set these environment variables on your production server:

```env
JWT_SECRET=your-super-secret-production-key-minimum-32-characters-long
JWT_EXPIRATION=24h
DB_HOST=your-production-db-host
DB_PORT=5432
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=your-db-name
BCRYPT_ROUNDS=10
PORT=8080
```

**IMPORTANT:** Use a strong, unique JWT_SECRET in production!

### Step 3: Create Database Tables

Connect to your production database and run:

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create seats table
CREATE TABLE IF NOT EXISTS seats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    isbooked INT DEFAULT 0,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    booked_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seats_user_id ON seats(user_id);
```

### Step 4: Initialize Seats

Call the initialize endpoint:

```bash
curl -X POST https://your-production-url.com/initialize-seats
```

### Step 5: Verify Setup

Check that seats were created:

```bash
curl https://your-production-url.com/seats
```

You should see 20 vacant seats.

### Step 6: Test Authentication

1. Register a test user:
```bash
curl -X POST https://your-production-url.com/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

2. Login:
```bash
curl -X POST https://your-production-url.com/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

3. Book a seat with the token:
```bash
curl -X PUT https://your-production-url.com/1/Test%20User \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Common Production Scenarios

### Scenario 1: Fresh Deployment
```bash
# 1. Deploy app
# 2. Create database tables (SQL above)
# 3. Initialize seats
curl -X POST https://your-api.com/initialize-seats
```

### Scenario 2: Reset Everything (Testing)
```bash
# 1. Delete all seats
curl -X DELETE https://your-api.com/reset-seats

# 2. Re-initialize
curl -X POST https://your-api.com/initialize-seats
```

### Scenario 3: Add More Seats Later
```bash
# Connect to database and run:
INSERT INTO seats (isbooked) VALUES (0);  -- Add one seat
# Or add multiple:
INSERT INTO seats (isbooked) SELECT 0 FROM generate_series(1, 10);  -- Add 10 seats
```

### Scenario 4: Seats Already Exist
```bash
# Try to initialize
curl -X POST https://your-api.com/initialize-seats

# Response:
{
  "error": "Seats already initialized",
  "code": "SEATS_EXIST",
  "existingCount": 20,
  "message": "Database already has seats. Use DELETE /reset-seats to clear first."
}

# If you need to reset:
curl -X DELETE https://your-api.com/reset-seats
curl -X POST https://your-api.com/initialize-seats
```

---

## Security Considerations for Production

### 1. Protect Reset Endpoint

Consider adding authentication to the reset endpoint in production:

```javascript
// In index.mjs
app.delete("/reset-seats", authenticateToken, async (req, res) => {
  // Only allow admins or authenticated users
  // Add admin role check here
  // ...
});
```

### 2. Rate Limiting

Add rate limiting to prevent abuse:

```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 3. CORS Configuration

Configure CORS for your frontend domain:

```javascript
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true
}));
```

### 4. HTTPS Only

Always use HTTPS in production. Never send JWT tokens over HTTP.

### 5. Environment Variables

Never commit `.env` to version control. Use your hosting platform's environment variable management.

---

## Monitoring

### Health Check Endpoint

Add a health check endpoint:

```javascript
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy', 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});
```

### Logging

Add proper logging for production:

```bash
npm install winston
```

```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Use logger instead of console.log
logger.info('Server started', { port });
logger.error('Registration error', { error: error.message });
```

---

## Troubleshooting

### Seats Not Creating
**Problem:** Initialize endpoint returns error

**Solutions:**
1. Check database connection
2. Verify tables exist
3. Check database user has INSERT permissions
4. Look at server logs for detailed error

### Database Connection Failed
**Problem:** ECONNREFUSED error

**Solutions:**
1. Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in environment variables
2. Check database is running
3. Verify firewall rules allow connection
4. Check database accepts connections from your server IP

### Seats Already Exist Error
**Problem:** Can't initialize seats

**Solutions:**
1. Check if seats already exist: `curl https://your-api.com/seats`
2. If you need to reset: `curl -X DELETE https://your-api.com/reset-seats`
3. Then initialize: `curl -X POST https://your-api.com/initialize-seats`

---

## Postman Testing in Production

### Collection Setup

1. Create environment variable:
   - `baseUrl`: `https://your-production-url.com`

2. Update all requests to use `{{baseUrl}}`

3. Test sequence:
   - POST `{{baseUrl}}/initialize-seats`
   - GET `{{baseUrl}}/seats`
   - POST `{{baseUrl}}/register`
   - POST `{{baseUrl}}/login`
   - PUT `{{baseUrl}}/5/John Doe` (with Bearer token)
   - GET `{{baseUrl}}/my-bookings` (with Bearer token)

---

## Summary

**For Production:**
1. ✅ Deploy application
2. ✅ Set environment variables
3. ✅ Create database tables
4. ✅ Call `POST /initialize-seats` to create 20 vacant seats
5. ✅ Verify with `GET /seats`
6. ✅ Start accepting bookings!

**For Testing/Reset:**
1. ✅ Call `DELETE /reset-seats` to clear all seats
2. ✅ Call `POST /initialize-seats` to recreate 20 vacant seats

That's it! Your production system is ready. 🚀
