require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    apiVersion: process.env.API_VERSION || 'v1',
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT_MS) || 30000
  },


  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ride-pooling',
    options: {
      maxPoolSize: 10,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: 0
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  pricing: {
    basePrice: parseFloat(process.env.BASE_PRICE) || 10,
    pricePerKm: parseFloat(process.env.PRICE_PER_KM) || 2,
    surgeMultiplier: parseFloat(process.env.SURGE_MULTIPLIER) || 1.5,
    sharedRideDiscount: parseFloat(process.env.SHARED_RIDE_DISCOUNT) || 0.3
  },

  ride: {
    maxPassengersPerCab: parseInt(process.env.MAX_PASSENGERS_PER_CAB) || 4,
    maxLuggagePerPassenger: parseInt(process.env.MAX_LUGGAGE_PER_PASSENGER) || 2,
    maxDetourToleranceKm: parseFloat(process.env.MAX_DETOUR_TOLERANCE_KM) || 5,
    matchingRadiusKm: parseFloat(process.env.MATCHING_RADIUS_KM) || 10
  },

  performance: {
    workerThreads: parseInt(process.env.WORKER_THREADS) || 4
  }
};