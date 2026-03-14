const express = require('express');
const router = express.Router();
const beritaController = require('../controllers/beritaController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/berita');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'dok-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // Increase to 50MB limit
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.mp4', '.mov'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file JPG, PNG, dan Video yang diizinkan'));
        }
    }
});

router.get('/public', beritaController.getPublicBerita);
router.get('/public/:id', beritaController.getPublicBeritaDetail);

// Routes for Kasubag Media
router.get('/drafts-review', authenticateToken, authorizeRoles('Kasubag Media'), beritaController.getDraftsReview);
router.get('/drafts/all', authenticateToken, authorizeRoles('Kasubag Media'), beritaController.getAllDrafts);
router.get('/drafts/:id', authenticateToken, authorizeRoles('Kasubag Media', 'Staff Media', 'Staf Media'), beritaController.getDraftDetail);
router.patch('/drafts/:id/review', authenticateToken, authorizeRoles('Kasubag Media'), beritaController.reviewDraft);

// Routes for Staff Media
router.get('/my-drafts', authenticateToken, authorizeRoles('Staff Media', 'Staf Media'), beritaController.getMyDrafts);
router.post('/drafts', authenticateToken, authorizeRoles('Staff Media', 'Staf Media'), upload.array('dokumentasi', 10), beritaController.submitDraftBerita);

module.exports = router;
