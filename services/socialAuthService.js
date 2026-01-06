const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const axios = require('axios');

class SocialAuthService {
    constructor() {
        this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        this.appleClient = jwksClient({
            jwksUri: 'https://appleid.apple.com/auth/keys',
            cache: true,
            rateLimit: true
        });
    }
    async verifyToken(token, provider) {
        console.log("✅ Provider:", provider);
        try {
            switch (provider) {
                case 'google': return await this._verifyGoogle(token);
                case 'apple': return await this._verifyApple(token);
                case 'facebook': return await this._verifyFacebook(token);
                default: throw new Error('Unsupported provider');
            }
        } catch (error) {
            console.error(`Social Auth Error (${provider}):`, error.message);
            throw new Error('auth.social_verification_failed');
        }
    }

    async _verifyGoogle(token) {
        const ticket = await this.googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        // Payload null gelirse hata fırlat (Defensive Programming)
        if (!payload) throw new Error("Google Payload Empty");

        console.log("✅ Google Token Geçerli. Email:", payload.email);

        return {
            email: payload.email,
            providerId: payload.sub,
            name: payload.name || payload.given_name || "Guest",
            avatar: payload.picture || null, // Key: avatar
        };
    }

    async _verifyApple(token) {
        // 1. Token'ı decode et (Header'daki kid'i almak için)
        const decodedToken = jwt.decode(token, { complete: true });
        if (!decodedToken) throw new Error('Invalid Apple Token Structure');

        // 2. Apple'dan Public Key al
        const key = await this.appleClient.getSigningKey(decodedToken.header.kid);
        const signingKey = key.getPublicKey();

        // 3. Token'ı doğrula
        const verified = jwt.verify(token, signingKey, {
            issuer: 'https://appleid.apple.com',
            audience: process.env.APPLE_BUNDLE_ID, // .env dosyasındaki Bundle ID
            algorithms: ['RS256']
        });

        // 4. İsim bilgisini çıkar (Apple sadece ilk login'de gönderir)
        let appleName = null;
        
        console.log("🍏 [Apple] Token içeriği kontrol ediliyor...");
        console.log("   - verified.email:", verified.email);
        console.log("   - verified.name:", verified.name);
        console.log("   - verified keys:", Object.keys(verified));
        
        // Apple token'ında isim bilgisi farklı formatlarda gelebilir
        if (verified.name) {
            // Eğer name bir obje ise (firstName, lastName)
            if (typeof verified.name === 'object') {
                const firstName = verified.name.firstName || '';
                const lastName = verified.name.lastName || '';
                appleName = `${firstName} ${lastName}`.trim() || null;
                console.log("   ✅ Apple isim bulundu (object):", appleName);
            } else if (typeof verified.name === 'string') {
                // Direkt string olarak gelmişse
                appleName = verified.name;
                console.log("   ✅ Apple isim bulundu (string):", appleName);
            }
        } else {
            console.log("   ⚠️ Apple token'ında isim bilgisi yok (normal, sadece ilk login'de gelir)");
        }

        // 4. Return Data
        return {
            email: verified.email, // Private relay email olsa bile buradadır
            providerId: verified.sub,
            name: appleName, // İsim varsa döndür, yoksa null
            avatar: null
        };
    }

    async _verifyFacebook(token) {
        const accessToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
        const debugTokenUrl = `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${accessToken}`;

        const debugRes = await axios.get(debugTokenUrl);
        const data = debugRes.data.data;

        if (!data.is_valid) throw new Error('Geçersiz Facebook Token');
        if (String(data.app_id) !== String(process.env.FACEBOOK_APP_ID)) throw new Error('App ID Uyuşmazlığı');

        const userUrl = `https://graph.facebook.com/me?fields=id,email,name,picture.height(500)&access_token=${token}`;
        const userRes = await axios.get(userUrl);

        return {
            email: userRes.data.email,
            providerId: userRes.data.id,
            name: userRes.data.name,
            avatar: userRes.data.picture?.data?.url || null // DÜZELTME BURADA (Key: avatar yapıldı)
        };
    }
}

module.exports = new SocialAuthService();