const express = require('express');
const wordController = require('../controllers/wordController');
const { protect } = require('../middlewares/authMiddleware');
const verifyDeviceIntegrity = require('../middlewares/integrity'); // Güvenlik katmanı

const router = express.Router();


router.get('/practice', wordController.getPracticeSession);
router.get('/most-frequently', wordController.getMixedPracticeSession);
router.get('/reading', wordController.getReadingSession);
router.post('/save-words', wordController.saveUserWords);
router.post('/sync-and-test', protect, wordController.syncAndGenerateTest);

module.exports = router;