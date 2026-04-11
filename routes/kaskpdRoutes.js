const express = require('express');
const router = express.Router();
const kaskpdController = require('../controllers/kaskpdController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, kaskpdController.getAll);
router.post('/', authenticateToken, authorizeRoles('Admin'), kaskpdController.create);
router.put('/:id', authenticateToken, authorizeRoles('Admin'), kaskpdController.update);
router.delete('/:id', authenticateToken, authorizeRoles('Admin'), kaskpdController.delete);

module.exports = router;
