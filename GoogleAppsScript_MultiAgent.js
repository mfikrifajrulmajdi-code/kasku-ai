/* ================================================================
   KASKU AI - MULTI-AGENT SYSTEM
   Versi: 3.0 (Tahap 1: Router, Finance, CS/Sales)
   ================================================================ */

const CONFIG = {
  MODEL_NAME:     "llama-3.3-70b-versatile",
  GROQ_URL:       "https://api.groq.com/openai/v1/chat/completions",
  SHEET_TRANSAKSI: "Transaksi",
  SHEET_REKENING:  "Rekening",
  SHEET_KATALOG:   "Katalog",
  SHEET_FAQ:       "FAQ",
  DEFAULT_REKENING: "Cash",
  MAX_RETRIES:    2,
};

function getConfig_(key) {
  const val = PropertiesService.getScriptProperties().getProperty(key);
  if (!val) throw new Error(`Script Property '${key}' belum diset.`);
  return val;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return respond_("⏳ Sistem sibuk, coba lagi nanti.");
  let session = "-", from = "-", pesan = "";
  try {
    if (!e || !e.postData) return respond_("❌ Payload kosong.");
    const data = safeParseJson_(e.postData.contents);
    pesan   = (data.body || "").trim();
    session = data.session || "-";
    from    = data.from || "-";
    if (!pesan) return respond_("❌ Pesan kosong.");

    const ss = SpreadsheetApp.openById(getConfig_("SPREADSHEET_ID"));
    const pesanLower = pesan.toLowerCase();

    // ── COMMAND KHUSUS (Prioritas Tertinggi) ──
    if (pesanLower.startsWith("saldo")) return respond_(handleSaldo_(ss, pesan));

    // ── 1. ROUTER AGENT (Deteksi Niat Pengguna) ──
    const intent = routerAgent(pesan);
    
    // ── 2. DISTRIBUTION (Membagi Tugas ke Agen Spesialis) ──
    if (intent === "FINANCE") {
       return respond_(financeAgent(ss, pesan, session, from));
    } else if (intent === "CS_SALES") {
       return respond_(csSalesAgent(ss, pesan));
    } else {
       return respond_("Maaf, saya tidak mengerti maksud pesan Anda.");
    }

  } catch (err) {
    return respond_(`❌ Terjadi kesalahan: ${err.message}`);
  } finally {
    lock.releaseLock();
  }
}

/* ================================================================
   AGEN 1: ROUTER
================================================================ */
function routerAgent(pesan) {
  const sys = `You are an Intent Classifier Agent. 
Rules:
1. If the message is clearly about spending money, receiving money, buying, or logging an expense (e.g. "makan 20rb", "gaji 5jt", "beli bensin 50000"), output exactly: {"intent": "FINANCE"}
2. If the message is a general question, asking for product price, greeting, chatting, or complaining, output exactly: {"intent": "CS_SALES"}
Output ONLY pure JSON format.`;
  
  const user = `Message: "${pesan}"`;
  const result = panggilGroq_(sys, user, 50);
  return result.intent || "CS_SALES";
}

/* ================================================================
   AGEN 2: FINANCE (Akuntan)
================================================================ */
function financeAgent(ss, pesan, session, from) {
  const sys = "You are an Indonesian financial extractor. Output JSON array 'data'. Format: {\"data\":[{\"cat\":\"string\",\"amt\":number,\"type\":\"Masuk|Keluar\",\"rek\":\"string\"}]}";
  const user = `Message: "${pesan}". Rules: cat(Makan,Transport,Gaji,dll), amt(integer), type(Masuk/Keluar), rek(BCA,Cash,dll).`;
  
  const transactions = panggilGroq_(sys, user, 300);
  if (!transactions || !transactions.data || transactions.data.length === 0) return "⚠️ Tidak ada transaksi yang dikenali.";
  
  if (transactions.data[0].cat === "Umum" || transactions.data[0].amt === 0) {
      // Jika AI Finance bingung, fallback ke CS.
      return csSalesAgent(ss, pesan);
  }

  let balasan = "📝 *Transaksi Tercatat*\n━━━━━━━━━━━━━━━━━━\n";
  transactions.data.forEach((ai) => {
    ai.amt = Math.abs(Number(ai.amt)||0);
    const rekening = (ai.rek || CONFIG.DEFAULT_REKENING).trim();
    appendTransaksi_(ss, session, from, pesan, ai);
    updateSaldo_(ss, rekening, ai.amt, ai.type);
    balasan += `• [${rekening}] ${ai.cat}: Rp ${fmt_(ai.amt)} (${ai.type === "Masuk"?"📈":"📉"})\n`;
  });
  balasan += "━━━━━━━━━━━━━━━━━━\n✅ Semua berhasil disimpan";
  return balasan;
}

/* ================================================================
   AGEN 3: CS & SALES (Customer Service)
================================================================ */
function csSalesAgent(ss, pesan) {
  // Ambil Data Knowledge Base dari Spreadsheet (Agar AI pintar jualan)
  const katalog = getKatalogText_(ss);
  const faq = getFaqText_(ss);

  const sys = `You are Aika, a friendly, energetic, and persuasive Customer Service and Sales agent for KasKu.
Rules:
1. Speak in friendly, polite Indonesian slang (use "Kak", "aku").
2. Use emojis naturally.
3. Answer based on this Information ONLY:
[KATALOG PRODUK]:
${katalog}

[INFO TOKO (FAQ)]:
${faq}

If the user asks something outside this knowledge, apologize politely and say you don't know. If they ask about a product, try to persuade them to buy (soft selling). Do NOT make up prices or products.`;

  const user = `Customer Message: "${pesan}"`;
  
  // Karena membalas chat bebas, kita pakai output Teks biasa (Bukan JSON)
  const result = panggilGroqChat_(sys, user);
  return result;
}

