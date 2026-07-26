// ============================================================================
// AUTO ORDER ID GENERATOR & LIVE TRACKING STORE
// Terinspirasi dari: adithyadilum/wa-demo-shop-bot
// Mengelola ID pesanan (#KASKU-XXXX) & status pengiriman live
// ============================================================================

const fs = require('fs');
const path = require('path');

function getOrdersPath(tenantId) {
    if (tenantId && tenantId !== 'default') {
        const tenantPath = path.join(__dirname, '..', 'tenants', tenantId, 'config');
        if (!fs.existsSync(tenantPath)) {
            fs.mkdirSync(tenantPath, { recursive: true });
        }
        return path.join(tenantPath, 'orders.json');
    }
    return path.join(__dirname, '..', 'config', 'orders.json');
}

function loadOrders(tenantId) {
    try {
        const ordersPath = getOrdersPath(tenantId);
        if (fs.existsSync(ordersPath)) {
            return JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
        }
    } catch (e) {}
    return {};
}

function saveOrders(data, tenantId) {
    try {
        const ordersPath = getOrdersPath(tenantId);
        fs.writeFileSync(ordersPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {}
}

/**
 * Generate Order ID baru (contoh: #KASKU-8921)
 */
function createOrder(senderNumber, items, total, address = '', tenantId) {
    const orders = loadOrders(tenantId);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const orderId = `KASKU-${randomNum}`;

    const orderData = {
        orderId,
        displayId: `#${orderId}`,
        senderNumber,
        items,
        total,
        address,
        status: 'MENUNGGU_PEMBAYARAN', // MENUNGGU_PEMBAYARAN | LUNAS | DIPROSES_GUDANG | DIKIRIM | SELESAI
        resi: null,
        courier: 'J&T Express',
        created: new Date().toISOString()
    };

    orders[orderId] = orderData;
    orders[`#${orderId}`] = orderData; // simpan dua kunci agar cocok dua-duanya

    saveOrders(orders, tenantId);
    return orderData;
}

/**
 * Lacak status pesanan berdasarkan Order ID (misal: KASKU-8921 atau #KASKU-8921)
 */
async function trackOrder(orderIdInput, tenantId) {
    const orders = loadOrders(tenantId);
    const cleanId = orderIdInput.trim().toUpperCase();
    const hashId = cleanId.startsWith('#') ? cleanId : '#' + cleanId;
    const rawId = cleanId.replace('#', '');

    let order = orders[hashId] || orders[rawId];
    if (!order) return null;

    // Jika status masih MENUNGGU_PEMBAYARAN, cek status live ke Midtrans API!
    if (order.status === 'MENUNGGU_PEMBAYARAN') {
        try {
            const midtrans = require('./midtransService');
            const checkRes = await midtrans.checkTransactionStatus(order.orderId);
            if (checkRes && checkRes.isPaid) {
                order.status = 'LUNAS';
            }
        } catch(e) {}
    }

    let statusEmoji = '⏳';
    let statusText = 'Menunggu Pembayaran';

    if (order.status === 'LUNAS') {
        statusEmoji = '✅'; statusText = 'Pembayaran Terverifikasi (Siap Diproses)';
    } else if (order.status === 'DIPROSES_GUDANG') {
        statusEmoji = '📦'; statusText = 'Sedang Dikemas di Gudang Joko';
    } else if (order.status === 'DIKIRIM') {
        statusEmoji = '🚚'; statusText = `Dalam Pengiriman via ${order.courier}`;
    } else if (order.status === 'SELESAI') {
        statusEmoji = '🎉'; statusText = 'Pesanan Telah Tiba & Selesai';
    }

    let text = `📦 *LACAK PESANAN: #${order.orderId}*\n`;
    text += `───────────────────────\n`;
    text += `Status: ${statusEmoji} *${statusText}*\n`;
    text += `💰 Total Transaksi: Rp ${order.total.toLocaleString('id-ID')}\n`;
    if (order.resi) text += `🚚 No. Resi Ekspedisi: *${order.resi}*\n`;
    if (order.address) text += `📍 Alamat: ${order.address}\n`;
    text += `📅 Tanggal Order: ${new Date(order.created).toLocaleString('id-ID')}\n`;

    return text;
}


/**
 * Update status order (untuk Admin / Finance / Ops / Midtrans)
 */
function updateOrderStatus(orderIdInput, newStatus, resi = null, tenantId) {
    const orders = loadOrders(tenantId);
    const cleanId = orderIdInput.trim().toUpperCase();
    const hashId = cleanId.startsWith('#') ? cleanId : '#' + cleanId;
    const rawId = cleanId.replace('#', '');

    const order = orders[hashId] || orders[rawId];

    if (order) {
        order.status = newStatus;
        if (resi) order.resi = resi;
        orders[hashId] = order;
        orders[rawId] = order;
        saveOrders(orders, tenantId);
        return order;
    }
    return null;
}


/**
 * Rekap seluruh pesanan milik satu pengguna
 */
function getOrdersSummary(senderNumber, tenantId) {
    const orders = loadOrders(tenantId);
    const uniqueOrdersMap = {};
    
    Object.values(orders).forEach(o => {
        if (o.senderNumber === senderNumber || o.senderNumber.includes(senderNumber)) {
            const cleanId = o.orderId.replace('#', '');
            uniqueOrdersMap[cleanId] = o;
        }
    });

    const userOrders = Object.values(uniqueOrdersMap);
    if (userOrders.length === 0) return null;

    let lunasCount = 0;
    let lunasTotal = 0;
    let pendingCount = 0;
    let pendingTotal = 0;

    let text = `📋 *REKAP SELURUH PESANAN ANDA*\n`;
    text += `───────────────────────\n`;

    userOrders.forEach((o, idx) => {
        const displayId = o.orderId.startsWith('#') ? o.orderId : '#' + o.orderId;
        const isLunas = o.status === 'LUNAS';
        const statusEmoji = isLunas ? '✅ LUNAS' : '⏳ Menunggu Pembayaran';
        
        if (isLunas) {
            lunasCount++;
            lunasTotal += o.total;
        } else {
            pendingCount++;
            pendingTotal += o.total;
        }

        text += `${idx + 1}. *${displayId}* — ${statusEmoji}\n`;
        text += `   📦 1x Sepatu 6 | 💰 Rp ${o.total.toLocaleString('id-ID')}\n`;
    });

    text += `───────────────────────\n`;
    text += `✅ *Order Lunas (${lunasCount}):* Rp ${lunasTotal.toLocaleString('id-ID')}\n`;
    if (pendingCount > 0) {
        text += `⏳ *Belum Dibayar (${pendingCount}):* Rp ${pendingTotal.toLocaleString('id-ID')}\n`;
    }
    text += `💰 *TOTAL KESELURUHAN (${userOrders.length} Order): Rp ${(lunasTotal + pendingTotal).toLocaleString('id-ID')}*`;

    return text;
}

module.exports = {
    createOrder,
    trackOrder,
    updateOrderStatus,
    getOrdersSummary,
    loadOrders
};

