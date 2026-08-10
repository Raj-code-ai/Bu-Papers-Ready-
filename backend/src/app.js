const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const logger = require('./config/logger');
const { createCorsMiddleware } = require('./config/cors');
const { createGlobalRateLimiter } = require('./config/rateLimit');
const { buildSwaggerSpec } = require('./config/swagger');

const requestIdMiddleware = require('./middlewares/requestId.middleware');
const maintenanceMiddleware = require('./middlewares/maintenance.middleware');
const notFoundMiddleware = require('./middlewares/notFound.middleware');
const errorMiddleware = require('./middlewares/error.middleware');
const xssSanitizeMiddleware = require('./middlewares/xss.middleware');
const { issueCsrfToken, csrfProtection } = require('./middlewares/csrf.middleware');
const apiRoutes = require('./routes');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestIdMiddleware);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: env.isProduction
        ? undefined
        : false,
    })
  );
  app.use(createCorsMiddleware());
  app.use(compression());
  app.use(express.json({ limit: `${env.maxFileSizeMb}mb` }));
  app.use(express.urlencoded({ extended: true, limit: `${env.maxFileSizeMb}mb` }));
  app.use(cookieParser());
  app.use(issueCsrfToken);
  app.use(csrfProtection);
  app.use(xssSanitizeMiddleware);
  app.use(
    mongoSanitize({
      replaceWith: '_',
      onSanitize: ({ req, key }) => {
        logger.warn('Sanitized MongoDB operator in request', {
          requestId: req.requestId,
          key,
        });
      },
    })
  );

  const morganFormat = env.isProduction ? env.morganFormat : 'dev';
  app.use(
    morgan(morganFormat, {
      stream: logger.stream,
      skip: (req) => req.path.includes('/health'),
    })
  );

  app.use(createGlobalRateLimiter());
  app.use(maintenanceMiddleware);

  // Public developer / branding image uploads
  app.use(
    '/uploads',
    express.static(path.resolve(__dirname, '../uploads'), {
      maxAge: env.isProduction ? '7d' : 0,
      fallthrough: true,
    })
  );

  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: `${env.appName} API`,
      data: {
        version: env.appVersion,
        environment: env.nodeEnv,
        apiPrefix: env.apiPrefix,
        docs: env.swaggerEnabled ? env.swaggerPath : null,
        frontend: env.frontendUrl,
      },
    });
  });

  // Production: Swagger off unless explicitly enabled (never expose by default).
  const swaggerOn = env.swaggerEnabled && (!env.isProduction || process.env.SWAGGER_ENABLED === 'true');
  if (swaggerOn) {
    const swaggerSpec = buildSwaggerSpec();
    const swaggerGate = (req, res, next) => {
      if (!env.isProduction) return next();
      const key = req.headers['x-docs-key'] || req.query.docsKey;
      if (process.env.SWAGGER_DOCS_KEY && key === process.env.SWAGGER_DOCS_KEY) {
        return next();
      }
      return res.status(401).json({
        success: false,
        message: 'API documentation is not publicly available.',
      });
    };
    app.use(env.swaggerPath, swaggerGate, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: `${env.appName} API Docs`,
    }));
    app.get(`${env.swaggerPath}.json`, swaggerGate, (req, res) => {
      res.json(swaggerSpec);
    });
  }

  app.use(env.apiPrefix, apiRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

module.exports = createApp;
