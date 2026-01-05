const express = require('express');
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// Listeleme
router.get('/get-all', authMiddleware.protect, notificationController.getNotifications);

// Okunmamış Sayısı
router.get('/unread-count', authMiddleware.protect, notificationController.getUnreadCount);

// Hepsini Okundu Yap
router.post('/mark-read', authMiddleware.protect, notificationController.markAllAsRead);

// 🔥 YENİ: Tümünü Sil (ID rotasından önce tanımlanmalı!)
router.delete('/clear-all', authMiddleware.protect, notificationController.deleteAllNotifications);

// 🔥 YENİ: Tek Sil
router.delete('/:id', authMiddleware.protect, notificationController.deleteNotification);

module.exports = router;