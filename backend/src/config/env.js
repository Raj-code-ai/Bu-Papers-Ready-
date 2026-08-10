const path = require('path');
const dotenv = require('dotenv');

const rootEnv = path.resolve(__dirname, '../../../.env');
const localEnv = path.resolve(__dirname, '../../.env');

dotenv.config({ path: rootEnv });
dotenv.config({ path: localEnv, override: true });

function requiredInProduction(key, value) {
  if (process.env.NODE_ENV === 'production' && !value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function toInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toFloat(value, fallback) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function csv(value, fallback = []) {
  if (!value || String(value).trim() === '') return fallback;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  isDevelopment: (process.env.NODE_ENV || 'development') !== 'production',
  appName: process.env.APP_NAME || 'Academic Resource Management System',
  appVersion: process.env.APP_VERSION || '1.0.0',

  port: toInt(process.env.PORT, 3008),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3008',
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3011',
  corsOrigins: csv(process.env.CORS_ORIGINS, ['http://localhost:3011']),

  mongodbUri: process.env.MONGODB_URI || '',
  mongodbDbName: process.env.MONGODB_DB_NAME || 'arms',

  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me-32chars',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me-32chars',
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  bcryptSaltRounds: toInt(process.env.BCRYPT_SALT_ROUNDS, 12),
  sessionTimeoutMinutes: toInt(process.env.SESSION_TIMEOUT_MINUTES, 60),
  accountLockMaxAttempts: toInt(process.env.ACCOUNT_LOCK_MAX_ATTEMPTS, 5),
  accountLockDurationMinutes: toInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES, 30),
  passwordResetTokenExpiresMinutes: toInt(process.env.PASSWORD_RESET_TOKEN_EXPIRES_MINUTES, 30),
  superAdmin2faEnabled: toBool(process.env.SUPER_ADMIN_2FA_ENABLED, true),
  csrfSecret: process.env.CSRF_SECRET || 'dev-csrf-secret-change-me-32-characters',
  cookieSecure: toBool(process.env.COOKIE_SECURE, false),

  rateLimitWindowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 900000),
  rateLimitMaxRequests: toInt(process.env.RATE_LIMIT_MAX_REQUESTS, 200),
  authRateLimitMax: toInt(process.env.AUTH_RATE_LIMIT_MAX, 20),
  uploadRateLimitMax: toInt(process.env.UPLOAD_RATE_LIMIT_MAX, 30),

  storageProvider: process.env.STORAGE_PROVIDER || 'cloudinary',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'arms',
  },

  maxFileSizeMb: toInt(process.env.MAX_FILE_SIZE_MB, 25),
  adminStorageQuotaMb: toInt(process.env.ADMIN_STORAGE_QUOTA_MB, 2048),
  recycleBinRetentionDays: toInt(process.env.RECYCLE_BIN_RETENTION_DAYS, 30),
  duplicateDetectionEnabled: toBool(process.env.DUPLICATE_DETECTION_ENABLED, true),
  autoCleanupEnabled: toBool(process.env.AUTO_CLEANUP_ENABLED, true),
  monthlyStorageBudgetUsd: toFloat(process.env.MONTHLY_STORAGE_BUDGET_USD, 50),
  storageWarningPercent: toInt(process.env.STORAGE_WARNING_PERCENT, 80),
  storageCriticalPercent: toInt(process.env.STORAGE_CRITICAL_PERCENT, 95),

  emailEnabled: toBool(process.env.EMAIL_ENABLED, false),
  emailProvider: process.env.EMAIL_PROVIDER || 'smtp',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: toInt(process.env.SMTP_PORT, 587),
    secure: toBool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  emailFrom: process.env.EMAIL_FROM || 'ARMS <noreply@example.com>',

  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: process.env.LOG_DIR || 'logs',
  morganFormat: process.env.MORGAN_FORMAT || 'combined',

  backupEnabled: toBool(process.env.BACKUP_ENABLED, true),
  backupCronDaily: process.env.BACKUP_CRON_DAILY || '0 2 * * *',
  backupCronWeekly: process.env.BACKUP_CRON_WEEKLY || '0 3 * * 0',
  backupCronMonthly: process.env.BACKUP_CRON_MONTHLY || '0 4 1 * *',
  backupDir: process.env.BACKUP_DIR || 'backups',
  backupRetentionDays: toInt(process.env.BACKUP_RETENTION_DAYS, 90),

  featureDefaults: {
    notes: toBool(process.env.FEATURE_NOTES, true),
    assignments: toBool(process.env.FEATURE_ASSIGNMENTS, true),
    projects: toBool(process.env.FEATURE_PROJECTS, true),
    labManuals: toBool(process.env.FEATURE_LAB_MANUALS, true),
    modelPapers: toBool(process.env.FEATURE_MODEL_PAPERS, true),
    results: toBool(process.env.FEATURE_RESULTS, false),
    announcements: toBool(process.env.FEATURE_ANNOUNCEMENTS, true),
  },

  maintenanceMode: toBool(process.env.MAINTENANCE_MODE, false),
  maintenanceMessage:
    process.env.MAINTENANCE_MESSAGE ||
    'System is under maintenance. Please try again later.',

  swaggerEnabled: toBool(process.env.SWAGGER_ENABLED, true),
  swaggerPath: process.env.SWAGGER_PATH || '/api/docs',

  virusScanEnabled: toBool(process.env.VIRUS_SCAN_ENABLED, false),
  virusScanEndpoint: process.env.VIRUS_SCAN_ENDPOINT || '',
};

if (env.isProduction) {
  requiredInProduction('MONGODB_URI', env.mongodbUri);
  requiredInProduction('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET);
  requiredInProduction('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET);
  requiredInProduction('CSRF_SECRET', process.env.CSRF_SECRET);

  const insecureDefaults = [
    'dev-access-secret-change-me-32chars',
    'dev-refresh-secret-change-me-32chars',
    'dev-csrf-secret-change-me-32-characters',
    'change-me-access-secret-min-32-chars-long!!',
    'change-me-refresh-secret-min-32-chars-long!',
    'change-me-csrf-secret-min-32-characters!!',
  ];
  if (
    insecureDefaults.includes(env.jwtAccessSecret) ||
    insecureDefaults.includes(env.jwtRefreshSecret) ||
    (env.csrfSecret && insecureDefaults.includes(env.csrfSecret))
  ) {
    throw new Error('Production rejected insecure default secrets. Set unique JWT/CSRF secrets.');
  }
  if (env.swaggerEnabled && !process.env.SWAGGER_DOCS_KEY) {
    // Keep enabled only with a docs key in production.
    // eslint-disable-next-line no-console
    console.warn('SWAGGER_ENABLED in production without SWAGGER_DOCS_KEY — docs will require a key header.');
  }
}

module.exports = env;
