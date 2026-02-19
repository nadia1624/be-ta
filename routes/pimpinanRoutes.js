const express = require('express');
const router = express.Router();
const pimpinanController = require('../controllers/pimpinanController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.get('/jabatan', authenticateToken, pimpinanController.getAllJabatan);
router.get('/active-assignments', authenticateToken, pimpinanController.getActiveAssignments);
router.get('/list', authenticateToken, pimpinanController.getAllPimpinanData);
router.get('/', authenticateToken, pimpinanController.getAllPimpinan);
router.post('/', authenticateToken, pimpinanController.createOrUpdatePimpinan);
router.post('/delete', authenticateToken, pimpinanController.deletePimpinan); // Using POST for delete with body, or could use DELETE with query params

module.exports = router;
