const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

let isConnected = false;
let listenersAttached = false;

function attachConnectionListeners() {
  if (listenersAttached) return;
  listenersAttached = true;

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

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    logger.info('MongoDB reconnected', { db: env.mongodbDbName });
  });
}

async function connectDatabaseOnce() {
  if (!env.mongodbUri) {
    logger.warn('MONGODB_URI is not set. Database connection skipped.');
    return null;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);
  mongoose.set('bufferTimeoutMS', 5000);
  attachConnectionListeners();

  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDbName,
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 15000,
  });

  isConnected = mongoose.connection.readyState === 1;
  return mongoose.connection;
}

/**
 * Connect with retries — helps when Atlas briefly rejects or Render IP rotates.
 */
async function connectDatabase({ retries = 5, delayMs = 3000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await connectDatabaseOnce();
    } catch (error) {
      lastError = error;
      logger.error('MongoDB connect attempt failed', {
        attempt,
        retries,
        error: error.message,
      });
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
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
