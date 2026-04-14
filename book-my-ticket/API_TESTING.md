# API Testing Guide

Complete guide to test all API endpoints with sample payloads and expected responses.

## Prerequisites

1. Start the database:
```bash
docker-compose up -d
```

2. Start the application:
```bash
npm run dev
```

3. Base URL: `http://localhost:8080`

---

## 1. Register User

**Endpoint:** `POST /register`

**Description:** Create a new user account

**Headers:**
```
Content-Type: application/json
```

**Request Payload:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**cURL Command:**
```bash
curl -X POST http://localhost:8080/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "userId": 1,
  "message": "User registered successfully"
}
```

**Error Cases:**

**Missing Email:**
```bash
curl -X POST http://localhost:8080/register \
  -H "Content-Type: application/json" \
  -d '{"password": "password123"}'
```
Response (400):
```json
{
  "error": "Email and password are required",
  "code": "VALIDATION_ERROR"
}
```

**Invalid Email Format:**
```bash
curl -X POST http://localhost:8080/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "password": "password123"
  }'
```
Response (400):
```json
{
  "error": "Invalid email format",
  "code": "INVALID_EMAIL"
}
```

**Short Password:**
```bash
curl -X POST http://localhost:8080/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "short"
  }'
```
Response (400):
```json
{
  "error": "Password must be at least 8 characters",
  "code": "INVALID_PASSWORD"
}
```

**Duplicate Email:**
```bash
# Register same email twice
curl -X POST http://localhost:8080/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```
Response (409):
```json
{
  "error": "Email already registered",
  "code": "EMAIL_EXISTS"
}
```

---

## 2. Login

**Endpoint:** `POST /login`

**Description:** Authenticate user and receive JWT token

**Headers:**
```
Content-Type: application/json
```

**Request Payload:**
```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**cURL Command:**
```bash
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTcwNTMxNjQwMCwiZXhwIjoxNzA1NDAyODAwfQ.abc123...",
  "expiresIn": "24h"
}
```

**⚠️ IMPORTANT:** Save the token from the response. You'll need it for protected endpoints!

**Error Cases:**

**Missing Credentials:**
```bash
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john.doe@example.com"}'
```
Response (400):
```json
{
  "error": "Email and password are required",
  "code": "VALIDATION_ERROR"
}
```

**Invalid Credentials (Wrong Password):**
```bash
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "wrongpassword"
  }'
```
Response (401):
```json
{
  "error": "Invalid credentials",
  "code": "INVALID_CREDENTIALS"
}
```

**Invalid Credentials (Non-existent Email):**
```bash
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nonexistent@example.com",
    "password": "password123"
  }'
```
Response (401):
```json
{
  "error": "Invalid credentials",
  "code": "INVALID_CREDENTIALS"
}
```

---

## 3. Get All Seats (Public)

**Endpoint:** `GET /seats`

**Description:** View all seats and their booking status (No authentication required)

**Headers:**
```
None required
```

**cURL Command:**
```bash
curl http://localhost:8080/seats
```

**Expected Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": null,
    "isbooked": 0,
    "user_id": null,
    "booked_at": null
  },
  {
    "id": 2,
    "name": "John Doe",
    "isbooked": 1,
    "user_id": 1,
    "booked_at": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": 3,
    "name": null,
    "isbooked": 0,
    "user_id": null,
    "booked_at": null
  }
  // ... more seats
]
```

**Field Descriptions:**
- `id`: Seat number
- `name`: Name of person who booked (null if available)
- `isbooked`: 0 = available, 1 = booked
- `user_id`: ID of user who booked (null if available)
- `booked_at`: Timestamp of booking (null if available)

---

## 4. Book a Seat (Protected)

**Endpoint:** `PUT /:id/:name`

**Description:** Book a seat for authenticated user

**Headers:**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**URL Parameters:**
- `id`: Seat ID (1-20)
- `name`: Your name for the booking

**cURL Command:**
```bash
# Replace YOUR_TOKEN_HERE with the token from login response
curl -X PUT http://localhost:8080/5/John%20Doe \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Example with actual token:**
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X PUT http://localhost:8080/5/John%20Doe \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "seatId": 5,
  "userId": 1,
  "name": "John Doe",
  "message": "Seat booked successfully"
}
```

**Error Cases:**

**Missing Token:**
```bash
curl -X PUT http://localhost:8080/5/John%20Doe
```
Response (401):
```json
{
  "error": "Access token required",
  "code": "TOKEN_MISSING"
}
```

**Invalid Token:**
```bash
curl -X PUT http://localhost:8080/5/John%20Doe \
  -H "Authorization: Bearer invalid_token_here"
```
Response (401):
```json
{
  "error": "Invalid token",
  "code": "TOKEN_INVALID"
}
```

**Seat Already Booked:**
```bash
# Try to book the same seat twice
curl -X PUT http://localhost:8080/5/Jane%20Smith \
  -H "Authorization: Bearer $TOKEN"
```
Response (400):
```json
{
  "error": "Seat already booked"
}
```

---

## 5. Get My Bookings (Protected)

**Endpoint:** `GET /my-bookings`

**Description:** View all bookings for the authenticated user

**Headers:**
```
Authorization: Bearer <YOUR_JWT_TOKEN>
```

