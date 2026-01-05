// 1. Çevre değişkenlerini en tepede yükle
require('dotenv').config();

const express = require('express');
const i18next = require('./config/i18n');
const middleware = require('i18next-http-middleware');

// 2. Rotaları ve Hata Yönetimini içeri al
const authRoutes = require('./routes/authRoutes');
const userRoutes= require ('./routes/userRoutes')
const wordRouter = require('./routes/wordRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const errorHandler = require('./middlewares/error'); // İşte o kritik middleware!
const activityTracker = require('./middlewares/activityTracker')
const schedulerService = require('./services/schedulerService');

const app = express();
app.use((req, res, next) => {
    console.log(`\n📡 [GELEN İSTEK]: ${req.method} ${req.url}`);
    console.log(`📦 [BODY]:`, JSON.stringify(req.body, null, 2));
    console.log(`🔑 [HEADERS Auth]:`, req.headers.authorization ? "Var" : "Yok");
    next(); // Akışı bozma, devam et
});
// 3. Global Middlewares
app.use(express.json()); // JSON body okumak için şart

// Çoklu Dil Desteği
app.use(middleware.handle(i18next));
app.use(activityTracker);


// 4. Rotalar (API endpoints)
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/words', wordRouter);
app.use('/api/notifications', notificationRoutes);

app.listen(3016, '0.0.0.0', () => {
    console.log(`🚀 Wordflow Backend 3016 portunda hazır!`);

    // Server ayağa kalktıktan sonra Zamanlayıcıyı başlat
    try {
        schedulerService.init();
        console.log('⏰ Cron Job (Bildirim Servisi) Başlatıldı.');
    } catch (error) {
        console.error('❌ Cron Job başlatılamadı:', error);
    }
});