const express = require('express');
const router = express.Router();
const PenugasanController = require('../controllers/PenugasanController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Get all staff protocol
router.get('/staff-protokol', authenticateToken, authorizeRoles('Kasubag Protokol'), PenugasanController.getStaffProtokol);

// Get all staff media
router.get('/staff-media', authenticateToken, authorizeRoles('Kasubag Media'), PenugasanController.getStaffMedia);

// Get agendas available for assignment (Protokol)
router.get('/agendas-for-assignment', authenticateToken, authorizeRoles('Kasubag Protokol'), PenugasanController.getAgendasForAssignment);

// Get agendas available for assignment (Media)
router.get('/agendas-for-media-assignment', authenticateToken, authorizeRoles('Kasubag Media'), PenugasanController.getAgendasForMediaAssignment);

// Assign staff to an agenda
router.post('/assign', authenticateToken, authorizeRoles('Kasubag Protokol', 'Kasubag Media'), PenugasanController.assignStaff);

// Get all my penugasan (consolidated for Kasubag and Staff)
router.get('/my-penugasan', authenticateToken, authorizeRoles('Kasubag Protokol', 'Staff Protokol', 'Kasubag Media', 'Staff Media'), PenugasanController.getMyPenugasan);

// Get all protokol assignments for media roles
router.get('/protokol-assignments', authenticateToken, authorizeRoles('Kasubag Media', 'Staff Media'), PenugasanController.getProtokolAssignments);

// Mark a penugasan as reviewed (selesai) by kasubag
router.patch('/:id/review', authenticateToken, authorizeRoles('Kasubag Protokol', 'Kasubag Media'), PenugasanController.updateStatusPenugasan);

// Get detail of a specific penugasan (consolidated for all roles)
router.get('/:id', authenticateToken, authorizeRoles('Kasubag Protokol', 'Staff Protokol', 'Kasubag Media', 'Staff Media'), PenugasanController.getPenugasanDetail);


module.exports = router;
