const createApp = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');
const { connectDatabase, disconnectDatabase, getDatabaseStatus } = require('./config/db');
const authService = require('./services/auth.service');
const { seedDatabaseDefaults } = require('./services/seed.service');
const { startScheduledJobs } = require('./jobs/scheduler');

async function startServer() {
  const app = createApp();

  if (!env.mongodbUri) {
    logger.error('MONGODB_URI is required. Refusing to start without a database.');
    process.exit(1);
  }

  try {
    await connectDatabase();
    const db = getDatabaseStatus();
    if (db.status !== 'connected') {
      throw new Error('MongoDB did not reach connected state');
    }

    const bootstrap = await authService.ensureBootstrapSuperAdmin();
    if (bootstrap.created) {
      logger.warn('Bootstrap Super Admin ready', { email: bootstrap.user.email });
    }
    await seedDatabaseDefaults();
    startScheduledJobs();
  } catch (error) {
    logger.error('Failed to connect to MongoDB during bootstrap', {
      error: error.message,
      hint:
        'Open MongoDB Atlas → Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0). Render uses changing IPs, so a single office IP is not enough.',
    });
    process.exit(1);
  }

  const server = app.listen(env.port, () => {
    logger.info(`${env.appName} backend listening`, {
      port: env.port,
      env: env.nodeEnv,
      apiPrefix: env.apiPrefix,
      frontend: env.frontendUrl,
      swagger: env.swaggerEnabled ? env.swaggerPath : 'disabled',
      database: 'connected',
    });
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${env.port} is already in use. Stop the other process or change PORT.`, {
        port: env.port,
      });
    } else {
      logger.error('HTTP server error', { error: error.message });
    }
    process.exit(1);
  });

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await disconnectDatabase();
        logger.info('Shutdown complete');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error: error.message });
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
    shutdown('uncaughtException');
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
