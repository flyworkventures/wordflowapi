// controllers/userController.js (Yeni dosya veya authController içine ekle)

const userService = require('../services/userService');
const userRepository = require('../repositories/userRepository');
const sendResponse = require('../middlewares/responseHandler');
const catchAsync = require('../utils/errors/catchAsync');
const AppError = require('../utils/errors/appError');
const notificationService = require('../services/notificationService');
const { prisma } = require('../config/prisma');

exports.updateProfile = catchAsync(async (req, res, next) => {
    if (!req.user || !req.user.id) {
        return next(new AppError('auth.unauthorized', 401));
    }

    const updatedUser = await userService.updateProfile(req.user.id, req.body);

    sendResponse(res, 200, req.t('user.profile_updated'), updatedUser);
});

exports.setPremiumStatus = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const { isPremium } = req.body;

    if (typeof isPremium !== 'boolean') {
        return next(new AppError('validation.invalid_input', 400));
    }

    const result = await userService.updatePremiumStatus(userId, isPremium);

    sendResponse(res, 200, 'Premium status updated', result);
});

exports.deleteAccount = catchAsync(async (req, res, next) => {
    // req.user.id, auth middleware'den (protect) geliyor
    if (!req.user || !req.user.id) {
        return next(new AppError('auth.unauthorized', 401));
    }

    await userService.deleteAccount(req.user.id);
    sendResponse(res, 200, req.t('user.account_deleted_success'), null);
});

exports.generateSummary = catchAsync(async (req, res, next) => {
    console.log("1. Controller'a istek geldi.");
    if (!req.user || !req.user.id) {
        return next(new AppError('auth.unauthorized', 401));
    }

    const summary = await userService.generateAndSaveSummary(req.user.id);
    console.log("4. Servisten yanıt döndü:", summary); // LOG EKLE

    sendResponse(res, 200, req.t('user.summary_generated'), { summary });
});
exports.syncDevice = async (req, res) => {
    try {
        // Auth middleware'den gelen user id (Flutter'daki Token sayesinde)
        const userId = req.user.id;

        // Flutter'dan gönderdiğin body: { 'oneSignalPlayerId': '...' }
        const { oneSignalPlayerId } = req.body;

        if (!oneSignalPlayerId) {
            return res.status(400).json({ message: 'OneSignal ID is required' });
        }

        console.log(`📲 Cihaz Eşitleme: User ${userId} -> ID: ${oneSignalPlayerId}`);

        // Veritabanını güncelle
        await prisma.user.update({
            where: { id: userId },
            data: {
                oneSignalId: oneSignalPlayerId
            }
        });

        // 204 No Content dönüyoruz (Flutter tarafı data beklemiyor)
        return res.status(204).send();

    } catch (error) {
        console.error('Sync Device Error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getProfile = catchAsync(async (req, res, next) => {
    // req.user.id, authMiddleware'den geliyor
    const user = await userService.getUserProfile(req.user.id);

    if (!user) {
        return next(new AppError('user.not_found', 404));
    }

    sendResponse(res, 200, 'Profile retrieved successfully', user);
});

exports.getProgress = catchAsync(async (req, res, next) => {
    // req.user.id auth middleware'den geliyor
    const user = await userRepository.findProgressById(req.user.id);

    if (!user) {
        return next(new AppError('user.not_found', 404));
    }

    // Cevap: { "progress": 45.5 }
    sendResponse(res, 200, 'Progress retrieved', { progress: user.wordPracticeProgress });
});

exports.syncProgress = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const { quickReviewProgress, readingTestProgress, dailyTestProgress, totalProgress } = req.body;
    

    // Servis katmanına toplu veriyi gönderiyoruz
    const updatedUser = await userService.updateLocalProgress(userId, {
        quickReviewProgress,
        readingTestProgress,
        dailyTestProgress,
        totalProgress
    });

    // Flutter tarafı veri beklemediği için 204 veya başarılı 200 dönebiliriz
    sendResponse(res, 200, req.t('user.progress_synced'), updatedUser);
});