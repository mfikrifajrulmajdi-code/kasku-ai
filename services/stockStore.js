// ============================================================================
// REAL-TIME STOCK MANAGEMENT STORE & GUDANG JOKO ALERT ENGINE
// Mengelola stok barang per SKU, pemotongan stok otomatis saat lunas,
// serta memberikan alert ke Agen Joko (Procurement) jika stok menipis (<= 3).
// ============================================================================

const fs = require('fs');
const path = require('path');

function getStocksPath(tenantId) {
    if (tenantId && tenantId !== 'default') {
        const tenantPath = path.join(__dirname, '..', 'tenants', tenantId, 'config');
        if (!fs.existsSync(tenantPath)) {
            fs.mkdirSync(tenantPath, { recursive: true });
        }
        return path.join(tenantPath, 'stocks.json');
    }
    return path.join(__dirname, '..', 'config', 'stocks.json');
}

function loadStocks(tenantId) {
    try {
        const stocksPath = getStocksPath(tenantId);
        if (fs.existsSync(stocksPath)) {
            return JSON.parse(fs.readFileSync(stocksPath, 'utf8'));
        }
    } catch (e) {}
    saveStocks(INITIAL_STOCKS, tenantId);
    return INITIAL_STOCKS;
}

function saveStocks(stocks, tenantId) {
    try {
        const stocksPath = getStocksPath(tenantId);
        fs.writeFileSync(stocksPath, JSON.stringify(stocks, null, 2), 'utf8');
    } catch (e) {}
}

/**
 * Cek jumlah stok SKU tertentu
 */
function getStock(sku, tenantId) {
    const stocks = loadStocks(tenantId);
    const cleanSku = sku.toString().trim();
    return stocks[cleanSku] ? stocks[cleanSku].stok : 0;
}

/**
 * Potong stok barang saat terjadi pembelian
 */
function deductStock(sku, qty = 1, tenantId) {
    const stocks = loadStocks(tenantId);
    const cleanSku = sku.toString().trim();

    if (stocks[cleanSku]) {
        if (stocks[cleanSku].stok >= qty) {
            stocks[cleanSku].stok -= qty;
            saveStocks(stocks, tenantId);
            console.log(`[STOCK-STORE] 📦 Stok SKU-${cleanSku} berkurang ${qty}, sisa: ${stocks[cleanSku].stok}`);
            return { success: true, remaining: stocks[cleanSku].stok, item: stocks[cleanSku] };
        } else {
            return { success: false, reason: 'Stok tidak mencukupi', currentStok: stocks[cleanSku].stok };
        }
    }
    return { success: false, reason: 'SKU tidak ditemukan' };
}

/**
 * Tambah stok (Restock oleh Joko / Supplier)
 */
function restock(sku, qty = 10, tenantId) {
    const stocks = loadStocks(tenantId);
    const cleanSku = sku.toString().trim();

    if (!stocks[cleanSku]) {
        stocks[cleanSku] = { sku: cleanSku, nama: `Produk SKU-${cleanSku}`, stok: qty, minStok: 3, harga: 250000 };
    } else {
        stocks[cleanSku].stok += qty;
    }
    saveStocks(stocks, tenantId);
    console.log(`[STOCK-STORE] 📥 Restock SKU-${cleanSku} sebanyak +${qty}, total sekarang: ${stocks[cleanSku].stok}`);
    return stocks[cleanSku];
}

/**
 * Dapatkan daftar stok menipis (Alert Joko Procurement)
 */
function getLowStockAlerts(tenantId) {
    const stocks = loadStocks(tenantId);
    const lowStockItems = Object.values(stocks).filter(item => item.stok <= item.minStok);

    if (lowStockItems.length === 0) return null;

    let text = `🚨 *ALERT STOK MENIPIS (GUDANG JOKO)*\n───────────────────────\n`;
    lowStockItems.forEach(item => {
        text += `• *${item.nama}* (SKU-${item.sku}): Sisa *${item.stok} Pcs* (Batas Min: ${item.minStok})\n`;
    });
    text += `───────────────────────\n`;
    text += `_Joko (Procurement) perlu merekomendasikan PO ke Supplier sekarang! 📦_`;

    return text;
}

/**
 * Dapatkan Laporan Seluruh Stok Gudang
 */
function getFullStockReport(tenantId) {
    const stocks = loadStocks(tenantId);
    let text = `📊 *LAPORAN STOK GUDANG UTAMA KASKU*\n───────────────────────\n`;

    Object.values(stocks).forEach(item => {
        const statusEmoji = item.stok === 0 ? '🔴 HABIS' : item.stok <= item.minStok ? '🟡 MENIPIS' : '🟢 AMAN';
        text += `• *${item.nama}* [SKU ${item.sku}] — ${statusEmoji}\n`;
        text += `   Stok: *${item.stok} Pcs* | Harga: Rp ${item.harga.toLocaleString('id-ID')}\n`;
    });

    text += `───────────────────────\n`;
    return text;
}

module.exports = {
    loadStocks,
    getStock,
    deductStock,
    restock,
    getLowStockAlerts,
    getFullStockReport
};
