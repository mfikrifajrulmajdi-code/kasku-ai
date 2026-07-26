// ============================================================================
// PERSISTENT SHOPPING CART STORE (DISK & MEMORY PERSISTABLE)
// Terinspirasi dari: bibinprathap/whatsapp-chatbot
// Mengelola keranjang belanja pengguna di WhatsApp
// ============================================================================

const fs = require('fs');
const path = require('path');

function getCartsPath(tenantId) {
    if (tenantId && tenantId !== 'default') {
        const tenantPath = path.join(__dirname, '..', 'tenants', tenantId, 'config');
        if (!fs.existsSync(tenantPath)) {
            fs.mkdirSync(tenantPath, { recursive: true });
        }
        return path.join(tenantPath, 'carts.json');
    }
    return path.join(__dirname, '..', 'config', 'carts.json');
}

function loadCarts(tenantId) {
    try {
        const cartsPath = getCartsPath(tenantId);
        if (fs.existsSync(cartsPath)) {
            return JSON.parse(fs.readFileSync(cartsPath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveCarts(carts, tenantId) {
    try {
        const cartsPath = getCartsPath(tenantId);
        fs.writeFileSync(cartsPath, JSON.stringify(carts, null, 2), 'utf8');
    } catch (e) {}
}

/**
 * Tambah item ke keranjang belanja
 */
function addItem(senderNumber, item, tenantId) {
    const carts = loadCarts(tenantId);
    if (!carts[senderNumber]) carts[senderNumber] = [];
    
    // Cek apakah item dengan SKU & ukuran yang sama sudah ada
    const existingIndex = carts[senderNumber].findIndex(
        i => (i.sku && i.sku === item.sku) || (i.nama && i.nama.toLowerCase() === item.nama.toLowerCase())
    );

    if (existingIndex > -1) {
        carts[senderNumber][existingIndex].qty += (item.qty || 1);
    } else {
        carts[senderNumber].push({
            sku: item.sku || 'MISC',
            nama: item.nama || 'Produk KasKu',
            harga: parseInt((item.harga || 0).toString().replace(/\D/g, '')) || 250000,
            qty: item.qty || 1,
            size: item.size || '-'
        });
    }

    saveCarts(carts, tenantId);
    return carts[senderNumber];
}

/**
 * Ambil keranjang belanja pengguna
 */
function getCart(senderNumber, tenantId) {
    const carts = loadCarts(tenantId);
    return carts[senderNumber] || [];
}

/**
 * Hapus item dari keranjang berdasarkan SKU atau nama
 */
function removeItem(senderNumber, identifier, tenantId) {
    const carts = loadCarts(tenantId);
    if (!carts[senderNumber]) return [];
    const query = identifier.toLowerCase();
    carts[senderNumber] = carts[senderNumber].filter(
        i => !(i.sku.toLowerCase() === query || (i.nama && i.nama.toLowerCase().includes(query)))
    );
    saveCarts(carts, tenantId);
    return carts[senderNumber];
}

/**
 * Bersihkan keranjang belanja
 */
function clearCart(senderNumber, tenantId) {
    const carts = loadCarts(tenantId);
    carts[senderNumber] = [];
    saveCarts(carts, tenantId);
}

/**
 * Hitung total harga dalam keranjang
 */
function getCartTotal(senderNumber, tenantId) {
    const items = getCart(senderNumber, tenantId);
    return items.reduce((sum, item) => sum + (item.harga * item.qty), 0);
}

/**
 * Format Struk Belanja Digital WA Rapi
 */
function formatCartReceipt(senderNumber, customerName = 'Kak', address = '', tenantId) {
    const items = getCart(senderNumber, tenantId);
    if (items.length === 0) return null;

    const total = getCartTotal(senderNumber, tenantId);
    let text = `🧾 *NOTA BELANJA KASKU STORE*\n`;
    text += `👤 Pelanggan: ${customerName}\n`;
    if (address) text += `📍 Alamat: ${address}\n`;
    text += `───────────────────────\n`;

    items.forEach((item, idx) => {
        const subtotal = item.harga * item.qty;
        text += `${idx + 1}. *${item.nama}* ${item.size !== '-' ? '(Uk: ' + item.size + ')' : ''}\n`;
        text += `   ${item.qty}x @ Rp ${item.harga.toLocaleString('id-ID')} = *Rp ${subtotal.toLocaleString('id-ID')}*\n`;
    });

    text += `───────────────────────\n`;
    text += `💰 *TOTAL BAYAR: Rp ${total.toLocaleString('id-ID')}*\n\n`;
    text += `🏦 *Metode Pembayaran Transfer:*\n`;
    text += `• BCA: *1234567890* (a.n. KasKu Store)\n`;
    text += `• Mandiri: *0987654321* (a.n. KasKu Store)\n\n`;
    text += `_Kirim bukti transfer ke sini ya kak, biar Citra (Kasir) langsung panggilin kurir hari ini! 📦_`;

    return text;
}

module.exports = {
    addItem,
    getCart,
    removeItem,
    clearCart,
    getCartTotal,
    formatCartReceipt
};
