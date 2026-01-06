const { prisma } = require('../config/prisma');

// GET /api/notifications
exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await prisma.notification.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        res.json({
            data: notifications,
            success: true
        });
        
    } catch (error) {
        res.status(500).json({ error: 'Bildirimler getirilemedi.' });
    }
};

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
    console.log(`Gelen UserID: ${req.user.id} (Tipi: ${typeof req.user.id})`);
    try {
        const count = await prisma.notification.count({
            where: {
                userId: req.user.id,
                isRead: false
            }
        });
        console.log(`Bulunan Okunmamış Sayısı: ${count}`);
        res.json({
            data: {
                unreadCount: count
            },
            success: true // BaseResponse genelde bunu da sever
        });
    } catch (error) {
        res.status(500).json({ error: 'Sayım hatası' });
    }
};

// POST /api/notifications/mark-read
exports.markAllAsRead = async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: {
                userId: req.user.id,
                isRead: false
            },
            data: { isRead: true }
        });
        res.json({ status: 'success' });
    } catch (error) {
        res.status(500).json({ error: 'Güncelleme hatası' });
    }
};

// 🔥 YENİ: Tek bir bildirimi sil
// DELETE /api/notifications/:id
exports.deleteNotification = async (req, res) => {
    const { id } = req.params;
    try {
        // Bildirimin bu kullanıcıya ait olduğundan emin olarak siliyoruz
        await prisma.notification.deleteMany({
            where: {
                id: parseInt(id), // ID integer ise parseInt kullan, string ise direkt id yaz
                userId: req.user.id
            }
        });
        res.json({ status: 'deleted', id: id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Silme işlemi başarısız' });
    }
};

// 🔥 YENİ: Tüm bildirimleri temizle
// DELETE /api/notifications/clear-all
exports.deleteAllNotifications = async (req, res) => {
    try {
        await prisma.notification.deleteMany({
            where: {
                userId: req.user.id
            }
        });
        res.json({ status: 'all_deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Temizleme başarısız' });
    }
};