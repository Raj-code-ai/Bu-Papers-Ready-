const healthService = require('../services/health.service');
const { success } = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { HTTP_STATUS } = require('../constants/httpStatus');

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Liveness probe
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccess'
 */
const getHealth = asyncHandler(async (req, res) => {
  const data = healthService.getLiveness();
  return success(res, data, 'Service is healthy');
});

/**
 * @openapi
 * /health/ready:
 *   get:
 *     tags: [Health]
 *     summary: Readiness probe
 *     responses:
 *       200:
 *         description: Service is ready
 *       503:
 *         description: Service is not ready
 */
const getReady = asyncHandler(async (req, res) => {
  const data = healthService.getReadiness();
  const statusCode =
    data.status === 'ready' ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
  return success(
    res,
    data,
    data.status === 'ready' ? 'Service is ready' : 'Service is not ready',
    statusCode
  );
});

module.exports = {
  getHealth,
  getReady,
};
