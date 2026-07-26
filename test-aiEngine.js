const { processMessage } = require('./services/aiEngine');

async function runTest() {
    console.log("🚀 MENGUJI AI ENGINE LOKAL (DUAL-LLM) 🚀\n");

    const session = "Test-Session";
    const sender = "6285196749541"; // Owner
    
    // Uji 1: Chat biasa (CS)
    const history1 = [];
    console.log("[USER] : halo, jam buka kapan?");
    const reply1 = await processMessage(session, sender, "halo, jam buka kapan?", history1);
    console.log(`[AI]   : ${reply1}\n`);

    // Uji 2: Admin Command
    const history2 = [{ role: 'user', content: 'buatkan ringkasan data perusahaan' }];
    console.log("[USER] : buatkan ringkasan data perusahaan");
    const reply2 = await processMessage(session, sender, "buatkan ringkasan data perusahaan", history2);
    console.log(`[AI]   : ${reply2}\n`);

    console.log("✅ PENGUJIAN SELESAI");
}

runTest();
