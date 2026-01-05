const authService = require('../services/authService');
const sendResponse = require('../middlewares/responseHandler');
const catchAsync = require('../utils/errors/catchAsync');
const bunnyUtils = require('../utils/bunnyUtils');

exports.register = catchAsync(async (req, res) => {
    const result = await authService.register(req.body);
    if (!result || !result.user) {
        return next(new AppError('auth.registration_failed_internal', 500));
    }
    // Standart yapı: status, message, data
    sendResponse(res, 201, req.t('auth.register_success'), {
        user: result.user,
        tokens: result.tokens
    });
});


exports.refreshToken = catchAsync(async (req, res, next) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return next(new AppError('auth.refresh_token_required', 400));
    }

    const tokens = await authService.refreshToken(refreshToken);

    sendResponse(res, 200, req.t('auth.token_refreshed'), {
        tokens
    });
});

exports.guestLogin = catchAsync(async (req, res, next) => {
    // Body'den sadece devicePublicKey gelebilir (opsiyonel)
    const result = await authService.guestLogin(req.body);

    sendResponse(res, 201, req.t('auth.guest_login_success'), {
        user: result.user,
        tokens: result.tokens
    });
});

