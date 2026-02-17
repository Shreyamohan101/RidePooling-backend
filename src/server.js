const app = require('./app');
const config = require('./config');
const database = require('./database/connection');
const logger = require('./utils/logger');

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});


const startServer = async () => {
  try {
    await database.connect();

    const server = app.listen(config.server.port, () => {
      logger.info(`
Smart Airport Ride Pooling Backend Server              
Environment: ${config.server.env.padEnd(43)}
Port: ${config.server.port.toString().padEnd(50)}
API Version: ${config.server.apiVersion.padEnd(43)}
      `);
    });

    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await database.disconnect();
          logger.info('Database connection closed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();