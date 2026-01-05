const userRepository = require('../repositories/userRepository');
const { createClientDataHash } = require('../utils/crypto');
const AppError = require('../utils/errors/appError');
const catchAsync = require('../utils/errors/catchAsync');

module.exports = catchAsync(async (req, res, next) => {
    // 🛠 GELİŞTİRME ORTAMI (DEVELOPMENT) BYPASS
    // Bu blok, uygulamanın Store'dan indirilip indirilmediği kontrolünü atlar.
    // Böylece Simülatör/Emülatör üzerinden gerçek Google Token'ı ile giriş yapabilirsin.
    if (process.env.NODE_ENV === 'development') {
        console.log(`🟡 [DEV MODE] Integrity (Store) Kontrolü Atlanıyor: ${req.method} ${req.path}`);

        // Google/Apple ID Token'ı (req.body.idToken) olduğu gibi kalır, buna dokunmuyoruz.
        // AuthService gerçek doğrulamayı yapacaktır.

        // Veritabanı "devicePublicKey" alanını zorunlu tutuyorsa veya bekliyorsa;
        // hata almamak için sahte bir anahtar ekliyoruz.
        if (req.path.includes('register') || req.path.includes('refresh-token')) {
            if (!req.body.devicePublicKey) {
                req.body.devicePublicKey = 'dev_dummy_public_key_bypass';
            }
        }

        // Integrity servisine gitmeden bir sonraki adıma (Controller'a) geç:
        return next();
    }

    // --- 🔐 CANLI (PRODUCTION) GÜVENLİK MANTIĞI ---
    // Burası sadece Production ortamında çalışır ve Store kontrolü yapar.

    const platform = req.header('X-Platform');
    const token = req.header('X-Integrity-Token');

    if (!token) return next(new AppError('error.integrity_missing', 401));

    const hash = createClientDataHash(req.body);

    if (platform === 'android') {
        const isValid = await IntegrityService.verifyAndroid(token);
        if (!isValid) return next(new AppError('error.untrusted_device', 403));
    } else if (platform === 'ios') {
        if (req.path.includes('register')) {
            const pubKey = await IntegrityService.verifyIosAttestation(token, hash);
            if (!pubKey) return next(new AppError('error.invalid_attestation', 403));
            req.body.devicePublicKey = pubKey;
        } else {
            if (!req.user) return next(new AppError('auth.please_login', 401));
            const result = await IntegrityService.verifyIosAssertion(
                token, hash, req.user.devicePublicKey, req.user.lastCounter
            );
            if (!result.isValid) return next(new AppError('error.untrusted_device', 403));
            await userRepository.updateCounter(req.user.id, result.counter);
        }
    }

    next();
});