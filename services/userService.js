// services/userService.js (Yeni dosya veya mevcut servise ekle)

const { language } = require('googleapis/build/src/apis/language');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/errors/appError');
const axios = require('axios');
const bunnyUtils = require('../utils/bunnyUtils');
const appleUtils = require('../utils/appleUtils');

class UserService {
    async updateProfile(userId, updateData) {
        // 1. Güncellenmesine izin verilen alanları filtrele (Security Best Practice)
        // Kullanıcının request body'sinde 'isPremium': true gönderip hile yapmasını engelleriz.
        const allowedFields = [
            'name', 'level', 'dailyGoal', 'interests', 'learnLanguage',
            'isAnsweredQuestions', 'wordPracticeProgress', 'quickReviewProgress',
            'readingTestProgress', 'dailyTestProgress', 'totalProgress',
            'avatar' // 👈 Eklendi
        ];

        const filteredData = {};
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                filteredData[key] = updateData[key];
            }
        });

        // Eğer güncellenecek bir veri yoksa hata fırlatabilir veya boş dönebiliriz
        if (Object.keys(filteredData).length === 0) {
            throw new AppError('user.no_data_to_update', 400);
        }

        const currentUser = await userRepository.findById(userId);

        // Eğer gelen veride level varsa VE bu level veritabanındakinden FARKLIYSA sıfırla
        if (filteredData.level && filteredData.level !== currentUser.level) {
            console.log(`Level değişimi algılandı: ${currentUser.level} -> ${filteredData.level}. Progress sıfırlanıyor.`);
            filteredData.quickReviewProgress = 0;
            filteredData.readingTestProgress = 0;
            filteredData.dailyTestProgress = 0;
            filteredData.totalProgress = 0;
            filteredData.wordPracticeProgress = 0;
        }

        // 2. Özel Dönüşümler
        // Interests array gelirse DB için string'e çevir
        if (filteredData.interests && Array.isArray(filteredData.interests)) {
            filteredData.interests = JSON.stringify(filteredData.interests);
        }

        if (filteredData.avatar) {
            // Sadece string (URL) gelirse işlem yap
            if (typeof filteredData.avatar === 'string') {
                // Eğer zaten bizim CDN linkimiz ise tekrar yüklemeye gerek yok (isteğe bağlı kontrol)
                const isAlreadyBunny = filteredData.avatar.includes('b-cdn.net');

                if (!isAlreadyBunny) {
                    // Linki indir, BunnyCDN'e yükle, yeni linki al
                    const cdnUrl = await bunnyUtils.uploadFromUrl(filteredData.avatar, 'avatars');
                    filteredData.avatar = cdnUrl;
                }
            }
        }
        // 3. Repository Çağrısı
        let updatedUser;
        try {
            updatedUser = await userRepository.update(userId, filteredData);
        } catch (error) {
            console.error("❌ [HATA] User Update DB Hatası:", error);
            throw new AppError('error.database_error', 500);
        }

        // 4. Dönüş Verisini Formatla (Interests string -> array)
        return {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            level: updatedUser.level,
            dailyGoal: updatedUser.dailyGoal,
            learnLanguage: updatedUser.learnLanguage,
            avatar: updatedUser.avatar,
            wordPracticeProgress: updatedUser.wordPracticeProgress,
            quickReviewProgress: updatedUser.quickReviewProgress,
            readingTestProgress: updatedUser.readingTestProgress,
            dailyTestProgress: updatedUser.dailyTestProgress,
            totalProgress: updatedUser.totalProgress,
            isAnsweredQuestions: true,
            interests: updatedUser.interests ? JSON.parse(updatedUser.interests) : [],
            isPremium: updatedUser.isPremium
        };
    }

    async updatePremiumStatus(userId, isPremium) {
        // Doğrudan Repository'i çağırarak isPremium alanını güncelliyoruz.
        // updateProfile metodundaki 'allowedFields' filtresine takılmamış oluyor.
        const updatedUser = await userRepository.update(userId, {
            isPremium: isPremium
        });

        return {
            id: updatedUser.id,
            isPremium: updatedUser.isPremium
        };
    }
    async deleteAccount(userId) {
        // 1. Kullanıcıyı ve Sosyal Hesaplarını Bul
        const user = await userRepository.findById(userId);

        if (!user) {
            throw new AppError('user.not_found', 404);
        }

        // 2. Apple Hesabı Bağlı mı Kontrol Et
        if (user.socialAccounts && user.socialAccounts.length > 0) {
            const appleAccount = user.socialAccounts.find(acc => acc.provider === 'apple');

            // Eğer Apple hesabı varsa ve elimizde Apple Refresh Token varsa
            // Not: Veritabanında SocialAccount tablosunda 'accessToken' veya 'refreshToken' adında bir sütun
            // tuttuğunu varsayıyorum. Apple sadece ilk girişte Refresh Token verir, bunu kaydetmiş olmalısın.
            if (appleAccount && appleAccount.refreshToken) {
                console.log("🍎 Apple Hesabı Tespit Edildi, Revoke işlemi başlatılıyor...");
                await appleUtils.revokeToken(appleAccount.refreshToken);
            }
        }

        // 3. Veritabanından Sil
        try {
            await userRepository.delete(userId);
            return true;
        } catch (error) {
            if (error.code === 'P2025') {
                throw new AppError('user.not_found', 404);
            }
            throw error;
        }
    }
    async generateAndSaveSummary(userId) {
        // 1. Kullanıcı verilerini çek (Repository'den String olarak gelir)
        const user = await userRepository.getUserForSummary(userId);

        if (!user) {
            throw new AppError('user.not_found', 404);
        }
        console.log("2. Service başladı. UserID:", userId);

        // 2. PARSE İŞLEMİ (String -> Array)
        // savedWords veritabanında '["apple", "run"]' şeklinde string duruyor.
        let knownWordsList = [];
        try {
            if (user.savedWords) {
                // Eğer veritabanında zaten array gelirse parse etme, string ise parse et
                knownWordsList = typeof user.savedWords === 'string'
                    ? JSON.parse(user.savedWords)
                    : user.savedWords;
            }
        } catch (e) {
            console.error("SavedWords parse hatası:", e);
            knownWordsList = [];
        }

        // interests için de aynısı
        let interestsList = [];
        try {
            if (user.interests) {
                interestsList = typeof user.interests === 'string'
                    ? JSON.parse(user.interests)
                    : user.interests;
            }
        } catch (e) {
            console.error("Interests parse hatası:", e);
            interestsList = [];
        }

        // 3. n8n Payload Hazırla
        const payload = {
            dailyGoal: user.dailyGoal,
            level: user.level,
            learnLanguage: user.learnLanguage,
            interests: interestsList, // Artık temiz bir Array
            knownWords: knownWordsList // Artık temiz bir Array
        };

        console.log("3. n8n'e gönderilecek Payload:", payload);

        // 4. n8n İsteği
        let summaryResponse;
        try {
            const response = await axios.post(process.env.N8N_SUMMARY_WEBHOOK, payload);
            console.log("3.1. n8n Ham Cevap:", response.data);

            // n8n genelde { "user_summary": "..." } veya { "output": "..." } döner.
            // Workflow'una göre burayı ayarlaman gerekebilir.
            const data = response.data;

            if (typeof data === 'string') {
                summaryResponse = data;
            } else if (data.user_summary) {
                summaryResponse = data.user_summary;
            } else if (data.output) {
                summaryResponse = data.output;
            } else {
                // n8n bazen direkt array içinde obje döner: [{ "user_summary": "..." }]
                summaryResponse = Array.isArray(data) && data[0] ? data[0].user_summary : JSON.stringify(data);
            }

        } catch (error) {
            console.error("❌ [HATA] n8n Bağlantı Hatası:", error.message);
            // Hata olsa bile kullanıcı akışını bozmamak için null dönebilir veya hata fırlatabilirsin.
            throw new AppError('error.external_service_error', 502);
        }

        // 5. Özeti Veritabanına Kaydet
        // Şemanda `profileSummary` alanı var, oraya kaydediyoruz.
        await userRepository.update(userId, {
            profileSummary: typeof summaryResponse === 'string' ? summaryResponse : JSON.stringify(summaryResponse)
        });

        return summaryResponse;
    }
    async getUserProfile(userId) {
        // Repository'deki findById metodu zaten tüm bilgileri (wordPracticeProgress dahil) getiriyor.
        const user = await userRepository.findById(userId);
        return user;
    }
    async updateLocalProgress(userId, progressData) {
        const { quickReviewProgress, readingTestProgress, dailyTestProgress, totalProgress } = progressData;
        console.log(progressData.totalProgress);

        // Veritabanında güncellenecek objeyi hazırla
        const updatePayload = {};

        // Değerler geldiyse payload'a ekle (Sıfır gelme ihtimaline karşı undefined kontrolü yapıyoruz)
        if (quickReviewProgress !== undefined) updatePayload.quickReviewProgress = quickReviewProgress;
        if (readingTestProgress !== undefined) updatePayload.readingTestProgress = readingTestProgress;
        if (dailyTestProgress !== undefined) updatePayload.dailyTestProgress = dailyTestProgress;
        if (totalProgress !== undefined) updatePayload.totalProgress = totalProgress;

        try {
            const updatedUser = await userRepository.update(userId, updatePayload);
            return updatedUser;
        } catch (error) {
            console.error("❌ [HATA] Progress Sync DB Hatası:", error);
            throw new AppError('error.database_error', 500);
        }
    }
}

module.exports = new UserService();