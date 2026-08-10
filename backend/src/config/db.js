const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

let isConnected = false;

async function connectDatabase() {
  if (!env.mongodbUri) {
    logger.warn('MONGODB_URI is not set. Database connection skipped.');
    return null;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);
  mongoose.set('bufferTimeoutMS', 5000);

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info('MongoDB connected', { db: env.mongodbDbName });
  });

  mongoose.connection.on('error', (err) => {
    isConnected = false;
    logger.error('MongoDB connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDbName,
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 10000,
  });

  isConnected = mongoose.connection.readyState === 1;
  return mongoose.connection;
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  isConnected = false;
}

function getDatabaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return {
    readyState: mongoose.connection.readyState,
    status: states[mongoose.connection.readyState] || 'unknown',
    name: mongoose.connection.name || env.mongodbDbName,
    configured: Boolean(env.mongodbUri),
  };
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getDatabaseStatus,
};
