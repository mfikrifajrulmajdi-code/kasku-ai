// ============================================================================
// E-COMMERCE SALES ANALYTICS & REVENUE REPORTING SERVICE (AGEN HADI FINANCE)
// Menghitung omset harian, AOV (Average Order Value), dan konversi penjualan
// ============================================================================

const orderStore = require('./orderStore');
const stockStore = require('./stockStore');

/**
 * Menghasilkan Laporan Ringkasan Performa Toko (Finance Report)
 */
function getStorePerformanceMetrics() {
    const orders = orderStore.loadOrders();
    const uniqueOrders = {};

    Object.values(orders).forEach(o => {
        const cleanId = o.orderId.replace('#', '');
        uniqueOrders[cleanId] = o;
    });

    const allList = Object.values(uniqueOrders);
    const paidList = allList.filter(o => o.status === 'LUNAS');
    const pendingList = allList.filter(o => o.status === 'MENUNGGU_PEMBAYARAN');

    const totalRevenue = paidList.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalPending = pendingList.reduce((sum, o) => sum + (o.total || 0), 0);
    const aov = paidList.length > 0 ? Math.round(totalRevenue / paidList.length) : 0;
    const conversionRate = allList.length > 0 ? Math.round((paidList.length / allList.length) * 100) : 0;

    let text = `📊 *LAPORAN PERFORMA BISNIS KASKU STORE*\n`;
    text += `───────────────────────\n`;
    text += `💰 Omset Terverifikasi (Lunas): *Rp ${totalRevenue.toLocaleString('id-ID')}*\n`;
    text += `⏳ Potensi Omset (Pending): *Rp ${totalPending.toLocaleString('id-ID')}*\n`;
    text += `📦 Total Order Terbayar: *${paidList.length} Order*\n`;
    text += `📈 Average Order Value (AOV): *Rp ${aov.toLocaleString('id-ID')} / Order*\n`;
    text += `🎯 Rasio Konversi Penjualan: *${conversionRate}%*\n`;
    text += `───────────────────────\n`;
    text += `_Hadi (Finance) siap mencetakkan laporan PDF / Excel kapan saja Bos perlukan! 📈_`;

    return text;
}

module.exports = {
    getStorePerformanceMetrics
};
