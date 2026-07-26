// ============================================================================
// NATIVE WHATSAPP MENU & COMMAND INTERCEPTOR SERVICE
// Menyajikan Menu Utama WhatsApp Terstruktur & Respon Instan Pilihan 1-9
// ============================================================================

const orderStore = require('./orderStore');
const cartStore = require('./cartStore');
const ongkirService = require('./ongkirService');
const stockStore = require('./stockStore');

/**
 * Format Menu Utama WhatsApp Resmi
 */
function getMainMenu(senderName = 'Kak') {
    let text = `🤖 *KASKU AI ASSISTANT — PUSAT KENDALI BELANJA*\n`;
    text += `────────────────────────────────\n`;
    text += `Halo ${senderName}! Selamat datang di *KasKu Store* 🎉\n`;
    text += `Saya bot pintar KasKu. Silakan ketik angka / perintah di bawah ini untuk layanan cepat:\n\n`;

    text += `1️⃣ 🛍️ *Katalog & Brosur Produk*\n`;
    text += `   _Ketik \`1\` atau \`katalog\` untuk minta foto & brosur_\n\n`;

    text += `2️⃣ 🛒 *Keranjang Belanja Anda*\n`;
    text += `   _Ketik \`2\` atau \`keranjang\` untuk lihat item & total_\n\n`;

    text += `3️⃣ 💳 *Bayar Instan (Midtrans / QRIS)*\n`;
    text += `   _Ketik \`3\` atau \`bayar\` untuk buat link QRIS / VA_\n\n`;

    text += `4️⃣ 📦 *Lacak Status Pesanan*\n`;
    text += `   _Ketik \`4\` atau \`lacak\` untuk cek status & resi_\n\n`;

    text += `5️⃣ 🚚 *Cek Ongkir Ke Kota Anda*\n`;
    text += `   _Ketik \`5\` atau \`ongkir Jakarta\` untuk cek tarif kurir_\n\n`;

    text += `6️⃣ 📊 *Cek Stok Gudang Real-Time*\n`;
    text += `   _Ketik \`6\` atau \`stok\` untuk melihat sisa stok barang_\n\n`;

    text += `7️⃣ 💬 *Konsultasi Sales (Bima)*\n`;
    text += `   _Ketik \`7\` untuk tanya rekomendasi ukuran & gaya_\n\n`;

    text += `8️⃣ 🎧 *Layanan Komplain & Support*\n`;
    text += `   _Ketik \`8\` jika ada kendala produk / retur_\n\n`;

    text += `9️⃣ ❓ *FAQ & Informasi Toko*\n`;
    text += `   _Ketik \`9\` untuk jam operasional & alamat_\n`;

    text += `────────────────────────────────\n`;
    text += `🌐 *Katalog Web Interaktif (Foto & Video Demo):*\n`;
    text += `http://localhost:3000/katalog`;

    return text;
}

/**
 * Cek apakah pesan adalah perintah Menu (1-9 atau kata kunci menu/ongkir/stok)
 */
async function processMenuChoice(messageText, senderNumber, senderName = 'Kak') {
    const text = messageText.trim().toLowerCase();

    // Trigger Menu Utama
    if (['menu', '!menu', '/menu', 'help', 'bantuan', 'pilihan', 'start'].includes(text)) {
        return getMainMenu(senderName);
    }

    // Pilihan 1: Katalog & Brosur
    if (text === '1' || text === 'katalog') {
        return `🛍️ *KATALOG PRODUK EKSKLUSIF KASKU*\n\n` +
               `Berikut link katalog web lengkap dengan Foto & Video Demo produk:\n` +
               `🌐 http://localhost:3000/katalog\n\n` +
               `[KIRIM_BROSUR]`;
    }

    // Pilihan 2: Keranjang Belanja
    if (text === '2' || text === 'keranjang') {
        const cartText = cartStore.formatCartReceipt(senderNumber, senderName);
        if (cartText) return cartText;
        return `🛒 *KERANJANG BELANJA ANDA KOSONG*\n\n` +
               `Anda belum menambahkan produk ke keranjang. Ketik \`1\` untuk memilih produk dari katalog kami!`;
    }

    // Pilihan 3: Bayar / Payment
    if (text === '3' || text === 'bayar') {
        return `💳 *METODE PEMBAYARAN KASKU STORE*\n───────────────────────\n` +
               `1. **QRIS & E-Wallet** (GoPay, ShopeePay, OVO, DANA)\n` +
               `2. **Virtual Account Bank** (BCA, Mandiri, BRI, BNI)\n` +
               `3. **Transfer Manual**:\n` +
               `   • BCA: *1234567890* (a.n. KasKu Store)\n` +
               `   • Mandiri: *0987654321* (a.n. KasKu Store)\n\n` +
               `_Untuk pesan & bayar otomatis via QRIS Midtrans, ketik pesanan Anda dan alamat pengirimannya ya kak!_`;
    }

    // Pilihan 4: Lacak Pesanan
    if (text === '4' || text === 'lacak') {
        const summary = orderStore.getOrdersSummary(senderNumber);
        if (summary) return summary;
        return `📦 *BELUM ADA PESANAN*\n\n` +
               `Sistem belum menemukan riwayat order untuk nomor Anda. Silakan ketik pesanan Anda (contoh: *"Saya mau pesan Sepatu 6 ukuran 42"*).`;
    }

    // Pilihan 5 / Keyword Ongkir
    if (text === '5' || text.startsWith('ongkir') || text.includes('cek ongkir')) {
        let city = text.replace(/ongkir|cek|ke/gi, '').trim();
        if (!city) city = 'Jakarta';
        return ongkirService.formatOngkirReceipt(city);
    }

    // Pilihan 6 / Keyword Stok
    if (text === '6' || text === 'stok' || text.includes('cek stok')) {
        return stockStore.getFullStockReport();
    }

    // Pilihan 7: Konsultasi Sales Bima
    if (text === '7') {
        return `💬 *KONSULTASI GAYA DENGAN BIMA (SALES)*\n\n` +
               `Halo Kak! Bima di sini 😊 Lagi cari sepatu untuk harian, santai, atau acara formal kak? ` +
               `Kasih tahu Bima ukurannya ya, biar Bima pilihkan yang paling pas & nyaman! 👟`;
    }

    // Pilihan 8: Komplain
    if (text === '8') {
        return `🎧 *LAYANAN CS & KOMPLAIN (DENI)*\n\n` +
               `Halo Kak, Deni dari Tim Support di sini 🙏. Mohon maaf jika ada kendala pada pesanan Kakak. ` +
               `Silakan jelaskan kendalanya (atau kirimkan foto barangnya), Deni akan bantu selesaikan sekarang juga!`;
    }

    // Pilihan 9: FAQ & Info Toko
    if (text === '9' || text === 'faq') {
        return `❓ *INFORMASI TOKO KASKU STORE*\n───────────────────────\n` +
               `📍 *Alamat Gudang:* Jl. Utama No. 88, Tasikmalaya, Jawa Barat\n` +
               `⏰ *Jam Operasional:* Senin - Sabtu (08.00 - 20.00 WIB)\n` +
               `🚚 *Pengiriman:* J&T Express, JNE, SiCepat, POS Indonesia\n` +
               `🛡️ *Garansi:* 100% Produk Original & Garansi Retur 7 Hari\n\n` +
               `Ketik \`menu\` kapan saja untuk kembali ke Menu Utama!`;
    }

    return null;
}

module.exports = {
    getMainMenu,
    processMenuChoice
};
