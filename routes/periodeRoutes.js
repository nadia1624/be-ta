const express = require('express');
const router = express.Router();
const periodeController = require('../controllers/periodeController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/', authenticateToken, periodeController.createPeriode);
router.get('/', authenticateToken, periodeController.getAllPeriode);
router.put('/:id', authenticateToken, periodeController.updatePeriode);
router.delete('/:id', authenticateToken, periodeController.deletePeriode);

module.exports = router;
