// ============================================================================
// SPINTAX PARSER ENGINE — Generator Variasi Pesan Acak (Anti-Ban)
// Memproses format {Halo|Hai|Selamat Pagi} {Kak|Bro|Sist} menjadi variasi acak
// ============================================================================

/**
 * Memproses string bertingkat Spintax secara acak
 * Contoh input: "{Halo|Hai|Selamat Pagi} {Kak|Bro}, promo {20%|spesial} untukmu!"
 * Contoh output: "Hai Kak, promo 20% untukmu!"
 */
function parseSpintax(text) {
    if (!text || typeof text !== 'string') return '';

    // Regex untuk mencocokkan pola {pilihan1|pilihan2|pilihan3}
    const spintaxRegex = /\{([^{}]+)\}/g;

    let result = text;
    while (spintaxRegex.test(result)) {
        result = result.replace(spintaxRegex, (match, choicesStr) => {
            const choices = choicesStr.split('|');
            const randomIndex = Math.floor(Math.random() * choices.length);
            return choices[randomIndex];
        });
    }

    return result;
}

/**
 * Menghasilkan beberapa contoh variasi pesan Spintax untuk preview di Frontend UI
 * @param {string} text 
 * @param {number} count 
 */
function generateVariationsPreview(text, count = 3) {
    const variations = new Set();
    // Coba max 20 kali untuk mendapatkan `count` sampel yang berbeda
    let attempts = 0;
    while (variations.size < count && attempts < 20) {
        variations.add(parseSpintax(text));
        attempts++;
    }
    return Array.from(variations);
}

module.exports = {
    parseSpintax,
    generateVariationsPreview
};
