const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');


router.patch('/update', authMiddleware.protect, userController.updateProfile);

router.delete('/delete', authMiddleware.protect, userController.deleteAccount);
router.post('/generate-summary',
    // 1. İLK BURASI ÇALIŞSIN (DEBUG İÇİN)
    (req, res, next) => {
        console.log("📍 ROTA YAKALANDI! İstek buraya ulaştı.");
        next();
    },
    // 2. SONRA AUTH KONTROLÜ
    authMiddleware.protect,
    // 3. EN SON CONTROLLER
    userController.generateSummary
);
router.post('/sync-device', authMiddleware.protect, userController.syncDevice);
router.get('/profile', authMiddleware.protect, userController.getProfile);
router.get('/progress', authMiddleware.protect, userController.getProgress);
router.patch('/sync-progress', authMiddleware.protect, userController.syncProgress);
router.patch('/premium-status', authMiddleware.protect, userController.setPremiumStatus);

module.exports = router;