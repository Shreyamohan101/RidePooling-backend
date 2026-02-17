const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      mongoose.set('strictQuery', false);
      
      this.connection = await mongoose.connect(config.database.uri, config.database.options);
      
      logger.info('MongoDB connected successfully');
      logger.info(`Database: ${this.connection.connection.name}`);
      
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    try {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  async dropDatabase() {
    try {
      await mongoose.connection.dropDatabase();
      logger.info('Database dropped successfully');
    } catch (error) {
      logger.error('Error dropping database:', error);
      throw error;
    }
  }
}

module.exports = new Database();