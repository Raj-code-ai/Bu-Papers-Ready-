const os = require('os');
const process = require('process');
const env = require('../config/env');
const { getDatabaseStatus } = require('../config/db');

function bytesToMb(bytes) {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

function getLiveness() {
  const memory = process.memoryUsage();

  return {
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    app: {
      name: env.appName,
      version: env.appVersion,
      environment: env.nodeEnv,
      apiPrefix: env.apiPrefix,
      ports: {
        backend: env.port,
        frontend: 3011,
      },
    },
    runtime: {
      node: process.version,
      pid: process.pid,
      platform: process.platform,
      arch: process.arch,
      memory: {
        rssMb: bytesToMb(memory.rss),
        heapUsedMb: bytesToMb(memory.heapUsed),
        heapTotalMb: bytesToMb(memory.heapTotal),
      },
      loadAverage: os.loadavg(),
    },
    database: getDatabaseStatus(),
    maintenanceMode: env.maintenanceMode,
  };
}

function getReadiness() {
  const database = getDatabaseStatus();
  const dbReady = !database.configured || database.status === 'connected';

  return {
    status: dbReady ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: {
        ...database,
        ok: dbReady,
      },
      configuration: {
        ok: true,
        storageProvider: env.storageProvider,
        swaggerEnabled: env.swaggerEnabled,
      },
    },
  };
}

module.exports = {
  getLiveness,
  getReadiness,
};
