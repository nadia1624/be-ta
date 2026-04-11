const express = require('express');
const router = express.Router();
const pimpinanController = require('../controllers/PimpinanController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/jabatan', authenticateToken, authorizeRoles('Admin'), pimpinanController.getAllJabatan);
router.get('/active-assignments', authenticateToken, authorizeRoles('Admin', 'Pemohon', 'Sespri', 'Ajudan'), pimpinanController.getActiveAssignments);
router.get('/list', authenticateToken, authorizeRoles('Admin'), pimpinanController.getAllPimpinanData);
router.get('/', authenticateToken, authorizeRoles('Admin', 'Sespri', 'Ajudan'), pimpinanController.getAllPimpinan);
router.post('/', authenticateToken, authorizeRoles('Admin'), pimpinanController.createOrUpdatePimpinan);
router.post('/delete', authenticateToken, authorizeRoles('Admin'), pimpinanController.deletePimpinan);
router.post('/resend-sync/:id_pimpinan', authenticateToken, authorizeRoles('Admin'), pimpinanController.resendSyncInvitation);

module.exports = router;
