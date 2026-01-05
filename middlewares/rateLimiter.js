const rateLimit = require('express-rate-limit');
const AppError = require('../utils/errors/catchAsync');

// Kayıt ve Giriş işlemleri için çok daha sıkı bir limit
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 10, // 15 dakikada en fazla 10 deneme
    handler: (req, res, next) => {
        next(new AppError('error.too_many_requests', 429));
    }
});

module.exports = { authLimiter };