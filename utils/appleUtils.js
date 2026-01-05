const jwt = require('jsonwebtoken');
const axios = require('axios');
const qs = require('qs'); // Query string oluşturmak için (npm install qs)

class AppleUtils {

    // ... generateClientSecret fonksiyonun (önceki cevaptaki gibi kalacak) ...
    generateClientSecret() {
        const privateKey = process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');

        const headers = {
            kid: process.env.APPLE_KEY_ID,
            alg: 'ES256'
        };

        const claims = {
            iss: process.env.APPLE_TEAM_ID,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (86400 * 180),
            aud: 'https://appleid.apple.com',
            sub: process.env.APPLE_BUNDLE_ID
        };

        return jwt.sign(claims, privateKey, { algorithm: 'ES256', header: headers });
    }

    // ... revokeToken fonksiyonun (önceki cevaptaki gibi kalacak) ...

    /**
     * Flutter'dan gelen 'authorizationCode'u kullanarak Apple'dan Refresh Token alır.
     */
    async getRefreshTokenFromCode(authorizationCode) {
        if (!authorizationCode) return null;

        try {
            const clientSecret = this.generateClientSecret();

            const requestBody = {
                client_id: process.env.APPLE_BUNDLE_ID,
                client_secret: clientSecret,
                code: authorizationCode,
                grant_type: 'authorization_code',
                // redirect_uri genellikle mobil uygulamalar için gerekmez veya boş bırakılır,
                // hata alırsan bundle id'ni veya tanımlı callback url'ini dene.
            };

            const response = await axios.post(
                'https://appleid.apple.com/auth/token',
                qs.stringify(requestBody),
                { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
            );

            // response.data içinde: access_token, token_type, expires_in, refresh_token, id_token gelir.
            console.log("🍏 Apple Refresh Token Başarıyla Alındı.");
            return response.data.refresh_token;

        } catch (error) {
            console.error("❌ Apple Token Exchange Hatası:", error.response?.data || error.message);
            // Hata durumunda null dönüyoruz, giriş işlemi bozulmasın ama token kaydedilemesin.
            return null;
        }
    }
}

module.exports = new AppleUtils();