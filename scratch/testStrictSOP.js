const opsAgent = require('../services/agents/opsAgent');
const salesAgent = require('../services/agents/salesAgent');

async function test() {
    console.log("🧪 TEST 1: User says 'Halo Bima, saya mau pesan Sepatu 6' (No size & no address)");
    const salesContext = {
        history: [],
        katalog: "Sepatu 6: Rp 250.000",
        callLLM: async (prompt) => {
            return "Pilihan mantap Kak! Untuk Sepatu 6, Kakak biasanya pakai ukuran berapa nih (misal: 39, 40, 41, 42, 43)? Mau dipesan berapa pasang Kak?";
        },
        learningSystem: null
    };
    const bimaReply = await salesAgent.handle(salesContext);
    console.log("💬 BALASAN BIMA (SALES):");
    console.log(bimaReply);
    console.log(bimaReply.includes("ukuran") ? "✅ PASS (Bima asks for size first)" : "❌ FAIL");

    console.log("\n-------------------------------------------------\n");

    console.log("🧪 TEST 2: User gives vague address 'Tasik alaya' (Incomplete address)");
    const opsVagueContext = {
        history: [],
        katalog: "Sepatu 6: Rp 250.000",
        callLLM: async () => JSON.stringify({
            sku_ditemukan: "6",
            ukuran: "42",
            jumlah: 1,
            alamat_lengkap: "Tasik alaya",
            is_ready_for_invoice: false,
            reply: "Siap Kak! Untuk pengiriman via ekspedisi (J&T/JNE), Citra butuh alamat lengkap Kakak nih biar paketnya tidak nyasar dan ongkirnya pas. Boleh diisikan format berikut Kak?\n• Nama Penerima:\n• Jalan / RT RW / No. Rumah:\n• Kecamatan & Kota:\n• No. HP Aktif:"
        }),
        callGasDatabase: async () => {},
        learningSystem: null,
        senderNumber: "628999888777",
        messageText: "Tasik alaya"
    };

    const citraVagueReply = await opsAgent.handle(opsVagueContext);
    console.log("💬 BALASAN CITRA (KASIR):");
    console.log(citraVagueReply);
    console.log(!citraVagueReply.includes("#KASKU-") ? "✅ PASS (Citra refuses to issue invoice for vague address)" : "❌ FAIL");

    console.log("\n-------------------------------------------------\n");

    console.log("🧪 TEST 3: User provides complete valid address (Fully confirmed)");
    const opsValidContext = {
        history: [],
        katalog: "Sepatu 6: Rp 250.000",
        callLLM: async () => JSON.stringify({
            sku_ditemukan: "6",
            ukuran: "42",
            jumlah: 1,
            alamat_lengkap: "Jl. Merdeka No. 45 RT 02/05, Kec. Cihideung, Kota Tasikmalaya",
            kota_tujuan: "Tasikmalaya",
            is_ready_for_invoice: true,
            reply: "Siap Kak! Data pesanan 1 pasang Sepatu 6 (Ukuran 42) tujuan Tasikmalaya sudah lengkap."
        }),
        callGasDatabase: async () => {},
        learningSystem: null,
        senderNumber: "628999888777",
        messageText: "Jl. Merdeka No. 45 RT 02/05, Kec. Cihideung, Kota Tasikmalaya a.n Budi"
    };

    const citraValidReply = await opsAgent.handle(opsValidContext);
    console.log("💬 BALASAN CITRA (INVOICE COMPLETE):");
    console.log(citraValidReply);
    console.log(citraValidReply.includes("KASKU-") && citraValidReply.includes("Ongkir") ? "✅ PASS (Invoice & Ongkir issued for complete valid address)" : "❌ FAIL");

}

test();
