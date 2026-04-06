const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/admin', authenticateToken, authorizeRoles('Admin'), dashboardController.getAdminStats);
router.get('/sespri', authenticateToken, authorizeRoles('Sespri'), dashboardController.getSespriStats);
router.get('/kasubag-media', authenticateToken, authorizeRoles('Kasubag Media'), dashboardController.getKasubagMediaStats);
router.get('/kasubag-protokol', authenticateToken, authorizeRoles('Kasubag Protokol'), dashboardController.getKasubagProtokolStats);
router.get('/staf-media', authenticateToken, authorizeRoles('Staff Media', 'Staf Media'), dashboardController.getStafMediaStats);
router.get('/staf-protokol', authenticateToken, authorizeRoles('Staff Protokol', 'Staf Protokol'), dashboardController.getStafProtokolStats);

module.exports = router;
