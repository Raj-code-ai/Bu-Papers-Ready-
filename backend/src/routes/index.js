const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const publicRoutes = require('./public.routes');
const adminRoutes = require('./admin.routes');
const superAdminRoutes = require('./superAdmin.routes');
const analyticsRoutes = require('./analytics.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/public', publicRoutes);
router.use('/admin', adminRoutes);
router.use('/superadmin', superAdminRoutes);
router.use('/superadmin/reports', analyticsRoutes);

module.exports = router;
