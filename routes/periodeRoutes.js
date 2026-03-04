const express = require('express');
const router = express.Router();
const periodeController = require('../controllers/periodeController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, authorizeRoles('Admin'), periodeController.createPeriode);
router.get('/', authenticateToken, periodeController.getAllPeriode);
router.put('/:id', authenticateToken, authorizeRoles('Admin'), periodeController.updatePeriode);
router.delete('/:id', authenticateToken, authorizeRoles('Admin'), periodeController.deletePeriode);

module.exports = router;
