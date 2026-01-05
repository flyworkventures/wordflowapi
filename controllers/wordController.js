const wordPracticeService = require('../services/wordPracticeService');
const sendResponse = require('../middlewares/responseHandler');
const catchAsync = require('../utils/errors/catchAsync');
const AppError = require('../utils/errors/appError');

exports.getMixedPracticeSession = catchAsync(async (req, res, next) => {
    let userId = req.query.userId || (req.user && req.user.id);
    if (!userId) {
        return next(new AppError('user.notFound', 400));
    }
    userId = Number(userId);

    const practiceData = await wordPracticeService.generateMixedLevelSession(userId);

    // KONTROL: Eğer boş liste geldiyse premium gerekli demektir
    if (Array.isArray(practiceData) && practiceData.length === 0) {
        return sendResponse(res, 200, 'premium.required', []);
    }

    sendResponse(res, 200, 'Most Frequently session generated successfully', practiceData);
});

exports.getPracticeSession = catchAsync(async (req, res, next) => {
    console.log("test")
    let userId = req.query.userId || (req.user && req.user.id);
    if (!userId) {
        return next(new AppError('user.notFound', 400));
    }

    userId = Number(userId);

    const practiceData = await wordPracticeService.generatePracticeSession(userId);

    // KONTROL: Boş liste = Premium Required
    if (Array.isArray(practiceData) && practiceData.length === 0) {
        return res.status(200).json({
            status: 'success', // Veya 'fail' yapabilirsin frontend mantığına göre
            message: 'premium.required',
            data: []
        });
    }

    // Normal Akış
    res.status(200).json({
        status: 'success',
        message: '',
        data: practiceData
    });
});


exports.getReadingSession = catchAsync(async (req, res, next) => {
    let userId = req.query.userId || (req.user && req.user.id);

    if (!userId) {
        return next(new AppError('auth.unauthorized', 401));
    }

    userId = Number(userId);

    const readingData = await wordPracticeService.generateReadingSession(userId);

    // KONTROL
    if (Array.isArray(readingData) && readingData.length === 0) {
        return sendResponse(res, 200, 'premium.required', []);
    }

    sendResponse(res, 200, 'Reading session generated successfully', readingData);
});


exports.saveUserWords = catchAsync(async (req, res, next) => {
    // Bu metod sadece kaydetme işlemi yaptığı için premium kontrolü eklemedim, 
    // ama istersen buraya da eklenebilir. Şimdilik pas geçiyorum.
    const userId = req.user.id;
    const { words } = req.body;
    if (!words || !Array.isArray(words)) {
        return res.status(400).json({
            status: 'fail',
            message: 'Geçerli bir kelime listesi (array) göndermelisiniz.'
        });
    }
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            savedWords: JSON.stringify(words)
        },
        select: { savedWords: true }
    });

    sendResponse(res, 200, 'Kelimeler başarıyla senkronize edildi.', {
        savedWords: JSON.parse(updatedUser.savedWords)
    });
});

exports.syncAndGenerateTest = catchAsync(async (req, res, next) => {
    const userId = req.user.id;
    const { words } = req.body;

    const testQuestions = await wordPracticeService.syncAndGenerateTestSession(userId, words);

    // KONTROL
    if (Array.isArray(testQuestions) && testQuestions.length === 0) {
        return sendResponse(res, 200, 'premium.required', []);
    }

    sendResponse(res, 200, 'Test generated successfully', testQuestions);
});