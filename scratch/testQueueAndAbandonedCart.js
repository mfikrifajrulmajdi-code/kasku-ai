const queueService = require('../services/queueService');
const abandonedCartService = require('../services/abandonedCartService');
const cartStore = require('../services/cartStore');

async function test() {
    console.log("🧪 1. Testing WhatsApp Outbound Queue & Rate Limiter:");
    
    let sentLogs = [];
    const mockSend = async (jid, content) => {
        sentLogs.push({ jid, content: content.text, time: Date.now() });
    };

    queueService.enqueueMessage(mockSend, "628999111222", { text: "Pesan 1" });
    queueService.enqueueMessage(mockSend, "628999111222", { text: "Pesan 2" });
    queueService.enqueueMessage(mockSend, "628999111222", { text: "Pesan 3" });

    // Tunggu 2 detik untuk pemrosesan antrean
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`  ✅ Total pesan terkirim via antrean: ${sentLogs.length}/3`);
    console.log(sentLogs);

    console.log("\n-------------------------------------------------\n");

    console.log("🧪 2. Testing Abandoned Cart Recovery (Gita Marketing Cron):");
    const testNum = "628777666555";
    cartStore.clearCart(testNum);
    cartStore.addItem(testNum, { sku: "6", nama: "Sepatu Casual SKU-6", harga: 250000, qty: 1, size: "42" });

    let recoveredLogs = [];
    const mockRecoverSend = async (jid, content) => {
        recoveredLogs.push({ jid, text: content.text });
    };

    // Jalankan scan & recovery dengan threshold 0 jam untuk testing instan
    const count = await abandonedCartService.scanAndRecoverAbandonedCarts(mockRecoverSend, 0);
    console.log(`  ✅ Total keranjang ditinggalkan yang di-follow-up Gita: ${count}`);
    if (recoveredLogs.length > 0) {
        console.log("\n💬 PESAN FOLLOW-UP AGEN GITA MARKETING:");
        console.log(recoveredLogs[0].text);
    }
}

test();
