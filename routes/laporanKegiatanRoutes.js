const express = require('express');
const router = express.Router();
const laporanKegiatanController = require('../controllers/laporanKegiatanController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/laporan');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'laporan-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // Increase to 20MB limit
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file JPG, PNG, dan PDF yang diizinkan'));
        }
    }
});

// Add laporan progress (Staff Protokol only)
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Staff Protokol'),
    upload.single('dokumentasi'),
    laporanKegiatanController.addLaporan
);

// Get all laporan for a specific penugasan
router.get(
    '/penugasan/:id_penugasan',
    authenticateToken,
    authorizeRoles('Kasubag Protokol', 'Staff Protokol','Staff Media', 'Kasubag Media'),
    laporanKegiatanController.getLaporanByPenugasan
);

// Delete a laporan (Staff Protokol, own entry only)
router.delete(
    '/:id_laporan',
    authenticateToken,
    authorizeRoles('Staff Protokol'),
    laporanKegiatanController.deleteLaporan
);

module.exports = router;
