const jwt = require("jsonwebtoken");
const crypto = require("crypto");

class TokenUtils {
    generateAccessToken(user) {
        const jti = crypto.randomUUID(); // Node 16+ (18+ kesin)
        return jwt.sign(
            { id: user.id, email: user.email, jti, typ: "access" },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "7d" }
        );
    }

    generateRefreshToken(user) {
        const jti = crypto.randomUUID();
        return jwt.sign(
            { id: user.id, jti, typ: "refresh" },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "30d" }
        );
    }

    verifyRefreshToken(token) {
        try {
            const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
            if (payload?.typ !== "refresh") return null; // küçük güvenlik kontrolü
            return payload;
        } catch {
            return null;
        }
    }
}

module.exports = new TokenUtils();
