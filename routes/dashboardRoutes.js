const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/admin', authenticateToken, authorizeRoles('Admin'), dashboardController.getAdminStats);
router.get('/sespri', authenticateToken, authorizeRoles('Sespri'), dashboardController.getSespriStats);

module.exports = router;
