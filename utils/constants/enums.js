const UserEnums = {
    // Dil Seviyeleri (A1, B2 vb.)
    LEVEL: {
        A0: { key: 'A0', localeKey: 'enums.level.a0' },
        A1: { key: 'A1', localeKey: 'enums.level.a1' },
        A2: { key: 'A2', localeKey: 'enums.level.a2' },
        B1: { key: 'B1', localeKey: 'enums.level.b1' },
        B2: { key: 'B2', localeKey: 'enums.level.b2' },
        C1: { key: 'C1', localeKey: 'enums.level.c1' },
        C2: { key: 'C2', localeKey: 'enums.level.c2' }
    },
    // Yeni İlgi Alanları Listesi
    INTERESTS: {
        BASIC_INFORMATION: { key: 'basic_information', localeKey: 'enums.interests.basic_information' },
        TRAVEL: { key: 'travel', localeKey: 'enums.interests.travel' },
        WORK: { key: 'work', localeKey: 'enums.interests.work' },
        FOOD_AND_DRINK: { key: 'food_and_drink', localeKey: 'enums.interests.food_and_drink' },
        DAILY_TASKS: { key: 'daily_tasks', localeKey: 'enums.interests.daily_tasks' },
        SOCIETY: { key: 'society', localeKey: 'enums.interests.society' },
        POPULAR_WORDS: { key: 'popular_words', localeKey: 'enums.interests.popular_words' },
        CITY_TRANSPORT: { key: 'city_transport', localeKey: 'enums.interests.city_transport' },
        HOBBIES: { key: 'hobbies', localeKey: 'enums.interests.hobbies' },
        CLOTHING_AND_ACCESSORIES: { key: 'clothing_and_accessories', localeKey: 'enums.interests.clothing_and_accessories' },
        NATURE_AND_ANIMALS: { key: 'nature_and_animals', localeKey: 'enums.interests.nature_and_animals' },
        RELATIONSHIPS: { key: 'relationships', localeKey: 'enums.interests.relationships' },
        SPORT_AND_FITNESS: { key: 'sport_and_fitness', localeKey: 'enums.interests.sport_and_fitness' }
    },

    getKeys(enumObj) {
        return Object.values(enumObj).map(item => item.key);
    },
    AUTH_PROVIDER: {
        GOOGLE: 'google',
        APPLE: 'apple',
        FACEBOOK: 'facebook'
    },
    // API Yanıt Durumları
    API_STATUS: {
        SUCCESS: 'success', // Başarılı işlemler
        FAIL: 'fail',       // Kullanıcı kaynaklı hatalar (Validation vb.)
        ERROR: 'error'      // Sunucu kaynaklı kritik hatalar
    },
};

module.exports = UserEnums;