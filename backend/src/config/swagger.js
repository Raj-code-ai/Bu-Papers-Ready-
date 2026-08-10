const swaggerJsdoc = require('swagger-jsdoc');
const env = require('./env');

const swaggerDefinition = {
  openapi: '3.0.3',
  info: {
    title: env.appName,
    version: env.appVersion,
    description:
      'Production REST API for the Academic Resource Management System. Students browse publicly; Admins and Super Admins authenticate with JWT.',
    contact: {
      name: 'ARMS API Support',
    },
  },
  servers: [
    {
      url: `${env.apiBaseUrl}${env.apiPrefix}`,
      description: 'Local development API',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ApiSuccess: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
          meta: { type: 'object' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          code: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                msg: { type: 'string' },
              },
            },
          },
        },
      },
      HealthStatus: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          uptime: { type: 'number' },
          timestamp: { type: 'string', format: 'date-time' },
          app: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              version: { type: 'string' },
              environment: { type: 'string' },
            },
          },
          database: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              configured: { type: 'boolean' },
            },
          },
        },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'Liveness and readiness probes' },
    { name: 'Auth', description: 'Authentication and session management' },
    { name: 'Public', description: 'Student-facing public endpoints' },
    { name: 'Admin', description: 'Admin paper and storage management' },
    { name: 'SuperAdmin', description: 'Full system administration' },
  ],
};

const swaggerOptions = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/**/*.js',
    './src/docs/**/*.js',
    './src/controllers/**/*.js',
  ],
};

function buildSwaggerSpec() {
  return swaggerJsdoc(swaggerOptions);
}

module.exports = { buildSwaggerSpec, swaggerDefinition };
