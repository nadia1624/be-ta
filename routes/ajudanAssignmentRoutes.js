const express = require('express');
const router = express.Router();
const AjudanAssignmentController = require('../controllers/AjudanAssignmentController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, authorizeRoles('Admin'), (req, res) => AjudanAssignmentController.getAllAssignments(req, res));
router.post('/', authenticateToken, authorizeRoles('Admin'), (req, res) => AjudanAssignmentController.createAssignment(req, res));
router.put('/set-active', authenticateToken, authorizeRoles('Admin'), (req, res) => AjudanAssignmentController.setActiveAssignment(req, res));
router.post('/delete', authenticateToken, authorizeRoles('Admin'), (req, res) => AjudanAssignmentController.deleteAssignment(req, res));

module.exports = router;
