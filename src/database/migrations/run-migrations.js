const database = require('../connection');
const logger = require('../../utils/logger');
const User = require('../../models/User');
const RideRequest = require('../../models/RideRequest');
const PoolGroup = require('../../models/PoolGroup');

const runMigrations = async () => {
  try {
    await database.connect();
    
    logger.info('Starting database migrations...');

  
    logger.info('Creating indexes for User collection...');
    await User.createIndexes();
    
    logger.info('Creating indexes for RideRequest collection...');
    await RideRequest.createIndexes();
    
    logger.info('Creating indexes for PoolGroup collection...');
    await PoolGroup.createIndexes();

    logger.info('All migrations completed successfully');
    
    await database.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    await database.disconnect();
    process.exit(1);
  }
};

runMigrations();