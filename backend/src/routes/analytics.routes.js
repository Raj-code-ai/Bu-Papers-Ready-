const express = require('express');
const analyticsService = require('../analytics/analytics.service');
const monitoringService = require('../monitoring/monitoring.service');
const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const { authenticate, authorize, requireTwoFactorCompleted } = require('../middlewares/auth.middleware');
const { ROLES } = require('../constants/roles');

const router = express.Router();

router.use(authenticate, authorize(ROLES.SUPER_ADMIN), requireTwoFactorCompleted);

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    return success(res, await analyticsService.overview(), 'Analytics overview');
  })
);

router.get(
  '/by-subject',
  asyncHandler(async (req, res) => {
    return success(res, await analyticsService.downloadsBySubject(req.query.limit), 'Downloads by subject');
  })
);

router.get(
  '/by-department',
  asyncHandler(async (req, res) => {
    return success(
      res,
      await analyticsService.downloadsByDepartment(req.query.limit),
      'Downloads by department'
    );
  })
);

router.get(
  '/by-academic-level',
  asyncHandler(async (req, res) => {
    return success(
      res,
      await analyticsService.downloadsByAcademicLevel(req.query.limit),
      'Downloads by academic level'
    );
  })
);

router.get(
  '/monthly',
  asyncHandler(async (req, res) => {
    return success(res, await analyticsService.monthlyReport(req.query.year), 'Monthly report');
  })
);

router.get(
  '/yearly',
  asyncHandler(async (req, res) => {
    return success(res, await analyticsService.yearlyReport(req.query.yearsBack), 'Yearly report');
  })
);

router.get(
  '/storage',
  asyncHandler(async (req, res) => {
    return success(res, await analyticsService.storageReport(), 'Storage report');
  })
);

router.get(
  '/admins',
  asyncHandler(async (req, res) => {
    const data = await analyticsService.adminReport(req.query);
    return success(res, data.items, 'Admin report', 200, data.meta);
  })
);

router.get(
  '/monitoring',
  asyncHandler(async (req, res) => {
    return success(res, await monitoringService.getMonitoringSnapshot(), 'Monitoring snapshot');
  })
);

router.post(
  '/monitoring/run-checks',
  asyncHandler(async (req, res) => {
    return success(res, await monitoringService.runHealthChecksAndAlerts(), 'Health checks executed');
  })
);

router.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    return success(res, await monitoringService.listAlerts(req.query), 'Alerts fetched');
  })
);

router.post(
  '/alerts/:id/read',
  asyncHandler(async (req, res) => {
    return success(res, await monitoringService.markAlertRead(req.params.id), 'Alert marked read');
  })
);

module.exports = router;
