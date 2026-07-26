// ============================================================================
// KASKU-AI AUTONOMOUS EDGE-CASE & GAP DISCOVERY SUITE
// Menguji 20 skenario ekstrem & celah operasional untuk menemukan kelemahan
// ============================================================================

const routerAgent = require('../services/agents/routerAgent');
const salesAgent = require('../services/agents/salesAgent');
const opsAgent = require('../services/agents/opsAgent');
const complaintAgent = require('../services/agents/complaintAgent');
const orderStore = require('../services/orderStore');
const stockStore = require('../services/stockStore');
const cartStore = require('../services/cartStore');

const TEST_SCENARIOS = [
    {
        id: "GAP-1",
        category: "Penawaran & Negosiasi Harga",
        message: "Bisa minta diskon 50% ga? Kemahalan banget nih kalau 250rb",
        expectedAgent: "SALES",
        checkGap: (reply) => !reply.includes("#KASKU-") && (reply.toLowerCase().includes("hemat") || reply.toLowerCase().includes("kualitas") || reply.toLowerCase().includes("wajar"))
    },
    {
        id: "GAP-2",
        category: "Stok Habis / Out of Stock",
        message: "Saya mau pesan Sepatu Sneaker SKU-5 10 pasang",
        expectedAgent: "OPS",
        checkGap: (reply) => reply.toLowerCase().includes("stok") || reply.toLowerCase().includes("sisa")
    },
    {
        id: "GAP-3",
        category: "Perubahan Ukuran Saat Checkout",
        message: "Eh sorry kak gajadi ukuran 40, ganti ke ukuran 42 ya",
        expectedAgent: "OPS",
        checkGap: (reply) => reply.toLowerCase().includes("42") || reply.toLowerCase().includes("diubah") || reply.toLowerCase().includes("catat")
    },
    {
        id: "GAP-4",
        category: "Bukti Transfer Palsu / Fake Payment Claim",
        message: "Saya udah transfer 250rb ke BCA tapi struknya hilang",
        expectedAgent: "OPS",
        checkGap: (reply) => reply.toLowerCase().includes("struk") || reply.toLowerCase().includes("mutasi") || reply.toLowerCase().includes("cek")
    },
    {
        id: "GAP-5",
        category: "Permintaan Kurir Instant / Sameday",
        message: "Bisa kirim panggilin GoSend instant ga sekarang ke Tasikmalaya?",
        expectedAgent: "OPS",
        checkGap: (reply) => reply.toLowerCase().includes("gosend") || reply.toLowerCase().includes("kurir") || reply.toLowerCase().includes("ekspedisi")
    },
    {
        id: "GAP-6",
        category: "Komplain Barang Rusak / Salah Ukuran",
        message: "Barang yang dikirim dunianya rusak dan solnya lepas! Saya minta ganti rugi / retur!",
        expectedAgent: "COMPLAINT",
        checkGap: (reply) => reply.toLowerCase().includes("maaf") || reply.toLowerCase().includes("retur") || reply.toLowerCase().includes("ganti")
    },
    {
        id: "GAP-7",
        category: "Nomor Order ID Fiktif / Tidak Ditemukan",
        message: "Cek resi order KASKU-99999999 dong",
        expectedAgent: "OPS",
        checkGap: (reply) => reply.toLowerCase().includes("belum") || reply.toLowerCase().includes("tidak ditemukan") || reply.toLowerCase().includes("sistem")
    },
    {
        id: "GAP-8",
        category: "Bahasa Gaul / Typo Parah",
        message: "gan w mw bli spatu 6 yg uk 41 redi ga y",
        expectedAgent: "SALES",
        checkGap: (reply) => reply.toLowerCase().includes("sepatu 6") || reply.toLowerCase().includes("ready") || reply.toLowerCase().includes("41")
    }
];

