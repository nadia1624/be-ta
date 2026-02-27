const express = require('express');
const router = express.Router();
const PenugasanController = require('../controllers/PenugasanController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Get all staff protocol
router.get('/staff-protokol', authenticateToken, authorizeRoles('Admin', 'Kasubag Protokol'), PenugasanController.getStaffProtokol);

// Get agendas available for assignment
router.get('/agendas-for-assignment', authenticateToken, authorizeRoles('Admin', 'Kasubag Protokol'), PenugasanController.getAgendasForAssignment);

// Assign staff to an agenda
router.post('/assign', authenticateToken, authorizeRoles('Admin', 'Kasubag Protokol'), PenugasanController.assignStaff);

module.exports = router;
