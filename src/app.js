const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (config.server.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

app.use('/api', rateLimiter({
  windowMs: config.rateLimit.windowMs,
  maxRequests: config.rateLimit.maxRequests
}));

app.use(`/api/${config.server.apiVersion}`, routes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Smart Airport Ride Pooling API',
    version: config.server.apiVersion,
    documentation: '/api-docs'
  });
});

app.use(notFound);

app.use(errorHandler);

module.exports = app;