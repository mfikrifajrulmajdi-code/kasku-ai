const axios = require('axios');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'config', 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const GROQ_API_KEY = db.groqApiKey;
const MODEL_NAME = "llama-3.3-70b-versatile";

// Mock Katalog
const KATALOG = `- Produk: Sepatu 1 (SKU: 1)\n  Harga: Rp 100\n  Sisa Stok: 10\n- Produk: Sepatu 2 (SKU: 2)\n  Harga: Rp 200\n  Sisa Stok: 5`;

async function callGroq(sysPrompt, historyArray, jsonMode = false) {
  let messages = [{ role: 'system', content: sysPrompt }];
  if (historyArray) messages = messages.concat(historyArray);

  const payload = {
    model: MODEL_NAME,
    messages: messages,
    temperature: jsonMode ? 0 : 0.7,
    max_tokens: 500
  };
  if (jsonMode) payload.response_format = { type: "json_object" };

  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', payload, {
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
    });
    return res.data.choices[0].message.content;
  } catch (err) {
    console.error("Groq Error:", err.response ? err.response.data : err.message);
    return null;
  }
}

async function runE2ETest() {
  console.log("🚀 MEMULAI END-TO-END TESTING LOKAL 🚀\n");

  const history = [];

  // Simulasi Obrolan 1: Chat Awal
  let userMsg = "Saya mau order Sepatu yang sepatu 1";
  history.push({ role: 'user', content: userMsg });
  console.log(`[USER] : ${userMsg}`);

  // Router
  let routerSys = `You are an Intent Classifier Agent. Analyze the conversation history and the latest message.
Rules:
1. FINANCE: User is logging expenses or income.
2. OPS: User is actively ordering, checking out, confirming order, OR providing shipping address/location.
3. ADMIN: Command to a virtual assistant.
4. CS_SALES: General question, asking for product price, chatting, or if the intent is ambiguous.

Output ONLY pure JSON format: {"intent": "FINANCE" | "OPS" | "ADMIN" | "CS_SALES"}`;
  
  let routerRes = await callGroq(routerSys, history, true);
  let intent = JSON.parse(routerRes).intent;
  console.log(`[ROUTER DETECTS] : ${intent}`);

  // Ops Agent
  let opsSys = `You are an Operations Agent handling order checkouts.
[KATALOG]:
${KATALOG}

Analyze the conversation history.
1. If the user is confirming an order or mentioning an item, you MUST output a fully formed conversational sentence in the "reply" field confirming the order and asking for their full address.
2. If the user provides an address (like "di bali", "jakarta", etc), you MUST output a fully formed conversational sentence in the "reply" field stating the total price from the catalog and providing payment instructions (Transfer BCA 12345).

CRITICAL: DO NOT output template instructions like "Pesan ramah konfirmasi". You MUST generate the actual Indonesian conversational reply that the user will read.

Output JSON Format:
{"sku_ditemukan": "SKU_JIKA_ADA", "jumlah": 1, "reply": "Tulis kalimat balasan sungguhan di sini"}
`;

  let opsRes = await callGroq(opsSys, history, true);
  let reply1 = JSON.parse(opsRes).reply;
  console.log(`[OPS AGENT] : ${reply1}\n`);
  history.push({ role: 'assistant', content: reply1 });

  // Simulasi Obrolan 2: Balasan "iya"
  userMsg = "iya";
  history.push({ role: 'user', content: userMsg });
  console.log(`[USER] : ${userMsg}`);
  
  routerRes = await callGroq(routerSys, history, true);
  intent = JSON.parse(routerRes).intent;
  console.log(`[ROUTER DETECTS] : ${intent}`);

  opsRes = await callGroq(opsSys, history, true);
  let reply2 = JSON.parse(opsRes).reply;
  console.log(`[OPS AGENT] : ${reply2}\n`);
  history.push({ role: 'assistant', content: reply2 });

  // Simulasi Obrolan 3: Balasan lokasi
  userMsg = "bali bali bali";
  history.push({ role: 'user', content: userMsg });
  console.log(`[USER] : ${userMsg}`);

  routerRes = await callGroq(routerSys, history, true);
  intent = JSON.parse(routerRes).intent;
  console.log(`[ROUTER DETECTS] : ${intent}`);

  opsRes = await callGroq(opsSys, history, true);
  let reply3 = JSON.parse(opsRes).reply;
  console.log(`[OPS AGENT] : ${reply3}\n`);

  console.log("✅ E2E TESTING SELESAI");
}

runE2ETest();
