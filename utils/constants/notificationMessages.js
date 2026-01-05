// constants/notificationMessages.js

const NOTIFICATION_RULES = {
    // 2. Saat - Samimi / Yumuşak
    HOURS_2: {
        tr: ["Kısa bir ara verdin.", "Bir kelime kadar zamanın var.", "Buradayız.", "Mini tekrar yapabilirsin.", "Akış kısa süre durdu."],
        en: ["You took a short break.", "Time for one word.", "We are here.", "Quick review ready.", "Flow paused briefly."],
        de: ["Kurze Pause gemacht.", "Zeit für ein Wort.", "Wir sind hier.", "Mini-Wiederholung bereit.", "Fluss kurz angehalten."]
    },
    // 4. Saat - Merak Uyandıran
    HOURS_4: {
        tr: ["Bugün bir kelime eksik kaldı 👀", "Yeni bir kelime seni bekliyor olabilir.", "Tekrar edilmemiş bir kelime var.", "Bugünkü akış yarım.", "Bir anlam kaçırılıyor olabilir."],
        en: ["One word missing today 👀", "A new word might be waiting.", "An unreviewed word exists.", "Today's flow is half.", "Might be missing a meaning."],
        de: ["Ein Wort fehlt heute 👀", "Ein neues Wort wartet vielleicht.", "Ein ungesehenes Wort da.", "Der heutige Fluss ist halb.", "Bedeutung könnte fehlen."]
    },
    // 8. Saat - Motive Eden
    HOURS_8: {
        tr: ["Az da olsa ilerleme sayılır.", "Bir kelime bile yeter.", "Bugün durmak sorun değil.", "Hazır olduğunda devam edebilirsin.", "Kelime öğrenmek tekrar ister."],
        en: ["Progress is progress.", "Even one word is enough.", "Stopping today is fine.", "Continue when ready.", "Learning needs repetition."],
        de: ["Fortschritt ist Fortschritt.", "Ein Wort reicht.", "Heute stoppen ist okay.", "Weiter, wenn bereit.", "Lernen braucht Wiederholung."]
    },
    // 24. Saat - Hâlâ Buradayız
    HOURS_24: {
        tr: ["Bir gün geçti. Akış burada.", "Kaldığın yer duruyor.", "Ara verdin, sorun değil.", "Ne zaman istersen devam.", "Kelimeler bekliyor."],
        en: ["One day passed. Flow is here.", "Where you left stays.", "Took a break, no problem.", "Continue whenever.", "Words are waiting."],
        de: ["Ein Tag vorbei. Fluss ist hier.", "Wo du warst, bleibt.", "Pause gemacht, kein Problem.", "Weiter wann immer.", "Wörter warten."]
    },
    // 🌙 Gece Modu (Özel Kural: Tek cümle, nokta ile biten)
    NIGHT_MODE: {
        tr: ["Yarın devam ederiz.", "Akış beklemede.", "Dinlenme zamanı.", "Kelimeler uyuyor."],
        en: ["Continue tomorrow.", "Flow is waiting.", "Time to rest.", "Words are sleeping."],
        de: ["Morgen geht es weiter.", "Fluss wartet.", "Zeit zum Ausruhen.", "Wörter schlafen."]
    }
};

module.exports = NOTIFICATION_RULES;