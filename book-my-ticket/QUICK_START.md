# Quick Start Guide

## Setup Complete! ✅

All issues have been fixed:
- ✅ Added `"type": "module"` to package.json
- ✅ PostgreSQL container is running on port 5433
- ✅ Database initialized with users and seats tables

## Start the Server

Run this command in your terminal:

```bash
npm run dev
```

You should see:
```
Server starting on port: 8080
```

## Test the API

### Quick Test with cURL

1. **Register a user:**
```bash
curl -X POST http://localhost:8080/register -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

2. **Login:**
```bash
curl -X POST http://localhost:8080/login -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

3. **Copy the token from the response and use it to book a seat:**
```bash
curl -X PUT http://localhost:8080/5/John%20Doe -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Full Testing Guide

See **API_TESTING.md** for complete testing documentation with all endpoints, payloads, and examples.

## Useful Commands

### Database Management
```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# View database logs
docker logs sql_class_2_db

# Reset database (removes all data)
docker-compose down -v
docker-compose up -d
```

### Application
```bash
# Start server
npm run dev

# or
npm start
```

## Troubleshooting

### Database not connecting?
```bash
# Check if container is running
docker ps

# Should show sql_class_2_db with status "Up" and "healthy"
```

### Port 8080 already in use?
Change the PORT in `.env` file:
```env
PORT=3000
```

### Need to reset everything?
```bash
# Stop and remove database
docker-compose down -v

# Start fresh
docker-compose up -d

# Wait 5 seconds for initialization
# Then start the server
npm run dev
```

## Next Steps

1. Start the server: `npm run dev`
2. Test endpoints using API_TESTING.md
3. Build your frontend or integrate with existing apps
4. Deploy to production (remember to change JWT_SECRET!)

## Project Structure

```
.
├── config/
│   └── env.js                  # Environment configuration
├── middleware/
│   └── authenticateToken.js    # JWT authentication middleware
├── services/
│   └── authService.js          # Authentication service
├── index.mjs                   # Main application
├── init.sql                    # Database schema
├── docker-compose.yml          # PostgreSQL setup
├── .env                        # Environment variables
├── API_TESTING.md              # Complete API testing guide
└── README.md                   # Full documentation
```

Happy coding! 🚀
