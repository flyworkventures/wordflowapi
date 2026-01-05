const express = require('express');
const authController = require('../controllers/authController');
const { authLimiter } = require('../middlewares/rateLimiter');
const validate = require('../middlewares/validate');
const { RegisterDto } = require('../dtos/authDtos');
const verifyDeviceIntegrity = require('../middlewares/integrity');
const router = express.Router();

// Güvenlik Zinciri: Rate Limit -> App Check -> Register

// src/routes/authRoutes.js
router.post('/register',
    authLimiter,
    verifyDeviceIntegrity, // Önce Cihaz/Uygulama kontrolü
    validate(RegisterDto), // Sonra Veri Formatı kontrolü
    authController.register
);

router.post('/refresh-token',
    authLimiter,
    verifyDeviceIntegrity, // Güvenliği elden bırakmıyoruz
    authController.refreshToken
);

router.post('/guest', authController.guestLogin);

module.exports = router;


