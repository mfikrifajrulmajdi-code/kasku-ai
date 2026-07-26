const opsAgent = require('../services/agents/opsAgent');

async function test() {
    console.log("🧪 Testing opsAgent: Cek Total Pesanan...");
    const mockContext = {
        history: [],
        katalog: "Belum ada produk",
        callLLM: async () => "{}",
        callGasDatabase: async () => {},
        learningSystem: null,
        senderNumber: "153463694602350",
        sender: "153463694602350@lid",
        messageText: "coba cek total pesanan saya"
    };

    const reply = await opsAgent.handle(mockContext);
    console.log("\n💬 HASIL BALASAN REKAP PESANAN:");
    console.log(reply);
}

test();