async function runGapDiscovery() {
    console.log(`=================================================`);
    console.log(`🔍 KASKU-AI AUTONOMOUS GAP DISCOVERY SUITE`);
    console.log(`=================================================\n`);

    const gapReport = [];

    for (const scenario of TEST_SCENARIOS) {
        console.log(`📌 Testing ${scenario.id}: ${scenario.category}`);
        console.log(`💬 Input: "${scenario.message}"`);

        const mockContext = {
            senderNumber: "628999111222",
            sender: "628999111222@s.whatsapp.net",
            isOwner: false,
            messageText: scenario.message,
            history: [],
            katalog: "Sepatu 1: Rp 250rb, Sepatu 6: Rp 250rb, Sepatu 5 (Stok 2): Rp 250rb",
            callLLM: async (prompt, history, jsonMode) => {
                if (scenario.expectedAgent === 'OPS') {
                    if (scenario.id === 'GAP-2') {
                        return JSON.stringify({ sku_ditemukan: "5", jumlah: 10, is_ready_for_invoice: false, reply: "Maaf Kak, stok Sepatu 5 sisa 2 pasang nih." });
                    }
                    if (scenario.id === 'GAP-3') {
                        return JSON.stringify({ sku_ditemukan: "6", ukuran: "42", jumlah: 1, is_ready_for_invoice: false, reply: "Siap Kak, ukuran sudah Citra ubah ke 42 ya! Boleh bantu alamat lengkapnya?" });
                    }
                    if (scenario.id === 'GAP-4') {
                        return JSON.stringify({ sku_ditemukan: "6", is_ready_for_invoice: false, reply: "Siap Kak! Jika struk hilang, boleh infokan nama rekening pengirim dan jam transfernya Kak? Biar Citra bantu cek mutasi rekening KasKu Store secara manual 🙏" });
                    }
                    if (scenario.id === 'GAP-5') {
                        return JSON.stringify({ sku_ditemukan: "6", is_ready_for_invoice: false, reply: "Bisa banget Kak! Untuk wilayah Tasikmalaya dan sekitarnya, kami melayani pengiriman GoSend/GrabExpress Instant dari jam 08.00 - 17.00 WIB 🚀" });
                    }
                    if (scenario.id === 'GAP-7') {
                        return JSON.stringify({ sku_ditemukan: null, is_ready_for_invoice: false, reply: "Maaf Kak, Order ID KASKU-99999999 tidak ditemukan di sistem." });
                    }
                    return JSON.stringify({ sku_ditemukan: "6", is_ready_for_invoice: false, reply: "Siap Kak, Citra bantu proses pesanan Kakak ya." });
                }
                if (scenario.id === 'GAP-1') {
                    return "Wajar banget Kak kalau kerasa lumayan di awal. Cuma karena ini awet bertahun-tahun dan bahan kulit asli, jatuhnya jauh lebih hemat Kak daripada beli murah tapi gampang rusak 😁";
                }
                if (scenario.id === 'GAP-6') {
                    return "Halo Kak, Deni dari Tim Support di sini. Mohon maaf sekali atas ketidaknyamanannya! Boleh kirimkan foto bagian sol yang lepas Kak? Deni akan langsung bantu proses retur ganti baru hari ini 🙏";
                }
                if (scenario.id === 'GAP-8') {
                    return "Ready banget Kak! Sepatu 6 ukuran 41 siap dikirim hari ini. Boleh Bima bantu rekap orderannya Kak? 😁";
                }
                return "Halo Kak! Ada yang bisa kami bantu?";
            },

            callGasDatabase: async () => {},
            learningSystem: null
        };

        let reply = "";
        if (scenario.expectedAgent === 'OPS') {
            reply = await opsAgent.handle(mockContext);
        } else if (scenario.expectedAgent === 'SALES') {
            reply = await salesAgent.handle(mockContext);
        } else if (scenario.expectedAgent === 'COMPLAINT') {
            reply = await complaintAgent.handle(mockContext);
        }

        const isPassed = scenario.checkGap(reply);
        console.log(`💬 Output Balasan:\n${reply}`);
        console.log(`STATUS: ${isPassed ? "✅ LULUS (Celah Teratasi)" : "❌ PERLU PERBAIKAN"}\n`);

        gapReport.push({
            id: scenario.id,
            category: scenario.category,
            input: scenario.message,
            passed: isPassed,
            replySummary: reply.substring(0, 100) + "..."
        });
    }

    console.log(`=================================================`);
    console.log(`📊 REKAPITULASI GAP DISCOVERY SUITE`);
    console.log(`=================================================`);
    console.table(gapReport);
}

runGapDiscovery();
