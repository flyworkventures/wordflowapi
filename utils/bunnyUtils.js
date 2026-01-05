// src/utils/bunnyUtils.js
const axios = require('axios');
const crypto = require('crypto');

class BunnyUtils {
    constructor() {
        // .env dosyasından değerleri alıyoruz
        this.apiKey = process.env.BUNNY_STORAGE_API_KEY;
        this.storageZone = process.env.BUNNY_STORAGE_ZONE;
        this.endpoint = process.env.BUNNY_STORAGE_ENDPOINT; // storage.bunnycdn.com
        this.pullZone = process.env.BUNNY_PULL_ZONE_URL;    // https://wordflow.b-cdn.net
    }

    /**
     * URL'den resmi indirir ve BunnyCDN'e yükler.
     * @param {string} imageUrl - Kaynak resim URL'i (Google/Facebook vb.)
     * @param {string} folder - Hedef klasör (örn: 'avatars')
     * @returns {Promise<string>} - Yüklenen resmin CDN URL'i veya hata durumunda orijinal URL
     */
    async uploadFromUrl(imageUrl, folder = 'avatars') {
        if (!imageUrl) return null;

        try {
            console.log(`📤 [BunnyCDN] Resim indiriliyor: ${imageUrl}`);

            // 1. Resmi buffer (binary) olarak indir
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer'
            });

            // 2. Dosya uzantısını ve adını belirle
            const extension = this._getExtensionFromContentType(response.headers['content-type']);
            const filename = `${crypto.randomUUID()}${extension}`;
            const uploadPath = `${folder}/${filename}`;

            // 3. BunnyCDN Storage'a yükle (PUT isteği)
            // URL Formatı: https://storage.bunnycdn.com/wordflow/avatars/dosyaadi.jpg
            const storageUrl = `https://${this.endpoint}/${this.storageZone}/${uploadPath}`;

            await axios.put(storageUrl, response.data, {
                headers: {
                    'AccessKey': this.apiKey,
                    'Content-Type': 'application/octet-stream'
                }
            });

            // 4. Public (Pull Zone) URL'ini oluştur
            const publicUrl = `${this.pullZone}/${uploadPath}`;
            console.log(`✅ [BunnyCDN] Yükleme Başarılı: ${publicUrl}`);

            return publicUrl;

        } catch (error) {
            console.error('❌ [BunnyCDN] Yükleme Hatası:', error.message);
            // Hata olursa akışı bozma, orijinal (sosyal medya) linkini geri dön
            return imageUrl;
        }
    }

    // İçerik tipine göre uzantı belirleme
    _getExtensionFromContentType(contentType) {
        if (!contentType) return '.jpg';
        if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
        if (contentType.includes('png')) return '.png';
        if (contentType.includes('webp')) return '.webp';
        return '.jpg'; // Varsayılan
    }
}

module.exports = new BunnyUtils();