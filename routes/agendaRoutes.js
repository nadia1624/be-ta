const express = require('express');
const router = express.Router();
const agendaController = require('../controllers/agendaController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/surat_permohonan/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

router.post('/', authenticateToken, upload.single('surat_permohonan'), agendaController.createAgenda);
router.put('/:id_agenda', authenticateToken, upload.single('surat_permohonan'), agendaController.updateAgenda);
router.get('/my', authenticateToken, agendaController.getMyAgendas);
router.get('/slots', authenticateToken, agendaController.getSlots);

// Sespri verification routes
router.get('/all', authenticateToken, authorizeRoles('Sespri'), agendaController.getAllAgendas);
router.post('/:id_agenda/verify', authenticateToken, authorizeRoles('Sespri'), agendaController.verifyAgenda);

// Leader Agenda Management routes (for Sespri, Ajudan, Kasubag Protokol, Kasubag Media, Staf Protokol, Staf Media)
router.get('/leader-agendas', authenticateToken, authorizeRoles('Sespri', 'Ajudan', 'Kasubag Protokol', 'Kasubag Media', 'Staff Protokol', 'Staff Media'), agendaController.getLeaderAgendas);
router.put('/pimpinan/:id_agenda/:id_jabatan/:id_periode', authenticateToken, authorizeRoles('Sespri', 'Ajudan'), upload.single('surat_disposisi'), agendaController.updateLeaderAttendance);
router.post('/pimpinan/slots', authenticateToken, authorizeRoles('Sespri', 'Ajudan'), agendaController.updateAgendaSlots);

module.exports = router;
