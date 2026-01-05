const { PrismaClient } = require('@prisma/client');

// Ekstra parametre göndermeden en yalın haliyle başlat
const prisma = new PrismaClient();

module.exports = {prisma};