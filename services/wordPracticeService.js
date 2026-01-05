const axios = require('axios');
const userRepository = require('../repositories/userRepository');
const AppError = require('../utils/errors/appError');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class WordPracticeService {
    constructor() {
        this.EXTERNAL_API_URL = process.env.EXTERNAL_WORD_API_URL;
        this.N8N_WEBHOOK_URL = process.env.N8N_WORD_PRACTICE_URL;
        this.N8N_TEST_WEBHOOK_URL = process.env.N8N_TEST_WEBHOOK;
        this.axiosInstance = axios.create({ timeout: 60000 });
        this.PRACTICE_LIMIT = 400; 
    }
    _isPremiumRequired(user) {
        // 1. Önce verinin gelip gelmediğini kontrol et
        if (!user) return true;

        console.log("🔍 PREMIUM CHECK START:", {
            id: user.id,
            isPremium: user.isPremium,
            createdAt: user.createdAt
        });

        // 2. Kullanıcı Premium ise direkt geç
        if (user.isPremium === true) {
            console.log("✅ Kullanıcı Premium. İzin verildi.");
            return false;
        }

        // 3. Tarih kontrolü (Undefined ise mecburen engelliyoruz)
        if (!user.createdAt) {
            console.error("❌ HATA: user.createdAt veritabanından çekilmedi!");
            return true; // Güvenlik için engelle
        }

        const now = new Date();
        const createdDate = new Date(user.createdAt);

        // 2 Gün = 172800000 milisaniye
        const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
        const diff = now - createdDate;

        console.log(`⏳ Hesap Yaşı: ${(diff / (1000 * 60 * 60)).toFixed(1)} saat. Sınır: 48 saat.`);

        if (diff > twoDaysInMs) {
            console.log("⛔ Süre dolmuş. Premium gerekli.");
            return true;
        }

        console.log("✅ Süre dolmamış. Deneme sürümü devam ediyor.");
        return false;
    }
    // ============================================================
    // 1. KELİME PRATİĞİ (200 Kelime Limitli & İlerleme Hesaplamalı)
    // ============================================================
    async generatePracticeSession(userId) {
        console.log(`🚀 [Practice] Kullanıcı ${userId} isteği başladı.`);

        const user = await userRepository.findPracticeDetails(userId);
        if (!user) throw new AppError('user.not_found', 404);

        // 🔥 PREMIUM KONTROLÜ 🔥
        if (this._isPremiumRequired(user)) {
            console.log(`🔒 [Practice] Kullanıcı ${userId} için premium gerekli.`);
            return [];
        }
        const randomOffset = Math.floor(Math.random() * 10) + 1;
        const limit = 10;
        const currentOffset = user.wordPracticeOffset || randomOffset;

        // 1. External API'den Listeyi Çek
        let externalData = [];
        let calculatedGoal = this.PRACTICE_LIMIT;

        try {
            const extResponse = await this.axiosInstance.get(`${this.EXTERNAL_API_URL}/${user.level}`, {
                params: { limit, offset: currentOffset, targetLang: 'tr', verbLang: 'en' },
                headers: { 'x-api-token': process.env.EXTERNAL_API_TOKEN }
            });

            externalData = extResponse.data.data;

            // --- Dinamik Hedef Hesaplama (%10 Kuralı) ---
            let apiTotalCount = 0;
            if (extResponse.data.total) apiTotalCount = extResponse.data.total;
            else if (extResponse.data.meta && extResponse.data.meta.total) apiTotalCount = extResponse.data.meta.total;

            if (apiTotalCount > 0) {
                // API toplamının %10'u ile 200 kelime limitinden hangisi küçükse hedef o olur.
                // Böylece seviyede çok az kelime varsa %10 kuralı, çok kelime varsa 200 limiti çalışır.
                const tenPercent = Math.ceil(apiTotalCount * 0.1);
                calculatedGoal = Math.min(this.PRACTICE_LIMIT, Math.max(50, tenPercent));
            }

        } catch (error) {
            console.error('❌ [Practice] External API:', error.message);
            throw new AppError('service.word_provider_error', 502);
        }

        // --- Başa Sarma Kontrolü ---
        // Kelimeler bittiyse veya 200 kelimelik (veya hesaplanan hedef) limite ulaşıldıysa sıfırla.
        if (!externalData || externalData.length === 0 || currentOffset >= calculatedGoal) {
            if (currentOffset > 0) {
                console.log(`🔄 [Practice] Hedef (${calculatedGoal}) tamamlandı, başa sarılıyor...`);
                await prisma.user.update({
                    where: { id: userId },
                    data: { wordPracticeOffset: 0, wordPracticeProgress: 100.0 }
                });
                return this.generatePracticeSession(userId);
            }
            throw new AppError('practice.no_words_in_database', 404);
        }

        // --- Cache & AI (n8n) Mantığı ---
        const targetWords = externalData.map(item => item.source.word);
        const normalizedTargetWords = targetWords.map(w => w.toLowerCase().trim());

        const existingWords = await prisma.word.findMany({
            where: { word: { in: normalizedTargetWords } }
        });

        const foundWordStrings = existingWords.map(w => w.word.toLowerCase());
        const missingWords = normalizedTargetWords.filter(w => !foundWordStrings.includes(w));
        let newDbWords = [];

        if (missingWords.length > 0) {
            try {
                const n8nResponse = await this.axiosInstance.post(this.N8N_WEBHOOK_URL, {
                    words: missingWords,
                    level: user.level
                });

                let aiCards = this._extractN8nCards(n8nResponse.data);

                for (const card of aiCards) {
                    if (card && card.word) {
                        try {
                            const saved = await prisma.word.upsert({
                                where: { word: card.word.toLowerCase() },
                                update: {},
                                create: {
                                    word: card.word.toLowerCase(),
                                    level: user.level,
                                    translate_en: card.translate_en || "",
                                    translate_tr: card.translate_tr || "",
                                    translate_de: card.translate_de || "",
                                    pronunciation_en: card.pronunciation_en || "",
                                    sentence_en: card.sentence_en || "",
                                    sentence_tr: card.sentence_tr || "",
                                    sentence_de: card.sentence_de || ""
                                }
                            });
                            newDbWords.push(saved);
                        } catch (e) { console.error(`DB Kayıt Hatası (${card.word}):`, e.message); }
                    }
                }
            } catch (error) {
                console.error('n8n Hatası:', error.message);
                if (existingWords.length === 0) throw new AppError('service.ai_generation_error', 502);
            }
        }

        const allWords = [...existingWords, ...newDbWords];

        const finalOutput = allWords.map(dbWord => {
            const originalSource = externalData.find(s => s.source.word.toLowerCase() === dbWord.word.toLowerCase());
            return {
                id: dbWord.id,
                word: dbWord.word,
                translate_en: dbWord.translate_en,
                translate_tr: dbWord.translate_tr,
                translate_de: dbWord.translate_de,
                pronunciation_en: dbWord.pronunciation_en || originalSource?.target?.pronunciation || "",
                sentence_en: dbWord.sentence_en,
                sentence_tr: dbWord.sentence_tr,
                sentence_de: dbWord.sentence_de
            };
        });

        // --- İlerlemeyi Veritabanına Yaz ---
        const nextOffset = currentOffset + externalData.length;
        let progressPercent = (nextOffset / calculatedGoal) * 100;
        if (progressPercent > 100) progressPercent = 100;

        await prisma.user.update({
            where: { id: userId },
            data: {
                wordPracticeOffset: nextOffset,
                wordPracticeProgress: parseFloat(progressPercent.toFixed(1))
            }
        });

        console.log(`✅ [Practice] ${finalOutput.length} kart. Hedef: ${calculatedGoal}, Progress: %${progressPercent.toFixed(1)}`);
        return finalOutput;
    }

    // --- Yardımcı Metot: n8n çıktısını temizle ---
    _extractN8nCards(rd) {
        if (Array.isArray(rd)) {
            return (rd.length > 0 && rd[0].cards) ? rd[0].cards : rd;
        } else if (rd && typeof rd === 'object') {
            if (rd.data && Array.isArray(rd.data)) return rd.data;
            if (rd.cards) return rd.cards;
            if (rd.data && rd.data.cards) return rd.data.cards;
        }
        return [];
    }

    // ============================================================
    // 2. KARIŞIK SEVİYE
    // ============================================================
    async generateMixedLevelSession(userId) {
        console.log(`🚀 [Mixed] Kullanıcı ${userId} karışık test.`);
        const user = await userRepository.findPracticeDetails(userId);
        if (!user) throw new AppError('user.not_found', 404);

        if (this._isPremiumRequired(user)) {
            console.log(`🔒 [Mixed] Kullanıcı ${userId} için premium gerekli.`);
            return [];
        }

        const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        const limitPerLevel = 2;

        const apiPromises = levels.map(level => {
            return this.axiosInstance.get(`${this.EXTERNAL_API_URL}/${level}`, {
                params: {
                    limit: limitPerLevel,
                    offset: Math.floor(Math.random() * 50),
                    targetLang: 'tr',
                    verbLang: 'en'
                },
                headers: { 'x-api-token': process.env.EXTERNAL_API_TOKEN }
            })
                .then(r => ({ level: level, data: r.data.data }))
                .catch(() => ({ level: level, data: [] }));
        });

        const results = await Promise.all(apiPromises);
        let allExternalWords = [];
        results.forEach(r => {
            if (r.data && r.data.length > 0) {
                allExternalWords.push(...r.data.map(i => ({ ...i, originalLevel: r.level })));
            }
        });

        if (allExternalWords.length === 0) throw new AppError('practice.no_words_found', 404);

        const targetWords = allExternalWords.map(item => item.source.word);
        const normalizedTargetWords = targetWords.map(w => w.toLowerCase().trim());

        const existingWords = await prisma.word.findMany({
            where: { word: { in: normalizedTargetWords } }
        });

        const foundWordStrings = existingWords.map(w => w.word.toLowerCase());
        const missingWords = normalizedTargetWords.filter(w => !foundWordStrings.includes(w));
        let newDbWords = [];

        if (missingWords.length > 0) {
            try {
                const n8nResponse = await this.axiosInstance.post(this.N8N_WEBHOOK_URL, {
                    words: missingWords,
                    level: 'mixed'
                });

                let aiCards = this._extractN8nCards(n8nResponse.data);

                for (const card of aiCards) {
                    if (card && card.word) {
                        try {
                            const sourceItem = allExternalWords.find(s => s.source.word.toLowerCase() === card.word.toLowerCase());
                            const correctLevel = sourceItem ? sourceItem.originalLevel : 'Mixed';

                            const saved = await prisma.word.upsert({
                                where: { word: card.word.toLowerCase() },
                                update: {},
                                create: {
                                    word: card.word.toLowerCase(),
                                    level: correctLevel,
                                    translate_en: card.translate_en || "",
                                    translate_tr: card.translate_tr || "",
                                    translate_de: card.translate_de || "",
                                    pronunciation_en: card.pronunciation_en || "",
                                    sentence_en: card.sentence_en || "",
                                    sentence_tr: card.sentence_tr || "",
                                    sentence_de: card.sentence_de || ""
                                }
                            });
                            newDbWords.push(saved);
                        } catch (e) { console.error(`DB Kayıt Hatası (${card.word}):`, e.message); }
                    }
                }
            } catch (error) {
                console.error('n8n Hatası (Mixed):', error.message);
                if (existingWords.length === 0) throw new AppError('service.ai_generation_error', 502);
            }
        }

        const allWords = [...existingWords, ...newDbWords];

        return allWords.map(dbWord => {
            const originalSource = allExternalWords.find(s => s.source.word.toLowerCase() === dbWord.word.toLowerCase());
            return {
                id: dbWord.id,
                word: dbWord.word,
                level: originalSource?.originalLevel || dbWord.level,
                translate_en: dbWord.translate_en,
                translate_tr: dbWord.translate_tr,
                translate_de: dbWord.translate_de,
                pronunciation_en: dbWord.pronunciation_en || originalSource?.target?.pronunciation || "",
                sentence_en: dbWord.sentence_en,
                sentence_tr: dbWord.sentence_tr,
                sentence_de: dbWord.sentence_de
            };
        });
    }

    // ============================================================
    // 3. OKUMA PRATİĞİ
    // ============================================================
    async generateReadingSession(userId) {
        console.log(`🚀 [Reading] Kullanıcı ${userId} okuma isteği.`);
        const user = await userRepository.findPracticeDetails(userId);
        const randomOffset = Math.floor(Math.random() * 10) + 1;
        const limit = 20;
        const currentOffset = user.readingPracticeOffset || randomOffset;

        let externalData = [];
        try {
            const extResponse = await this.axiosInstance.get(`${this.EXTERNAL_API_URL}/${user.level}`, {
                params: { limit, offset: currentOffset, targetLang: 'tr', verbLang: 'en' },
                headers: { 'x-api-token': process.env.EXTERNAL_API_TOKEN }
            });
            externalData = extResponse.data.data;
        } catch (error) {
            console.error('❌ [Reading] External API:', error.message);
            throw new AppError('service.word_provider_error', 502);
        }

        if (!externalData || externalData.length === 0) {
            if (currentOffset > 0) {
                await userRepository.updateReadingPracticeOffset(userId, 0);
                return this.generateReadingSession(userId);
            }
            throw new AppError('practice.no_words_in_database', 404);
        }

        const targetWords = externalData.map(item => item.source.word);
        const normalizedTargetWords = targetWords.map(w => w.toLowerCase().trim());

        const existingWords = await prisma.word.findMany({
            where: { word: { in: normalizedTargetWords } }
        });

        const foundWordStrings = existingWords.map(w => w.word.toLowerCase());
        const missingWords = normalizedTargetWords.filter(w => !foundWordStrings.includes(w));
        let newDbWords = [];

        if (missingWords.length > 0) {
            try {
                const n8nResponse = await this.axiosInstance.post(this.N8N_WEBHOOK_URL, {
                    words: missingWords,
                    level: user.level
                });

                let aiCards = this._extractN8nCards(n8nResponse.data);

                for (const card of aiCards) {
                    if (card && card.word) {
                        try {
                            const saved = await prisma.word.upsert({
                                where: { word: card.word.toLowerCase() },
                                update: {},
                                create: {
                                    word: card.word.toLowerCase(),
                                    level: user.level,
                                    translate_en: card.translate_en || "",
                                    translate_tr: card.translate_tr || "",
                                    translate_de: card.translate_de || "",
                                    pronunciation_en: card.pronunciation_en || "",
                                    sentence_en: card.sentence_en || "",
                                    sentence_tr: card.sentence_tr || "",
                                    sentence_de: card.sentence_de || ""
                                }
                            });
                            newDbWords.push(saved);
                        } catch (e) { console.error(`DB Kayıt Hatası (${card.word}):`, e.message); }
                    }
                }
            } catch (error) {
                console.error('n8n Hatası (Reading):', error.message);
                if (existingWords.length === 0) throw new AppError('service.ai_generation_error', 502);
            }
        }

        const allWords = [...existingWords, ...newDbWords];

        await userRepository.updateReadingPracticeOffset(userId, currentOffset + limit);

        return allWords.map(dbWord => {
            const originalSource = externalData.find(s => s.source.word.toLowerCase() === dbWord.word.toLowerCase());
            return {
                id: dbWord.id,
                word: dbWord.word,
                translate_en: dbWord.translate_en,
                translate_tr: dbWord.translate_tr,
                translate_de: dbWord.translate_de,
                pronunciation_en: dbWord.pronunciation_en || originalSource?.target?.pronunciation || "",
                sentence_en: dbWord.sentence_en,
                sentence_tr: dbWord.sentence_tr,
                sentence_de: dbWord.sentence_de
            };
        });
    }

    // ============================================================
    // 4. TEST OLUŞTURMA
    // ============================================================
    async syncAndGenerateTestSession(userId, wordList) {
        if (!wordList || !Array.isArray(wordList) || wordList.length === 0) {
            throw new AppError('practice.no_words_provided', 400);
        }



        // 1. Kullanıcının kelimelerini güncelle
        const user = await prisma.user.update({
            where: { id: userId },
            data: { savedWords: JSON.stringify(wordList) },
            select: { level: true }
        });

        const selectedWords = [...wordList].sort(() => 0.5 - Math.random()).slice(0, 8);
        const normalizedWords = selectedWords.map(w => w.toLowerCase().trim());

        // 2. ÖNCE VERİTABANINA BAK
        const existingQuizzes = await prisma.quiz.findMany({
            where: { word: { in: normalizedWords } }
        });

        const foundWords = existingQuizzes.map(q => q.word.toLowerCase());
        const missingWords = normalizedWords.filter(w => !foundWords.includes(w));

        let finalQuizzes = [...existingQuizzes.map(q => ({
            ...q,
            options_en: JSON.parse(q.options_en),
            options_tr: JSON.parse(q.options_tr),
            options_de: JSON.parse(q.options_de)
        }))];

        // 3. EKSİK VARSA n8n'E GİT
        if (missingWords.length > 0) {
            try {
                console.log(`📡 [Test] ${missingWords.length} kelime DB'de yok, n8n çağrılıyor...`);
                const n8nResponse = await this.axiosInstance.post(this.N8N_TEST_WEBHOOK_URL, {
                    words: missingWords,
                    level: user.level || "B1"
                });

                const newQuizzesFromAi = this._extractN8nCards(n8nResponse.data); // Aynı helper'ı kullanabiliriz
                console.error("❌ n8n geçersiz format döndü:", n8nResponse.data);

                for (const quiz of newQuizzesFromAi) {
                    if (quiz && quiz.word) {
                        const savedQuiz = await prisma.quiz.create({
                            data: {
                                word: quiz.word.toLowerCase(),
                                correct_answer: quiz.correct_answer,
                                question_en: quiz.question_en,
                                options_en: JSON.stringify(quiz.options_en),
                                question_tr: quiz.question_tr,
                                options_tr: JSON.stringify(quiz.options_tr),
                                question_de: quiz.question_de,
                                options_de: JSON.stringify(quiz.options_de),
                            }
                        });
                        finalQuizzes.push({
                            ...savedQuiz,
                            options_en: JSON.parse(savedQuiz.options_en),
                            options_tr: JSON.parse(savedQuiz.options_tr),
                            options_de: JSON.parse(savedQuiz.options_de)
                        });
                    }
                }
            } catch (error) {
                console.error('❌ [Test] n8n Hatası:', error.message);
                // Eğer bazı sorular DB'de varsa hata verme, olanları dön
                if (finalQuizzes.length === 0) throw new AppError('service.ai_test_generation_error', 502);
            }
        }

        // Karıştır ve 10 tane dön
        return finalQuizzes.sort(() => 0.5 - Math.random()).slice(0, 10);
    }
}

module.exports = new WordPracticeService();