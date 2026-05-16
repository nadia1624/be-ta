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
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

// Wrapper middleware to handle Multer errors
const uploadMiddleware = (req, res, next) => {
    const uploadSingle = upload.single('surat_permohonan');
    
    uploadSingle(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ success: false, message: 'Ukuran file surat permohonan terlalu besar. Maksimal 20MB' });
            }
            return res.status(400).json({ success: false, message: `Error upload: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        // Everything went fine.
        next();
    });
};

router.post('/', authenticateToken, uploadMiddleware, agendaController.createAgenda);
router.put('/:id_agenda', authenticateToken, uploadMiddleware, agendaController.updateAgenda);
router.get('/my', authenticateToken, agendaController.getMyAgendas);
router.get('/slots', authenticateToken, agendaController.getSlots);
router.post('/:id_agenda/cancel', authenticateToken, agendaController.cancelAgenda);

router.get('/all', authenticateToken, authorizeRoles('Sespri'), agendaController.getAllAgendas);
router.post('/:id_agenda/verify', authenticateToken, authorizeRoles('Sespri'), agendaController.verifyAgenda);

router.get('/leader-agendas', authenticateToken, authorizeRoles('Sespri', 'Ajudan', 'Kasubag Protokol', 'Kasubag Media', 'Staff Protokol', 'Staff Media'), agendaController.getLeaderAgendas);
router.put('/pimpinan/:id_agenda/:id_jabatan/:id_periode', authenticateToken, authorizeRoles('Sespri', 'Ajudan'), agendaController.updateLeaderAttendance);
router.post('/pimpinan/slots', authenticateToken, authorizeRoles('Sespri', 'Ajudan'), agendaController.updateAgendaSlots);

module.exports = router;