/* ================================================================
   GROQ API CALLERS (Mesin AI)
================================================================ */
function panggilGroq_(systemPrompt, userPrompt, maxTokens) {
  const payload = {
    model: CONFIG.MODEL_NAME,
    messages: [ { role: "system", content: systemPrompt }, { role: "user", content: userPrompt } ],
    temperature: 0,
    max_tokens: maxTokens,
    response_format: { type: "json_object" }
  };
  return execGroq(payload);
}

function panggilGroqChat_(systemPrompt, userPrompt) {
  const payload = {
    model: CONFIG.MODEL_NAME,
    messages: [ { role: "system", content: systemPrompt }, { role: "user", content: userPrompt } ],
    temperature: 0.7, // Lebih kreatif & supel untuk sales
    max_tokens: 400
  };
  const res = execGroqRaw(payload);
  return res.trim();
}

function execGroq(payload) {
  const raw = execGroqRaw(payload);
  try { return JSON.parse(raw); } catch(e) { return {}; }
}

function execGroqRaw(payload) {
  const apiKey = getConfig_("GROQ_API_KEY");
  const options = {
    method: "post", contentType: "application/json",
    headers: { Authorization: `Bearer ${apiKey}` },
    payload: JSON.stringify(payload), muteHttpExceptions: true
  };
  let lastErr;
  for (let i = 1; i <= CONFIG.MAX_RETRIES + 1; i++) {
    try {
      const res = UrlFetchApp.fetch(CONFIG.GROQ_URL, options);
      const json = JSON.parse(res.getContentText());
      if (!json.choices) throw new Error("No choices from Groq");
      return json.choices[0].message.content;
    } catch (err) { lastErr = err; Utilities.sleep(500 * i); }
  }
  throw new Error(lastErr.message);
}

/* ================================================================
   SPREADSHEET HELPERS
================================================================ */
function getKatalogText_(ss) {
  const sheet = getOrCreateSheet_(ss, CONFIG.SHEET_KATALOG, ["Nama Barang", "Harga", "Stok", "Deskripsi Tambahan"]);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return "Belum ada produk di katalog.";
  return data.slice(1).map(row => `- ${row[0]}: Rp ${fmt_(row[1])} (Sisa Stok: ${row[2]}). Info: ${row[3]}`).join("\n");
}

function getFaqText_(ss) {
  const sheet = getOrCreateSheet_(ss, CONFIG.SHEET_FAQ, ["Pertanyaan / Info PENTING", "Jawaban"]);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return "Belum ada info FAQ.";
  return data.slice(1).map(row => `Q: ${row[0]}\nA: ${row[1]}`).join("\n\n");
}

function appendTransaksi_(ss, session, from, pesan, ai) {
  const sheet = getOrCreateSheet_(ss, CONFIG.SHEET_TRANSAKSI, ["Timestamp", "Session", "From", "Pesan", "Kategori", "Jumlah", "Tipe", "Rekening"]);
  sheet.appendRow([new Date(), session, from, pesan, ai.cat, ai.amt, ai.type, ai.rek]);
}

function updateSaldo_(ss, rekening, amt, type) {
  const sheet = getOrCreateSheet_(ss, CONFIG.SHEET_REKENING, ["Rekening", "Saldo"]);
  const data = sheet.getDataRange().getValues();
  const rLower = rekening.toLowerCase();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().toLowerCase() === rLower) {
      const cur = Number(data[i][1])||0;
      sheet.getRange(i+1, 2).setValue(type==="Masuk"?cur+amt:cur-amt); return;
    }
  }
  sheet.appendRow([rekening, type==="Masuk"?amt:-amt]);
}

function getSaldo_(ss, rekening) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_REKENING); if(!sheet) return 0;
  const d = sheet.getDataRange().getValues(), r = rekening.toLowerCase();
  for(let i=1;i<d.length;i++) if(d[i][0].toString().toLowerCase()===r) return Number(d[i][1])||0; return 0;
}

function getAllSaldo_(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_REKENING); if(!sheet) return "⚠️ Belum ada rekening.";
  const data = sheet.getDataRange().getValues(); if(data.length<=1) return "ℹ️ Belum ada saldo tercatat.";
  let out = "💰 *Ringkasan Saldo*\n━━━━━━━━━━━━━━━━━━\n", tot=0;
  for(let i=1;i<data.length;i++){ out += `▪️ ${data[i][0]}: Rp ${fmt_(data[i][1])}\n`; tot+=Number(data[i][1])||0; }
  return out + `━━━━━━━━━━━━━━━━━━\n💼 *Total: Rp ${fmt_(tot)}*`;
}

function handleSaldo_(ss, pesan) {
  const p = pesan.trim().split(/\s+/); return p.length>1 ? `💰 *${p[1]}*: Rp ${fmt_(getSaldo_(ss, p[1]))}` : getAllSaldo_(ss);
}

function getOrCreateSheet_(ss, name, headers) {
  let s = ss.getSheetByName(name);
  if (!s) { 
      s = ss.insertSheet(name); 
      s.appendRow(headers); 
      s.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#4A90D9").setFontColor("#FFFFFF"); 
  }
  return s;
}

function fmt_(x) { return (Number(x)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function safeParseJson_(str) { try { return JSON.parse(str); } catch (_) { return null; } }
function respond_(text) { return ContentService.createTextOutput(JSON.stringify({reply: text})).setMimeType(ContentService.MimeType.JSON); }
