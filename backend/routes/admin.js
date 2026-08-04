const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// All admin routes require a valid JWT AND Administrator privileges
router.use(authenticateToken);
router.use(requireAdmin);

router.get('/reports', adminController.getAllReports);
router.put('/reports/:id/status', adminController.updateReportStatus);
router.put('/reports/:id/notes', adminController.addAdminNote);
router.get('/stats', adminController.getDashboardStats);

module.exports = router;