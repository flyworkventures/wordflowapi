// services/notification.service.js
const axios = require('axios');

// 🔥 SENİN VERDİĞİN ANAHTARLAR (Hardcoded)
const ONESIGNAL_APP_ID = "5a9ea9f6-8f24-4f33-b72b-dcc41ff45e98";
const ONESIGNAL_API_KEY = "os_v2_app_lkpkt5uperhthnzl3tcb75c6tcexbqwydraedhe5vnybrs3uid6shztjgpaxxnouxfjsysfwstqngaqi4dcpgwix4phprfzmmyqh2py";

const NotificationService = {
    /**
     * Tek bir kullanıcıya (Player ID ile) bildirim atar.
     */
    sendToUser: async (playerId, message, lang = 'en') => {
        const headings = { tr: "Lingola Words", en: "Lingola Words", de: "Lingola Words" };

        // OneSignal API Payload Yapısı
        const payload = {
            app_id: ONESIGNAL_APP_ID,
            headings: { en: headings[lang] || "Lingola Words" },
            contents: { en: message },
            include_player_ids: [playerId],
            target_channel: "push"
        };

        try {
            console.log(`   🚀 [NotificationService] Axios ile gönderiliyor... (Target: ${playerId})`);

            const response = await axios.post('https://onesignal.com/api/v1/notifications', payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${ONESIGNAL_API_KEY}`
                }
            });

            console.log(`   ✅ [NotificationService] Başarılı. ID: ${response.data.id}`);

            if (response.data.recipients === 0) {
                console.warn(`   ⚠️ [NotificationService] UYARI: OneSignal 'Başarılı' dedi ama alıcı sayısı 0! Player ID geçersiz olabilir.`);
                return false;
            }

            return true;

        } catch (e) {
            console.error("   ❌ [NotificationService] HATA:");
            if (e.response) {
                console.error(`      Status: ${e.response.status}`);
                console.error(`      Body: ${JSON.stringify(e.response.data)}`);
            } else {
                console.error(`      Error: ${e.message}`);
            }
            return false;
        }
    }
};

module.exports = NotificationService;