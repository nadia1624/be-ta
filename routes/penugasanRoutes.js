const express = require('express');
const router = express.Router();
const PenugasanController = require('../controllers/PenugasanController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Get all staff protocol
router.get('/staff-protokol', authenticateToken, authorizeRoles('Kasubag Protokol'), PenugasanController.getStaffProtokol);

// Get agendas available for assignment
router.get('/agendas-for-assignment', authenticateToken, authorizeRoles('Kasubag Protokol'), PenugasanController.getAgendasForAssignment);

// Assign staff to an agenda
router.post('/assign', authenticateToken, authorizeRoles('Kasubag Protokol'), PenugasanController.assignStaff);

// Get all my penugasan (consolidated for Kasubag and Staff)
router.get('/my-penugasan', authenticateToken, authorizeRoles('Kasubag Protokol', 'Staff Protokol'), PenugasanController.getMyPenugasan);

// Mark a penugasan as reviewed (selesai) by kasubag
router.patch('/:id/review', authenticateToken, authorizeRoles('Kasubag Protokol'), PenugasanController.updateStatusPenugasan);

// Get detail of a specific penugasan (consolidated for all roles)
router.get('/:id', authenticateToken, authorizeRoles('Kasubag Protokol', 'Staff Protokol'), PenugasanController.getPenugasanDetail);


module.exports = router;
