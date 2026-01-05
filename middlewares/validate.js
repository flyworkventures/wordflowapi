const AppError = require('../utils/errors/appError');

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        // 🛠 KRİTİK: Hatanın ne olduğunu terminale yazdır
        console.log('❌ Validasyon Hatası:', result.error.format());

        return next(new AppError('error.validation_failed', 400));
    }

    req.body = result.data;
    next();
};

module.exports = validate;