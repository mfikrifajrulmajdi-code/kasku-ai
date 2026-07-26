// ============================================================================
// MIDTRANS PAYMENT SERVICE — Automated Verification Engine
// Integrasi resmi Midtrans Payment Gateway (Snap API & Webhook Notification)
// ============================================================================

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const orderStore = require('./orderStore');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'midtrans-config.json');

function getConfig() {
    return {
        merchantId: process.env.MIDTRANS_MERCHANT_ID || 'M086776065',
        clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
        serverKey: process.env.MIDTRANS_SERVER_KEY || '',
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
        snapUrl: process.env.MIDTRANS_IS_PRODUCTION === 'true'
            ? 'https://app.midtrans.com/snap/v1/transactions'
            : 'https://app.sandbox.midtrans.com/snap/v1/transactions'
    };
}

/**
 * Buat Link Pembayaran Midtrans Snap (QRIS, GoPay, ShopeePay, Transfer Bank VA)
 */
async function createSnapTransaction(orderId, grossAmount, customerName = 'Pelanggan', customerPhone = '') {
    const config = getConfig();
    const authHeader = 'Basic ' + Buffer.from(config.serverKey + ':').toString('base64');

    const cleanAmount = parseInt(grossAmount.toString().replace(/\D/g, '')) || 10000;
    const cleanOrderId = orderId.replace(/[^a-zA-Z0-9\-_~.]/g, '');

    const payload = {
        transaction_details: {
            order_id: cleanOrderId,
            gross_amount: cleanAmount
        },

        customer_details: {
            first_name: customerName,
            phone: customerPhone
        },
        credit_card: {
            secure: true
        },
        expiry: {
            unit: "hours",
            duration: 24
        }
    };

    try {
        const res = await axios.post(config.snapUrl, payload, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        return {
            success: true,
            redirectUrl: res.data.redirect_url,
            token: res.data.token
        };
    } catch (err) {
        console.error('[MIDTRANS] ❌ Gagal buat Snap Transaction:', err.response?.data || err.message);
        return {
            success: false,
            error: err.response?.data?.error_messages?.[0] || err.message
        };
    }
}

/**
 * Verifikasi Signature Key dari Webhook Notification Midtrans
 */
function verifySignature(orderId, statusCode, grossAmount, signatureKey) {
    const config = getConfig();
    const raw = orderId + statusCode + grossAmount + config.serverKey;
    const expectedHash = crypto.createHash('sha512').update(raw).digest('hex');
    return expectedHash === signatureKey;
}

/**
 * Olah Webhook Notification dari Midtrans
 */
async function processNotification(notificationBody, whatsappSendMessageFn = null) {
    const {
        order_id,
        status_code,
        gross_amount,
        signature_key,
        transaction_status,
        payment_type,
        fraud_status
    } = notificationBody;

    console.log(`[MIDTRANS-WEBHOOK] 💳 Notifikasi masuk: Order ${order_id} | Status: ${transaction_status} | Type: ${payment_type}`);

    // Verifikasi tanda tangan keamanan
    if (!verifySignature(order_id, status_code, gross_amount, signature_key)) {
        console.error(`[MIDTRANS-WEBHOOK] 🛡️ Signature Key tidak valid!`);
        return { success: false, error: 'Invalid Signature Key' };
    }

    let isPaid = false;

    if (transaction_status === 'capture') {
        if (fraud_status === 'accept') isPaid = true;
    } else if (transaction_status === 'settlement') {
        isPaid = true;
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
        orderStore.updateOrderStatus(order_id, 'KADALUARSA');
        console.log(`[MIDTRANS-WEBHOOK] ⚠️ Order ${order_id} dibatalkan / kadaluarsa.`);
    }

    if (isPaid) {
        // Update status order ke LUNAS
        const updatedOrder = orderStore.updateOrderStatus(order_id, 'LUNAS');
        console.log(`[MIDTRANS-WEBHOOK] ✅ Order ${order_id} BERHASIL LUNAS via ${payment_type}!`);

        // Notifikasi otomatis ke WhatsApp Pembeli jika function tersedia
        if (updatedOrder && updatedOrder.senderNumber && whatsappSendMessageFn) {
            const waMsg = `✅ *PEMBAYARAN TERVERIFIKASI OTOMATIS! (MIDTRANS)*\n` +
                `───────────────────────\n` +
                `📌 ID Pesanan: *${order_id}*\n` +
                `💳 Metode: *${payment_type.toUpperCase()}*\n` +
                `💰 Total Lunas: *Rp ${parseInt(gross_amount).toLocaleString('id-ID')}*\n\n` +
                `_Terima kasih Kak! Citra (Kasir) & Joko (Gudang) langsung memproses pengiriman pesanan Kakak hari ini! 📦✨_`;

            try {
                await whatsappSendMessageFn(updatedOrder.senderNumber, { text: waMsg });
                console.log(`[MIDTRANS-WEBHOOK] 📲 Notifikasi WA lunas terkirim ke ${updatedOrder.senderNumber}`);
            } catch (err) {
                console.error(`[MIDTRANS-WEBHOOK] ❌ Gagal kirim WA lunas:`, err.message);
            }
        }
    }

    return { success: true, isPaid, orderId: order_id };
}

/**
 * Cek status transaksi langsung ke API Midtrans (Real-Time Fallback)
 */
async function checkTransactionStatus(orderId) {
    const config = getConfig();
    const cleanOrderId = orderId.replace(/[^a-zA-Z0-9\-_~.]/g, '');
    const authHeader = 'Basic ' + Buffer.from(config.serverKey + ':').toString('base64');
    const baseUrl = config.isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com';
    const url = `${baseUrl}/v2/${cleanOrderId}/status`;

    try {
        const res = await axios.get(url, {
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
            },
            timeout: 2500
        });


        const data = res.data;
        const status = data.transaction_status;
        console.log(`[MIDTRANS-API-CHECK] Order ${cleanOrderId} status di Midtrans: ${status}`);

        if (status === 'settlement' || status === 'capture') {
            orderStore.updateOrderStatus(orderId, 'LUNAS');
            return { isPaid: true, status: 'LUNAS', data };
        }
        return { isPaid: false, status: status, data };
    } catch (e) {
        console.error(`[MIDTRANS-API-CHECK] ⚠️ Gagal cek status ${cleanOrderId}:`, e.response?.data?.status_message || e.message);
        return { isPaid: false, error: e.message };
    }
}

module.exports = {
    getConfig,
    createSnapTransaction,
    verifySignature,
    processNotification,
    checkTransactionStatus
};

