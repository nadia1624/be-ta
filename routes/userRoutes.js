const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/', authenticateToken, userController.getAllUsers);
router.post('/', authenticateToken, userController.createUser);
router.put('/:id', authenticateToken, userController.updateUser);
router.post('/delete', authenticateToken, userController.deleteUser);
router.get('/roles', authenticateToken, userController.getAllRoles);

module.exports = router;
