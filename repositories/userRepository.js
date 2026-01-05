
const { prisma } = require('../config/prisma'); // Prisma client import

class UserRepository {
    // Email ile kullanıcıyı ve bağlı sosyal hesaplarını bul
    async findByEmail(email) {
        return await prisma.user.findUnique({
            where: { email },
            include: { socialAccounts: true } // 🔥 ÖNEMLİ: Bağlı hesapları getirir
        });
    }

    async findById(id) {
        return await prisma.user.findUnique({
            where: { id },
            include: { socialAccounts: true }
        });
    }
    async findProgressById(userId) {
        try {
            return await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    wordPracticeProgress: true
                }
            });
        } catch (error) {
            console.error("❌ findProgressById DB Hatası:", error);
            throw error;
        }
    }

    // 🔥 YENİ METOD: Hem User hem SocialAccount tablosuna aynı anda kayıt atar
    async createWithSocial(userData, socialData) {
        return await prisma.user.create({
            data: {
                // User tablosu verileri
                email: userData.email,
                level: userData.level,
                dailyGoal: userData.dailyGoal,
                interests: userData.interests, // String formatında gelmeli
                devicePublicKey: userData.devicePublicKey,
                learnLanguage: userData.learnLanguage,
                isAnsweredQuestions: userData.isAnsweredQuestions,
                avatar: userData.avatar,
                socialAccounts: {
                    create: {
                        provider: socialData.provider,
                        providerId: socialData.providerId,
                        refreshToken: socialData.refreshToken
                    }
                }
            },
            include: { socialAccounts: true } // Oluşan veriyi geri dön
        });
    }

    // Mevcut kullanıcıya yeni bir sosyal hesap bağla
    async addSocialAccount(userId, provider, providerId) {
        return await prisma.socialAccount.create({
            data: {
                userId,
                provider,
                providerId,
                refreshToken: refreshToken
            }
        });
    }
    async updateSocialAccountToken(socialAccountId, refreshToken) {
        return await prisma.socialAccount.update({
            where: { id: socialAccountId },
            data: { refreshToken: refreshToken }
        });
    }

    async updateRefreshToken(userId, refreshToken) {
        return await prisma.user.update({
            where: { id: userId },
            data: { refreshToken }
        });
    }

    async updateDeviceKey(userId, key) {
        return await prisma.user.update({
            where: { id: userId },
            data: { devicePublicKey: key }
        });
    }

    async updateCounter(userId, counter) {
        return await prisma.user.update({
            where: { id: userId },
            data: { lastCounter: counter }
        });
    }
    async update(userId, data) {
        return await prisma.user.update({
            where: { id: userId },
            data: data
        });
    }

    async delete(userId) {
        return await prisma.$transaction([
            // 1. Önce kullanıcının bildirimlerini sil (Hata veren kısım burasıydı)
            prisma.notification.deleteMany({
                where: { userId: userId }
            }),

            // 2. Varsa Sosyal Medya hesaplarını sil
            prisma.socialAccount.deleteMany({
                where: { userId: userId }
            }),

            // 3. (Opsiyonel) Varsa Kişisel Kelimelerini sil (PersonalWords)
            // Eğer projenizde bu tablo varsa yorum satırını kaldırın:
            // prisma.personalWord.deleteMany({ where: { userId: userId } }),

            // 4. En son User'ı sil
            prisma.user.delete({
                where: { id: userId }
            })
        ]);
    }

    async findByProvider(provider, providerId) {
        // Önce SocialAccount'u bul, oradan User'a git
        const socialAccount = await prisma.socialAccount.findUnique({
            where: {
                provider_providerId: { // @@unique([provider, providerId]) constraint'i sayesinde
                    provider: provider,
                    providerId: providerId
                }
            },
            include: {
                user: {
                    include: { socialAccounts: true } // User objesini ve bağlı hesaplarını getir
                }
            }
        });

        // Eğer hesap varsa user'ı dön, yoksa null dön
        return socialAccount ? socialAccount.user : null;
    }

    async updateWordPracticeOffset(userId, newOffset) {
        return await prisma.user.update({
            where: { id: userId },
            data: { wordPracticeOffset: newOffset }
        });
    }
    async updateReadingPracticeOffset(userId, newOffset) {
        return await prisma.user.update({
            where: { id: userId },
            data: { readingPracticeOffset: newOffset }
        });
    }
    // Kullanıcının mevcut offsetini ve dil bilgilerini sadece bu işlem için getir (Performans için select)
    async findPracticeDetails(userId) {
        return await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                level: true,
                learnLanguage: true,
                wordPracticeOffset: true,
                wordPracticeProgress: true, // Bunu da ekledim, ilerleme takibi için gerekebilir
                readingPracticeOffset: true,
                // 👇 Kritik alanlar burası 👇
                isPremium: true,
                createdAt: true,
                savedWords: true
            }
        });
    }

    async getUserForSummary(userId) {
        return await prisma.user.findUnique({
            where: { id: userId },
            select: {
                level: true,
                dailyGoal: true,
                learnLanguage: true,
                interests: true,  // String (JSON)
                savedWords: true  // String (JSON) -> Şemana göre burası String
            }
        });
    }

    async findUserWithPersonalWords(userId) {
        return await prisma.user.findUnique({
            where: { id: userId },
            include: {
                personalWords: true // User modeline eklediğimiz ilişkiyi çekiyoruz
            }
        });
    }

    
}

module.exports = new UserRepository();