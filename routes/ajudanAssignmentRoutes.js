const express = require('express');
const router = express.Router();
const PenugasanAjudanController = require('../controllers/PenugasanAjudanController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, authorizeRoles('Admin'), (req, res) => PenugasanAjudanController.getAllAssignments(req, res));
router.post('/', authenticateToken, authorizeRoles('Admin'), (req, res) => PenugasanAjudanController.createAssignment(req, res));
router.put('/set-active', authenticateToken, authorizeRoles('Admin'), (req, res) => PenugasanAjudanController.setActiveAssignment(req, res));
router.post('/delete', authenticateToken, authorizeRoles('Admin'), (req, res) => PenugasanAjudanController.deleteAssignment(req, res));

module.exports = router;
