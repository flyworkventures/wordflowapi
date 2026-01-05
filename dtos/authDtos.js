const { z } = require('zod');
const UserEnums = require('../utils/constants/enums');

const levelKeys = UserEnums.getKeys(UserEnums.LEVEL);
const interestKeys = UserEnums.getKeys(UserEnums.INTERESTS);

const RegisterDto = z.object({
    email: z.string().email().optional(), // Sosyal ağ bazen email vermezse diye opsiyonel olabilir, ama logic'te zorunlu tutuyoruz.
    provider: z.enum(['google', 'apple', 'facebook']),
    idToken: z.string(), // Google/Apple için JWT, Facebook için Access Token

    // Kullanıcı tercihleri
    level: z.enum(levelKeys),
    interests: z.array(z.string()), // DTO'da Array bekliyoruz
    dailyGoal: z.number().default(20),
    devicePublicKey: z.string().optional()
});

// Login için de providerId'yi opsiyonel yapabilirsin (idToken yetecektir)
const LoginDto = z.object({
    provider: z.nativeEnum(UserEnums.AUTH_PROVIDER),
    idToken: z.string()
});

module.exports = { RegisterDto, LoginDto };