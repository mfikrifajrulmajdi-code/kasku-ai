// ============================================================================
// ABANDONED CART RECOVERY CRON SERVICE (AGEN GITA MARKETING)
// Memindai keranjang belanja yang ditinggalkan pelanggan (> 2 Jam)
// Mengirimkan pesan pengingat ramah via WhatsApp untuk meningkatkan konversi
// ============================================================================

const fs = require('fs');
const path = require('path');
const cartStore = require('./cartStore');
const queueService = require('./queueService');

const NOTIFIED_CARTS_PATH = path.join(__dirname, '..', 'config', 'notified_carts.json');
const CARTS_PATH = path.join(__dirname, '..', 'config', 'carts.json');

function loadNotifiedCarts() {
    try {
        if (fs.existsSync(NOTIFIED_CARTS_PATH)) {
            return JSON.parse(fs.readFileSync(NOTIFIED_CARTS_PATH, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveNotifiedCarts(data) {
    try {
        fs.writeFileSync(NOTIFIED_CARTS_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {}
}

/**
 * Pindai Keranjang Belanja Ditinggalkan & Jalankan Recovery WhatsApp
 * @param {Function} sendWhatsAppMessage - Function pengirim pesan Baileys WA
 * @param {number} thresholdHours - Jam batas keranjang ditinggalkan (default: 2 jam)
 */
async function scanAndRecoverAbandonedCarts(sendWhatsAppMessage, thresholdHours = 2) {
    console.log(`[ABANDONED-CART-CRON] 🔍 Memindai keranjang belanja ditinggalkan (> ${thresholdHours} Jam)...`);

    let cartsRaw = {};
    try {
        if (fs.existsSync(CARTS_PATH)) {
            cartsRaw = JSON.parse(fs.readFileSync(CARTS_PATH, 'utf8'));
        }
    } catch (e) {
        return;
    }

    const notifiedMap = loadNotifiedCarts();
    const now = Date.now();
    const thresholdMs = thresholdHours * 60 * 60 * 1000;
    let recoveredCount = 0;

    for (const [senderNumber, items] of Object.entries(cartsRaw)) {
        if (!items || items.length === 0) continue;

        // Cek jika sudah pernah di-notify dalam 24 jam terakhir
        const lastNotified = notifiedMap[senderNumber];
        if (lastNotified && (now - lastNotified) < 24 * 60 * 60 * 1000) {
            continue;
        }

        const total = items.reduce((sum, i) => sum + (i.harga * i.qty), 0);
        const firstItemName = items[0].nama || 'Sepatu KasKu';

        // Format Pesanan Pengingat Gita Marketing
        let reminderText = `Halo Kak! Gita (Marketing KasKu Store) di sini 👋✨\n\n`;
        reminderText += `Barang impian Kakak (*${firstItemName}*) di keranjang belanja KasKu Store stoknya tinggal sedikit lho! 🛒\n\n`;
        reminderText += `💰 *Total Belanja Kakak:* Rp ${total.toLocaleString('id-ID')}\n\n`;
        reminderText += `Mau Gita & Bima bantu amankan pesanan Kakak sekarang sebelum kehabisan slot pengiriman hari ini? 😊\n\n`;
        reminderText += `_Ketik \`2\` atau \`keranjang\` di WhatsApp ini untuk checkout & dapatkan gratis konsultasi ukuran! 📦_`;

        console.log(`[ABANDONED-CART-CRON] 📣 Mengirim pesan follow-up keranjang ke ${senderNumber}...`);

        if (typeof sendWhatsAppMessage === 'function') {
            queueService.enqueueMessage(sendWhatsAppMessage, senderNumber, { text: reminderText });
            notifiedMap[senderNumber] = now;
            recoveredCount++;
        }
    }

    saveNotifiedCarts(notifiedMap);
    console.log(`[ABANDONED-CART-CRON] ✅ Pemindaian selesai. Total ${recoveredCount} pelanggan di-follow-up.`);
    return recoveredCount;
}

/**
 * Jalankan Cron Routine Otomatis Setiap 30 Menit
 */
function startAbandonedCartCron(sendWhatsAppMessage) {
    console.log(`[ABANDONED-CART-CRON] ⏰ Cron routine Gita Marketing aktif (Jalan setiap 30 Menit)...`);
    
    // Jalankan awal
    scanAndRecoverAbandonedCarts(sendWhatsAppMessage, 2);

    // Set interval 30 menit
    setInterval(() => {
        scanAndRecoverAbandonedCarts(sendWhatsAppMessage, 2);
    }, 30 * 60 * 1000);
}

module.exports = {
    scanAndRecoverAbandonedCarts,
    startAbandonedCartCron
};
