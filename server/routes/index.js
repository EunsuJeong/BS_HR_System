const express = require('express');
const router = express.Router();

router.use('/ai', require('./aiRoutes'));
router.use('/hr', require('./hrRoutes'));
router.use('/admin', require('./adminRoutes'));
router.use('/communication', require('./communicationRoutes'));
router.use('/safety', require('./safetyRoutes'));
router.use('/system', require('./systemRoutes'));
router.use('/attendance', require('./attendance'));
router.use('/payroll', require('./payroll'));
router.use('/holiday', require('./holiday'));
router.use('/push', require('./push')); // ✅ PWA 푸시 알림 라우트 추가
module.exports = router;
