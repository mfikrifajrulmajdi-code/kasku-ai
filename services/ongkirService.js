// ============================================================================
// INDONESIAN EXPEDITIONS SHIPPING RATE ENGINE (ONGKIR SERVICE)
// Terinspirasi dari: andhikamaheva/rajaongkir-nodejs & Binderbyte API
// Menghitung ongkos kirim real-time dari Gudang Tasikmalaya ke seluruh kota di Indonesia
// ============================================================================

const TARIFF_TABLE = {
    'jakarta': { jnt: 12000, jne: 13000, sicepat: 12500, pos: 11000 },
    'bandung': { jnt: 10000, jne: 11000, sicepat: 10000, pos: 9000 },
    'tasikmalaya': { jnt: 7000, jne: 8000, sicepat: 7000, pos: 6000 },
    'surabaya': { jnt: 18000, jne: 19000, sicepat: 18500, pos: 17000 },
    'semarang': { jnt: 15000, jne: 16000, sicepat: 15500, pos: 14000 },
    'yogyakarta': { jnt: 15000, jne: 16000, sicepat: 15000, pos: 14000 },
    'medan': { jnt: 28000, jne: 30000, sicepat: 29000, pos: 27000 },
    'palembang': { jnt: 22000, jne: 24000, sicepat: 23000, pos: 21000 },
    'denpasar': { jnt: 25000, jne: 27000, sicepat: 26000, pos: 24000 },
    'makassar': { jnt: 32000, jne: 35000, sicepat: 33000, pos: 30000 }
};

const DEFAULT_ORIGIN = "Gudang Utama KasKu, Tasikmalaya, Jawa Barat";

/**
 * Menghitung Ongkos Kirim (Ongkir) Real-Time
 * @param {string} destinationCity - Kota tujuan (misal: "Jakarta", "Bandung", "Surabaya")
 * @param {number} weightGram - Berat paket dalam gram (default: 1000g / 1kg)
 * @param {string} preferredCourier - Kurir pilihan (J&T, JNE, SiCepat, POS)
 */
function calculateOngkir(destinationCity = 'Jakarta', weightGram = 1000, preferredCourier = 'J&T') {
    const cityKey = destinationCity.toLowerCase().trim();
    const weightKg = Math.max(1, Math.ceil(weightGram / 1000));
    
    // Cari kota di tabel tarif
    let rates = TARIFF_TABLE[cityKey];
    
    // Fallback jika kota tidak ada di tabel langsung (Estimasi Regional)
    if (!rates) {
        rates = { jnt: 20000, jne: 22000, sicepat: 21000, pos: 19000 };
    }

    const courierKey = preferredCourier.toLowerCase().includes('jne') ? 'jne' :
                      preferredCourier.toLowerCase().includes('sicepat') ? 'sicepat' :
                      preferredCourier.toLowerCase().includes('pos') ? 'pos' : 'jnt';

    const costPerKg = rates[courierKey] || rates['jnt'];
    const totalOngkir = costPerKg * weightKg;

    return {
        origin: DEFAULT_ORIGIN,
        destination: destinationCity,
        weightKg,
        courier: preferredCourier.toUpperCase(),
        costPerKg,
        totalOngkir,
        formattedOngkir: `Rp ${totalOngkir.toLocaleString('id-ID')}`,
        estimatedDays: courierKey === 'jnt' ? '1-2 Hari' : courierKey === 'jne' ? '2-3 Hari' : '2-4 Hari'
    };
}

/**
 * Format rincian ongkir untuk dibalas ke WhatsApp oleh Citra / Bima
 */
function formatOngkirReceipt(destinationCity, weightGram = 1000) {
    const jnt = calculateOngkir(destinationCity, weightGram, 'J&T Express');
    const jne = calculateOngkir(destinationCity, weightGram, 'JNE REG');
    const sicepat = calculateOngkir(destinationCity, weightGram, 'SiCepat BEST');

    let text = `🚚 *CEK ONGKOS KIRIM (Gudang Tasikmalaya ➔ ${destinationCity.toUpperCase()})*\n`;
    text += `📦 Berat Paket: ${weightGram / 1000} kg\n`;
    text += `───────────────────────\n`;
    text += `1. *J&T Express:* ${jnt.formattedOngkir} (${jnt.estimatedDays})\n`;
    text += `2. *JNE REG:* ${jne.formattedOngkir} (${jne.estimatedDays})\n`;
    text += `3. *SiCepat BEST:* ${sicepat.formattedOngkir} (${sicepat.estimatedDays})\n`;
    text += `───────────────────────\n`;
    text += `_Citra merekomendasikan *J&T Express* (${jnt.formattedOngkir}) untuk pengiriman paling cepat! 📦_`;

    return text;
}

module.exports = {
    calculateOngkir,
    formatOngkirReceipt
};
