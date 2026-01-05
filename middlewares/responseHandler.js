const { API_STATUS } = require('../utils/constants/enums');

/**
 * Standart API Yanıt Formatı
 * @param {Object} res - Express Response Objesi
 * @param {number} statusCode - HTTP Status Kodu
 * @param {string} message - Kullanıcıya iletilecek mesaj
 * @param {Object|null} data - Gönderilecek veri (opsiyonel)
 */
const sendResponse = (res, statusCode, message, data = null) => {
    // Status kodu 4xx veya 5xx ise FAIL/ERROR, değilse SUCCESS döner
    const status = statusCode >= 400
        ? (statusCode >= 500 ? API_STATUS.ERROR : API_STATUS.FAIL)
        : API_STATUS.SUCCESS;

    res.status(statusCode).json({
        status: status,
        message: message,
        data: data
    });
};

module.exports = sendResponse;