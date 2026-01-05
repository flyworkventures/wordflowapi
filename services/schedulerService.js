// services/scheduler.service.js
require('dotenv').config();
const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const moment = require('moment-timezone'); // 🔥 Moment aktif
const NOTIFICATION_RULES = require('../utils/constants/notificationMessages');
const NotificationService = require('./notificationService');

const prisma = new PrismaClient();

// Varsayılan Zaman Dilimi (Senin için GMT+3)
const DEFAULT_TIMEZONE = 'Europe/Istanbul';
let isScanning = false;
let isInitialized = false;

const SchedulerService = {
    init: () => {
        if (isInitialized) {
            console.warn(`⚠️ [UYARI] SchedulerService zaten çalışıyor! (PID: ${process.pid})`);
            console.warn(`⚠️ [UYARI] init() fonksiyonunu birden fazla yerde çağırmış olabilirsiniz.`);
            return;
        }
        isInitialized = true;
        console.log(`✅ [BAŞLATILDI] Scheduler Servisi Devreye Girdi. (PID: ${process.pid})`);
        // Her dakika çalışır (* * * * *)
        // Eğer saat başı çalışsın istersen: '0 * * * *' yapabilirsin.
        cron.schedule('0 * * * *', async () => {
            if (isScanning) {
                console.log('⚠️ [CRON] Önceki tarama henüz bitmedi. Bu dakika atlanıyor.');
                return;
            }

            // Kapıyı kilitle
            isScanning = true;
            const localTime = moment().tz(DEFAULT_TIMEZONE).format('HH:mm:ss');
            console.log('\n⏰ ------------------------------------------------');
            console.log(`⏰ [CRON] Bildirim Taraması Başladı (TR Saati): ${localTime}`);
            try {
                await checkAndSendNotifications();
            } catch (error) {
                console.error("❌ [CRON] Kritik Hata:", error);
            } finally {
                // İşlem bitince (başarılı veya hatalı) kapıyı aç
                isScanning = false;
                console.log('🏁 [CRON] Tarama tamamlandı.');
            }
        });
    }
};

async function checkAndSendNotifications() {
    const now = new Date(); // DB sorgusu için UTC kullanmak en sağlıklısıdır

    // TEST: 1 dakika öncesi (Test için kısa tutuyoruz, prod için 2*60*60*1000 yaparsın)
    const timeThreshold = new Date(now.getTime() - 2 * 60*60 * 1000);

    const users = await prisma.user.findMany({
        where: {
            oneSignalId: { not: null },
            lastActivityAt: {
                lt: timeThreshold
            }
        }
    });

    console.log(`🔎 [TARAMA] Kriterlere uyan kullanıcı sayısı: ${users.length}`);

    if (users.length === 0) {
        // console.log('😴 Bildirim atılacak kimse yok.');
        return;
    }

    for (const user of users) {
        try {
            await processUser(user, now);
        } catch (e) {
            console.error(`❌ [HATA] User ID ${user.id} işlenirken hata:`, e);
        }
    }
}

async function processUser(user, now) {
    // Kullanıcının Timezone'u yoksa Varsayılan (İstanbul) al
    const userTz = user.timezone || DEFAULT_TIMEZONE;

    // Anlık saati kullanıcının bölgesine çevir
    const userLocalTime = moment(now).tz(userTz);
    const currentHour = userLocalTime.hour();

    console.log(`\n👤 [USER] ID: ${user.id} | İsim: ${user.name || 'Guest'} | Bölge: ${userTz}`);
    console.log(`   🕒 Yerel Saat: ${userLocalTime.format('HH:mm')} (${userTz})`);

    // 🔥 GECE MODU KONTROLÜ (GMT+3'e göre çalışır)
    // Gece 23:00 ile Sabah 09:00 arası rahatsız etme
    if (currentHour >= 23 || currentHour < 9) {
        console.log(`   zzz [GECE MODU] Saat ${currentHour} olduğu için bildirim atlanıyor.`);
        return;
    }

    // Dakika hesabı (Matematiksel fark UTC ile aynıdır, değişmez)
    const minutesInactive = Math.floor((now - user.lastActivityAt) / 1000 / 60);
    console.log(`   ⏳ İnaktif Süre: ${minutesInactive} dakika`);

    let targetLevel = null;

    // Kriterler (Test için kısaltılmış süreler kullanıyorsun sanırım)
    // Eğer Production ise: 1440 (24s), 480 (8s), 240 (4s), 120 (2s)
    if (minutesInactive >= 1440) {
        targetLevel = 'HOURS_24';
    } else if (minutesInactive >= 480) {
        targetLevel = 'HOURS_8';
    } else if (minutesInactive >= 240) {
        targetLevel = 'HOURS_4';
    } else if (minutesInactive >= 120) { // Test için 1 dk = HOURS_2 kabul ettik
        targetLevel = 'HOURS_2';
    }

    console.log(`   🎯 Hedef: ${targetLevel || 'YOK'} | Mevcut: ${user.lastNotificationLevel || 'YOK'}`);

    if (!targetLevel) return;

    // Aynı seviye bildirimi daha önce attıysak tekrar atma
    if (user.lastNotificationLevel === targetLevel) {
        console.log(`   ⏭️ [ATLA] Bu seviye (${targetLevel}) zaten gönderilmiş.`);
        return;
    }

    const lang = ['tr', 'en', 'de'].includes(user.language) ? user.language : 'en';

    if (!NOTIFICATION_RULES[targetLevel]) {
        console.error(`   ❌ KURAL HATASI: ${targetLevel} için mesaj listesi bulunamadı.`);
        return;
    }

    const messages = NOTIFICATION_RULES[targetLevel][lang];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    console.log(`   📩 Gönderilecek: "${randomMessage}"`);

    // Bildirimi Gönder
    const success = await NotificationService.sendToUser(user.oneSignalId, randomMessage, user.language);

    if (success) {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastNotificationLevel: targetLevel,
                lastNotificationSentAt: new Date() // DB'ye UTC kaydetmek en iyisidir
            }
        });
        await prisma.notification.create({
            data: {
                userId: user.id,
                title: "Lingola Words",
                body: randomMessage,
                isRead: false
            }
        });
        console.log(`   💾 DB Güncellendi: ${targetLevel} ve Bildirim Kaydedildi.`);
    }
}

module.exports = SchedulerService;