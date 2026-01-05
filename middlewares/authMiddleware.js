const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/errors/appError');
const catchAsync = require('../utils/errors/catchAsync');

const protect = catchAsync(async (req, res, next) => {
    // 1) Header'dan token'ı al (Bearer Token formatı)
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return next(new AppError('auth.please_login', 401));
    }

    // 2) Token doğrulaması
    // jwt.verify normalde callback ile çalışır, promisify ile await'e uygun hale getiriyoruz
    const decoded = await promisify(jwt.verify)(token, process.env.ACCESS_TOKEN_SECRET);

    // 3) Kullanıcı hala veritabanında var mı kontrol et
    const currentUser = await userRepository.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError('auth.user_no_longer_exists', 401));
    }

    // 4) YETKİ VERİLDİ: Kullanıcıyı isteğe (req) ekle
    req.user = currentUser;
    next();
});

module.exports = { protect };