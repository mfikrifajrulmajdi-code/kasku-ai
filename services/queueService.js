// ============================================================================
// WHATSAPP OUTBOUND MESSAGE QUEUE & RATE LIMITER SERVICE
// Mencegah blokir Baileys WhatsApp oleh Meta saat traffic melonjak tinggi
// Distribusi pesan secara alami: Max 2-3 pesan per detik dengan random jitter
// Note: queueService = rate-limits outbound WhatsApp replies to avoid Meta ban.
// This is different from chatQueues in whatsappService.js which prevents duplicate processing of same sender's messages.
// ============================================================================

const messageQueue = [];
let isProcessing = false;

/**
 * Tambahkan pesan ke antrean keluar WhatsApp
 * @param {Function} sendFunction - Fungsi async pengirim pesan (misal: sock.sendMessage)
 * @param {string} recipientJid - JID / Nomor penerima
 * @param {Object|string} content - Konten pesan
 */
function enqueueMessage(sendFunction, recipientJid, content) {
    messageQueue.push({
        sendFunction,
        recipientJid,
        content,
        enqueuedAt: Date.now()
    });

    console.log(`[QUEUE] 📥 Pesan dimasukkan ke antrean untuk ${recipientJid}. Total antrean: ${messageQueue.length}`);
    processQueue();
}

/**
 * Pemroses Antrean dengan Rate Limiting & Natural Jitter (300ms - 700ms)
 */
async function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;

    isProcessing = true;

    while (messageQueue.length > 0) {
        const item = messageQueue.shift();
        try {
            if (typeof item.sendFunction === 'function') {
                await item.sendFunction(item.recipientJid, item.content);
                console.log(`[QUEUE] 📤 Pesan terkirim dari antrean ke ${item.recipientJid}. Sisa antrean: ${messageQueue.length}`);
            }
        } catch (err) {
            console.error(`[QUEUE] ❌ Gagal mengirim pesan dari antrean ke ${item.recipientJid}:`, err.message);
        }

        // Random jitter 350ms - 750ms antar pesan (Mencegah deteksi bot Meta)
        const delayMs = Math.floor(350 + Math.random() * 400);
        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    isProcessing = false;
}

/**
 * Ambil status antrean saat ini
 */
function getQueueStatus() {
    return {
        queueLength: messageQueue.length,
        isProcessing
    };
}

module.exports = {
    enqueueMessage,
    getQueueStatus
};
