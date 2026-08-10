const fs = require('fs');
const path = require('path');
const winston = require('winston');
const env = require('./env');

const logDir = path.isAbsolute(env.logDir)
  ? env.logDir
  : path.resolve(__dirname, '../../', env.logDir);

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const { combine, timestamp, errors, printf, colorize, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaKeys = Object.keys(meta).filter((key) => key !== 'service');
  const metaString = metaKeys.length ? ` ${JSON.stringify(meta)}` : '';
  return `${ts} [${level}] ${stack || message}${metaString}`;
});

const logger = winston.createLogger({
  level: env.logLevel,
  defaultMeta: { service: 'arms-backend' },
  format: combine(timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
});

if (!env.isProduction) {
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), errors({ stack: true }), consoleFormat),
    })
  );
} else {
  logger.add(
    new winston.transports.Console({
      format: combine(timestamp(), errors({ stack: true }), json()),
    })
  );
}

logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;
