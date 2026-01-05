// middleware/activityTracker.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const activityTracker = async (req, res, next) => {
    if (req.user && req.user.id) {
        // Arka planda çalışsın, response süresini etkilemesin
        prisma.user.update({
            where: { id: req.user.id },
            data: {
                lastActivityAt: new Date(),
                lastNotificationLevel: null // Döngüyü sıfırla, kullanıcı geri döndü!
            }
        }).catch(err => console.error('Activity update error:', err));
    }
    next();
};

module.exports = activityTracker;