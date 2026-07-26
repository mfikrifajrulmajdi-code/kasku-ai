// ============================================================================
// AUTOMATIC MULTI-LANGUAGE DETECTOR SERVICE (INDONESIAN & ENGLISH)
// Mendeteksi bahasa pengguna dan memberikan instruksi bahasa otomatis ke agen
// ============================================================================

const ENGLISH_KEYWORDS = [
    'hello', 'hi', 'how', 'what', 'where', 'price', 'buy', 'order', 'shoe',
    'size', 'shipping', 'cost', 'payment', 'available', 'stock', 'thanks', 'thank you'
];

/**
 * Deteksi Bahasa Pengguna (Bahasa Indonesia vs English)
 * @param {string} text - Pesan dari pelanggan
 * @returns {Object} { lang: 'en'|'id', instruction: string }
 */
function detectLanguage(text) {
    const cleanText = text.toLowerCase().trim();
    const words = cleanText.split(/\s+/);

    let enScore = 0;
    words.forEach(w => {
        if (ENGLISH_KEYWORDS.includes(w)) enScore++;
    });

    if (enScore >= 2 || (words.length <= 3 && ['hi', 'hello', 'price'].includes(cleanText))) {
        return {
            lang: 'en',
            instruction: "IMPORTANT: The customer is speaking English. Respond fluently in polite English!"
        };
    }

    return {
        lang: 'id',
        instruction: "Gunakan Bahasa Indonesia yang ramah, sopan, dan bersahabat."
    };
}

module.exports = {
    detectLanguage
};
