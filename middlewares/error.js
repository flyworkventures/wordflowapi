// src/middlewares/errorHandler.js
const { API_STATUS } = require('../utils/constants/enums');
const AppError = require('../utils/errors/appError');

const handlePrismaError = (err) => {
    switch (err.code) {
        case 'P2002': // Unique Constraint
            return new AppError('error.already_exists', 400);
        case 'P2003': // Foreign Key
            return new AppError('error.invalid_relation', 400);
        case 'P2025': // Record not found
            return new AppError('error.record_not_found', 404);
        default:
            return new AppError('error.database_error', 500);
    }
};

const errorHandler = (err, req, res, next) => {
    let error = err;

    // Prisma hatalarını evcilleştir
    if (err.code && err.code.startsWith('P')) {
        error = handlePrismaError(err);
    }

    const statusCode = error.statusCode || 500;
    const status = statusCode >= 500 ? API_STATUS.ERROR : API_STATUS.FAIL;

    // req.t() fonksiyonu i18next-http-middleware tarafından sağlanır
    // JSON'daki path'e göre (örn: "error.already_exists") çeviri yapar.
    const message = req.t ? req.t(error.message) : error.message;

    res.status(statusCode).json({
        status: status,
        message: message,
        data: null,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler;