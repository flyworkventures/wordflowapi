const userRepository = require('../repositories/userRepository');
const socialAuthService = require('./socialAuthService');
const tokenUtils = require('../utils/tokenUtils');
const bunnyUtils= require('../utils/bunnyUtils');
const appleUtils = require('../utils/appleUtils');
const AppError = require('../utils/errors/appError');
const { language } = require('googleapis/build/src/apis/language');
const { prisma } = require('../config/prisma');


class AuthService {

    // -------------------------------------------------------------------------
    // 1. NORMAL VE SOSYAL MEDYA KAYIT/GİRİŞ (Google, Apple, Facebook)
    // -------------------------------------------------------------------------
    async register(data) {
        console.log("👉 [1] İşlem Başladı. Provider:", data.provider);

        // A. Token Doğrulama
        const socialUser = await socialAuthService.verifyToken(data.idToken, data.provider);

        if (!socialUser || (!socialUser.email && !socialUser.providerId)) {
            throw new AppError('auth.social_login_failed', 400);
        }

        // --- 🍏 APPLE REFRESH TOKEN MANTIĞI EKLENDİ ---
        let appleRefreshToken = null;

        // Eğer sağlayıcı Apple ise ve Flutter 'authorizationCode' gönderdiyse
        if (data.provider === 'apple' && data.authorizationCode) {
            appleRefreshToken = await appleUtils.getRefreshTokenFromCode(data.authorizationCode);
        }
        // ----------------------------------------------

        // --- İSİM BELİRLEME MANTIĞI ---
        console.log("🔍 [DEBUG] İsim Kontrolü:");
        console.log("   - socialUser.name:", socialUser.name);
        console.log("   - data.name:", data.name);
        console.log("   - data.provider:", data.provider);
        
        // Öncelik sırası: 1) Flutter'dan gelen data.name, 2) Token'dan gelen isim, 3) Varsayılan
        let finalName = null;
        
        // 1. Önce Flutter'dan gelen ismi kontrol et (en yüksek öncelik)
        if (data.name && data.name.trim() && data.name !== "Guest" && data.name !== "Language Learner") {
            finalName = data.name.trim();
            console.log("   ✅ data.name kullanıldı:", finalName);
        }
        // 2. Token'dan gelen ismi kontrol et
        else if (socialUser.name && socialUser.name.trim() && socialUser.name !== "Guest") {
            finalName = socialUser.name.trim();
            console.log("   ✅ socialUser.name kullanıldı:", finalName);
        }
        // 3. Varsayılan isim
        else {
            finalName = "Language Learner";
            console.log("   ⚠️ Varsayılan isim kullanıldı:", finalName);
        }

        console.log("👉 [2] Email:", socialUser.email, "Final İsim:", finalName);

        // B. Kullanıcı Kontrolü
        let user = await userRepository.findByEmail(socialUser.email);
        let isNewUser = false;

        if (user) {
            // ✅ DURUM 1: KULLANICI MEVCUT
            console.log("👤 [Mevcut Kullanıcı] Mevcut isim:", user.name);
            console.log("👤 [Mevcut Kullanıcı] Gelen finalName:", finalName);
            
            // İsim güncelleme: Eğer yeni isim geldiyse ve geçerli bir isimse güncelle
            // Mevcut isim "Guest" veya "Language Learner" ise veya boşsa, yeni isimle güncelle
            const shouldUpdateName = finalName && 
                finalName !== "Guest" && 
                finalName !== "Language Learner" &&
                finalName.trim().length > 0 &&
                (user.name === "Guest" || 
                 user.name === "Language Learner" || 
                 !user.name || 
                 user.name.trim() === "" ||
                 user.name === null);

            const updateData = {
                lastActivityAt: new Date(),
                lastNotificationLevel: null
            };

            // İsim güncellemesi gerekiyorsa ekle
            if (shouldUpdateName) {
                updateData.name = finalName;
                console.log(`📝 ✅ Kullanıcı ismi güncelleniyor: "${user.name}" -> "${finalName}"`);
            } else {
                console.log(`📝 ⏭️ İsim güncellenmedi. Sebep:`, {
                    finalName: finalName,
                    mevcutIsim: user.name,
                    shouldUpdate: shouldUpdateName,
                    finalNameLength: finalName ? finalName.trim().length : 0
                });
            }

            await prisma.user.update({
                where: { id: user.id },
                data: updateData
            }).catch(err => console.error('❌ Activity update error:', err));

            // Hesap Bağlama Kontrolü
            const accounts = user.socialAccounts || [];
            const existingAccount = accounts.find(acc => acc.provider === data.provider);

            if (!existingAccount) {
                // Yeni hesap bağlanıyor
                await userRepository.addSocialAccount(
                    user.id,
                    data.provider,
                    socialUser.providerId,
                    appleRefreshToken // 👈 Token gönderiliyor
                );
            } else if (data.provider === 'apple' && appleRefreshToken) {
                // Eğer Apple hesabı zaten bağlıysa ama elimize yeni bir refresh token geçtiyse güncelleyelim
                // (Kullanıcı revoke edip tekrar bağlamış olabilir)
                await userRepository.updateSocialAccountToken(existingAccount.id, appleRefreshToken);
            }

            if (data.devicePublicKey) {
                await userRepository.updateDeviceKey(user.id, data.devicePublicKey);
            }

            // İsim güncellendiyse user objesini de güncelle (response için)
            if (shouldUpdateName) {
                user.name = finalName;
                console.log(`📝 ✅ User objesi güncellendi, yeni isim: ${user.name}`);
            }
            
            // User'ı tekrar çek (güncel veriler için)
            user = await userRepository.findById(user.id);

        } else {
            // ✅ DURUM 2: YENİ KULLANICI
            console.log("👉 [3] Yeni kayıt oluşturuluyor...");

            let userAvatarUrl = socialUser.avatar;
            if (userAvatarUrl) {
                userAvatarUrl = await bunnyUtils.uploadFromUrl(socialUser.avatar, 'avatars');
            }

            isNewUser = true;

            const newUserData = {
                email: socialUser.email,
                name: finalName,
                avatar: userAvatarUrl,
                level: data.level || 'a1',
                learnLanguage: data.learnLanguage || 'en',
                dailyGoal: data.dailyGoal || 20,
                isAnsweredQuestions: false,
                interests: JSON.stringify(data.interests || []),
                devicePublicKey: data.devicePublicKey,
                lastActivityAt: new Date(),
                lastNotificationLevel: null
            };

            const socialData = {
                provider: data.provider,
                providerId: socialUser.providerId,
                refreshToken: appleRefreshToken // 👈 Token gönderiliyor
            };

            try {
                user = await userRepository.createWithSocial(newUserData, socialData);
                console.log("🎉 Yeni Kullanıcı Oluşturuldu ID:", user.id);
            } catch (createError) {
                console.error("❌ Kayıt Hatası:", createError);
                throw new AppError('error.user_creation_failed', 500);
            }
        }

        return this._generateAuthResponse(user, isNewUser);
    }
    // -------------------------------------------------------------------------
    // 2. MİSAFİR GİRİŞİ (Cihaz ID'sine Göre)
    // -------------------------------------------------------------------------
    async guestLogin(data) {
        console.log("👉 [Guest] Misafir girişi kontrol ediliyor...");

        const deviceId = data.devicePublicKey;

        // Cihaz ID zorunlu
        if (!deviceId) {
            throw new AppError('auth.guest_device_id_required', 400);
        }

        // A. Bu cihaz ID'si ile (provider: 'guest') kayıtlı kullanıcı var mı?
        let user = await userRepository.findByProvider('guest', deviceId);
        let isNewUser = false;

        if (user) {
            // ✅ DURUM 1: ESKİ MİSAFİR BULUNDU
            console.log("👉 [Guest] Mevcut misafir hesabı bulundu ID:", user.id);
            
            prisma.user.update({
                where: { id: user.id },
                data: {
                    lastActivityAt: new Date(),
                    lastNotificationLevel: null // Döngüyü sıfırla, kullanıcı geri döndü!
                }
            }).catch(err => console.error('Activity update error:', err));

            // Eğer istersen son giriş tarihini güncelleme vb. işlemler burada yapılabilir.

        } else {
            // ✅ DURUM 2: BU CİHAZ İLK KEZ GELİYOR
            console.log("👉 [Guest] Hesap yok. Yeni misafir oluşturuluyor...");
            isNewUser = true;
            let shortDeviceId = deviceId.substring(0, 5);
            // Benzersiz Email Oluştur (guest_DEVICEID@wordflow.internal)
            const guestEmail = `guest_${shortDeviceId}@wordflow.com`;

            const newUserData = {
                email: guestEmail,
                name: "Guest",
                avatar: null,
                level: 'A1',
                learnLanguage: 'en',
                dailyGoal: 20,
                isAnsweredQuestions: false,
                interests: JSON.stringify([]),
                devicePublicKey: deviceId,
                lastActivityAt: new Date(),
                lastNotificationLevel: null 
            };

            const socialData = {
                provider: 'guest',   // Sabit
                providerId: deviceId // Cihaz ID'sini SocialAccount'a kaydediyoruz
            };

            try {
                user = await userRepository.createWithSocial(newUserData, socialData);
                console.log("🎉 Misafir Kullanıcı Oluşturuldu ID:", user.id);
            } catch (createError) {
                console.error("❌ [Guest] Oluşturma Hatası:", createError);
                throw new AppError('auth.guest_login_failed', 500);
            }
        }

        return this._generateAuthResponse(user, isNewUser);
    }

    // -------------------------------------------------------------------------
    // 3. REFRESH TOKEN
    // -------------------------------------------------------------------------
    async refreshToken(token) {
        const decoded = tokenUtils.verifyRefreshToken(token);
        if (!decoded) throw new AppError('auth.invalid_refresh_token', 401);

        const user = await userRepository.findById(decoded.id);
        if (!user || user.refreshToken !== token) {
            throw new AppError('auth.invalid_refresh_token', 401);
        }

        const newAccessToken = tokenUtils.generateAccessToken(user);
        const newRefreshToken = tokenUtils.generateRefreshToken(user);

        await userRepository.updateRefreshToken(user.id, newRefreshToken);

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        };
    }

    // -------------------------------------------------------------------------
    // YARDIMCI METODLAR
    // -------------------------------------------------------------------------

    // Token üretir ve response objesini hazırlar (Register ve Guest için ortak)
    async _generateAuthResponse(user, isNewUser) {
        const accessToken = tokenUtils.generateAccessToken(user);
        const refreshToken = tokenUtils.generateRefreshToken(user);

        // Refresh Token'ı DB'ye kaydet
        await userRepository.updateRefreshToken(user.id, refreshToken);

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
                level: user.level,
                dailyGoal: user.dailyGoal,
                isPremium: user.isPremium,
                isAnsweredQuestions: user.isAnsweredQuestions,
                interests: user.interests ? this._safeJsonParse(user.interests) : []
            },
            tokens: {
                accessToken,
                refreshToken
            },
            isNewUser: isNewUser
        };
    }

    _safeJsonParse(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            return [];
        }
    }
}

module.exports = new AuthService();