**cURL Command:**
```bash
curl http://localhost:8080/my-bookings \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response (200 OK):**
```json
{
  "bookings": [
    {
      "id": 5,
      "name": "John Doe",
      "booked_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 12,
      "name": "John Doe",
      "booked_at": "2024-01-15T11:45:00.000Z"
    }
  ]
}
```

**Empty Bookings Response:**
```json
{
  "bookings": []
}
```

**Error Cases:**

**Missing Token:**
```bash
curl http://localhost:8080/my-bookings
```
Response (401):
```json
{
  "error": "Access token required",
  "code": "TOKEN_MISSING"
}
```

**Invalid Token:**
```bash
curl http://localhost:8080/my-bookings \
  -H "Authorization: Bearer invalid_token"
```
Response (401):
```json
{
  "error": "Invalid token",
  "code": "TOKEN_INVALID"
}
```

---

## Complete Testing Flow

Here's a complete flow to test all endpoints in sequence:

### Step 1: Register a User
```bash
curl -X POST http://localhost:8080/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpass123"
  }'
```

### Step 2: Login and Save Token
```bash
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpass123"
  }'
```

**Copy the token from the response!**

### Step 3: View All Seats
```bash
curl http://localhost:8080/seats
```

### Step 4: Book a Seat
```bash
# Replace TOKEN with your actual token
TOKEN="your_token_here"

curl -X PUT http://localhost:8080/3/Test%20User \
  -H "Authorization: Bearer $TOKEN"
```

### Step 5: View Your Bookings
```bash
curl http://localhost:8080/my-bookings \
  -H "Authorization: Bearer $TOKEN"
```

### Step 6: View All Seats Again (to see your booking)
```bash
curl http://localhost:8080/seats
```

---

## Testing with Postman

### Import Collection

Create a new Postman collection with these requests:

**1. Register**
- Method: POST
- URL: `http://localhost:8080/register`
- Body (raw JSON):
```json
{
  "email": "{{email}}",
  "password": "{{password}}"
}
```

**2. Login**
- Method: POST
- URL: `http://localhost:8080/login`
- Body (raw JSON):
```json
{
  "email": "{{email}}",
  "password": "{{password}}"
}
```
- Tests (to save token):
```javascript
pm.environment.set("token", pm.response.json().token);
```

**3. Get Seats**
- Method: GET
- URL: `http://localhost:8080/seats`

**4. Book Seat**
- Method: PUT
- URL: `http://localhost:8080/5/John Doe`
- Headers:
  - Key: `Authorization`
  - Value: `Bearer {{token}}`

**5. My Bookings**
- Method: GET
- URL: `http://localhost:8080/my-bookings`
- Headers:
  - Key: `Authorization`
  - Value: `Bearer {{token}}`

### Environment Variables
- `email`: testuser@example.com
- `password`: testpass123
- `token`: (auto-set by login test)

---

## Testing with VS Code REST Client

Create a file `api-tests.http`:

```http
### Variables
@baseUrl = http://localhost:8080
@email = testuser@example.com
@password = testpass123

### 1. Register User
POST {{baseUrl}}/register
Content-Type: application/json

{
  "email": "{{email}}",
  "password": "{{password}}"
}

### 2. Login
# @name login
POST {{baseUrl}}/login
Content-Type: application/json

{
  "email": "{{email}}",
  "password": "{{password}}"
}

### 3. Get All Seats (Public)
GET {{baseUrl}}/seats

### 4. Book a Seat (Protected)
@token = {{login.response.body.token}}
PUT {{baseUrl}}/5/John Doe
Authorization: Bearer {{token}}

### 5. Get My Bookings (Protected)
GET {{baseUrl}}/my-bookings
Authorization: Bearer {{token}}
```

---

## Quick Test Script (Bash)

Save this as `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:8080"
EMAIL="testuser@example.com"
PASSWORD="testpass123"

echo "=== 1. Register User ==="
curl -X POST $BASE_URL/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
echo -e "\n"

echo "=== 2. Login ==="
RESPONSE=$(curl -s -X POST $BASE_URL/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo $RESPONSE
TOKEN=$(echo $RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"
echo -e "\n"

echo "=== 3. Get All Seats ==="
curl -s $BASE_URL/seats | jq
echo -e "\n"

echo "=== 4. Book Seat 7 ==="
curl -s -X PUT $BASE_URL/7/Test%20User \
  -H "Authorization: Bearer $TOKEN" | jq
echo -e "\n"

echo "=== 5. Get My Bookings ==="
curl -s $BASE_URL/my-bookings \
  -H "Authorization: Bearer $TOKEN" | jq
echo -e "\n"

echo "=== 6. Get All Seats (Updated) ==="
curl -s $BASE_URL/seats | jq
```

Run with:
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Common Issues

### 1. Token Expired
**Error:** `TOKEN_EXPIRED`
**Solution:** Login again to get a new token

### 2. Database Not Running
**Error:** Connection refused
**Solution:** Start database with `docker-compose up -d`

### 3. Port Already in Use
**Error:** EADDRINUSE
**Solution:** Change PORT in .env or stop other process on port 8080

### 4. Invalid Token Format
**Error:** `TOKEN_INVALID`
**Solution:** Ensure Authorization header format is `Bearer <token>` (with space)

---

## Status Codes Reference

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful request |
| 201 | Created | User registered successfully |
| 400 | Bad Request | Invalid input or seat already booked |
| 401 | Unauthorized | Missing, invalid, or expired token |
| 409 | Conflict | Email already exists |
| 500 | Server Error | Internal server error |

---

## Notes

- Tokens expire after 24 hours (configurable in .env)
- All timestamps are in UTC
- Seat IDs range from 1-20
- Email must be unique
- Password must be at least 8 characters
- Names in URLs should be URL-encoded (spaces as %20)
