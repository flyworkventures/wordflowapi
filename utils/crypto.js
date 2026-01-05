const crypto = require('crypto');

exports.createClientDataHash = (body) => {
    // 1. Key'leri alfabetik sırala (Sıralama farkını önler)
    const sortedBody = Object.keys(body).sort().reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
    }, {});

    // 2. Boşluksuz string oluştur
    const canonicalJson = JSON.stringify(sortedBody);

    // 3. SHA-256 hash al
    return crypto.createHash('sha256').update(canonicalJson).digest('hex');
};