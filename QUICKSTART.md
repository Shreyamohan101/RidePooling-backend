# 🚀 Quick Start Guide

This guide will help you get the Smart Airport Ride Pooling Backend running in 5 minutes.

## Prerequisites Check

```bash
# Check Node.js (need v18+)
node --version

# Check MongoDB (need v5+)
mongod --version

# If missing, install from:
# Node.js: https://nodejs.org/
# MongoDB: https://www.mongodb.com/try/download/community
```

## Step-by-Step Setup

### 1. Install Dependencies (1 minute)

```bash
cd ride-pooling-backend
npm install
```

Wait for all packages to install...

### 2. Configure Environment (30 seconds)

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env if needed (optional for local testing)
# The defaults work fine for development
```

### 3. Start MongoDB (30 seconds)

```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
net start MongoDB

# Verify it's running
mongosh
# Type 'exit' to quit
```

### 4. Setup Database (30 seconds)

```bash
# Create indexes
npm run migrate

# Add sample data (optional)
npm run seed
```

### 5. Start Server (10 seconds)

```bash
npm run dev
```

You should see:
```

Smart Airport Ride Pooling Backend Server               
Environment: development                                 
Port: 3000                                               
API Version: v1                                          
```

### 6. Test It Works (1 minute)

#### Option A: Using Browser
Open: http://localhost:3000

#### Option B: Using curl
```bash
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-02-16T..."
}
```

## 🧪 Quick API Test with Postman

### Import Collection

1. Open Postman
2. Click "Import"
3. Select `postman_collection.json` from the project folder
4. Click "Import"

### Create Environment

1. Click "Environments" (left sidebar)
2. Click "+" to create new environment
3. Name it "Local Development"
4. Add variables:
   - `baseUrl`: `http://localhost:3000/api/v1`
   - `token`: (leave empty)
5. Click "Save"
6. Select "Local Development" from dropdown

### Test the API

#### 1. Register a User

- Open "Authentication" folder
- Click "Register User"
- Click "Send"
- ✅ Should return 201 with user data and token

The token is automatically saved to your environment!

#### 2. Create a Ride Request

- Open "Ride Requests" folder
- Click "Create Ride Request"
- Click "Send"
- ✅ Should return 201 with ride details

#### 3. List Your Rides

- Click "List Ride Requests"
- Click "Send"
- ✅ Should show your ride

## 🎯 Sample Test Flow

Try this complete flow to see the pooling feature:

### User 1: Create First Ride

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alice",
    "email": "alice@example.com",
    "phone": "1111111111",
    "password": "password123"
  }'

# Save the token from response
TOKEN1="<token-from-response>"

curl -X POST http://localhost:3000/api/v1/rides \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {
      "coordinates": [77.1025, 28.7041],
      "address": "Airport Terminal 3"
    },
    "dropoff": {
      "coordinates": [77.2090, 28.6139],
      "address": "Connaught Place"
    },
    "passengers": 2,
    "luggage": 1,
    "preferences": {
      "allowSharing": true
    }
  }'
```

### User 2: Create Similar Ride (Will Auto-Match!)

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bob",
    "email": "bob@example.com",
    "phone": "2222222222",
    "password": "password123"
  }'

# Save the token
TOKEN2="<token-from-response>"

curl -X POST http://localhost:3000/api/v1/rides \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{
    "pickup": {
      "coordinates": [77.1020, 28.7045],
      "address": "Airport Terminal 1"
    },
    "dropoff": {
      "coordinates": [77.2095, 28.6135],
      "address": "Near Connaught Place"
    },
    "passengers": 1,
    "luggage": 1,
    "preferences": {
      "allowSharing": true
    }
  }'
```

The second ride will automatically match with the first ride!

Check the response - you'll see:
- `status: "matched"`
- `poolGroup: { ... }` with both rides
- Optimized route with waypoints
- Discounted pricing

## 📖 Next Steps

1. ✅ Read the full README.md for detailed documentation
2. ✅ Test all API endpoints using Postman
3. ✅ Explore the code structure
4. ✅ Try canceling rides and see pool updates
5. ✅ Check the logs in `logs/` folder

## 🐛 Troubleshooting

### "Cannot connect to MongoDB"
```bash
# Make sure MongoDB is running
sudo systemctl status mongod

# Start it if not running
sudo systemctl start mongod
```

### "Port 3000 already in use"
```bash
# Find what's using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or change port in .env
echo "PORT=3001" >> .env
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 💡 Tips

- Use `npm run dev` for development (auto-reload on changes)
- Use `npm start` for production
- Check `logs/combined.log` for all logs
- Check `logs/error.log` for errors only
- Use MongoDB Compass to view database visually

## 🎉 You're All Set!

The backend is now running and ready to handle ride requests!

For detailed API documentation, see README.md
For code structure details, see README.md "Project Structure" section
For deployment guide, see README.md "Deployment Considerations" section