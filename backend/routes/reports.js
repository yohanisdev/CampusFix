const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Apply JWT authentication middleware to all routes
router.use(authenticateToken);

router.post('/', reportController.createReport);
router.get('/', reportController.getMyReports);
router.get('/:id', reportController.getReportById);
router.put('/:id', reportController.updateReport);
router.delete('/:id', reportController.deleteReport);

module.exports = router;