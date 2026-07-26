/* ================================================================
   KASKU AI - MULTI-AGENT SYSTEM
   Versi: 4.0 (Enterprise - Admin, Ops, Finance, CS/Sales)
   ================================================================ */

const CONFIG = {
  MODEL_NAME:     "llama-3.3-70b-versatile",
  GROQ_URL:       "https://api.groq.com/openai/v1/chat/completions",
  SHEET_TRANSAKSI: "Transaksi",
  SHEET_REKENING:  "Rekening",
  SHEET_KATALOG:   "Katalog",
  SHEET_FAQ:       "FAQ",
  DEFAULT_REKENING: "Cash",
  OWNER_PHONE:    "6285196749541", // Nomor Bos
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
    
    // Normalisasi Nomor Pengirim (Misal dari 6285196749541@s.whatsapp.net menjadi 6285196749541)
    const senderNumber = from.replace(/\D/g, "");
    const isOwner = (senderNumber === CONFIG.OWNER_PHONE);

    // ── COMMAND KHUSUS (Prioritas Tertinggi) ──
    if (pesanLower.startsWith("saldo")) return respond_(handleSaldo_(ss, pesan));

    // ── 1. ROUTER AGENT (Deteksi Niat Pengguna) ──
    const intent = routerAgent(pesan, isOwner);
    
    // ── 2. DISTRIBUTION (Membagi Tugas ke Agen Spesialis) ──
    if (intent === "FINANCE") {
       return respond_(financeAgent(ss, pesan, session, from));
    } else if (intent === "OPS") {
       return respond_(opsAgent(ss, pesan));
    } else if (intent === "ADMIN") {
       if (!isOwner) {
           return respond_("Akses Ditolak. Anda bukan pemilik (Owner).");
       }
       return respond_(adminAgent(ss, pesan));
    } else {
       return respond_(csSalesAgent(ss, pesan));
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
function routerAgent(pesan, isOwner) {
  let sys = `You are an Intent Classifier Agent. 
Rules:
1. FINANCE: If the message is clearly about spending money, receiving money, buying for personal tracking, or logging an expense (e.g. "makan 20rb", "gaji 5jt", "beli bensin 50000").
2. OPS: If the message is a customer trying to order/checkout (e.g. "Saya mau beli sepatu dong", "Pesan 2 ya kak", "Alamat saya di jakarta").
3. ADMIN: If the message is a command to a virtual assistant (e.g. "Tolong buatkan draf promo", "rekap penjualan", "berikan ide bisnis").
4. CS_SALES: If the message is a general question, asking for product price, greeting, chatting, or complaining.

Output ONLY pure JSON format: {"intent": "FINANCE" | "OPS" | "ADMIN" | "CS_SALES"}
`;
  
  const user = `Message: "${pesan}"`;
  const result = panggilGroq_(sys, user, 50);
  
  let finalIntent = result.intent || "CS_SALES";
  
  // Keamanan: Cegah orang biasa mengeksekusi ADMIN
  if (finalIntent === "ADMIN" && !isOwner) {
      finalIntent = "CS_SALES";
  }
  
  return finalIntent;
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
      // Fallback
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
  const katalog = getKatalogText_(ss);
  const faq = getFaqText_(ss);

  const sys = `You are Aika, a friendly, energetic Customer Service and Sales agent for KasKu.
Rules:
1. Speak in polite Indonesian slang ("Kak", "aku").
2. Use emojis naturally.
3. Answer based ONLY on this Info:
[KATALOG]: ${katalog}
[FAQ]: ${faq}
If user asks about products, try soft-selling. Do not make up info.`;

  const user = `Customer: "${pesan}"`;
  return panggilGroqChat_(sys, user);
}

/* ================================================================
   AGEN 4: OPERASIONAL (Gudang & Checkout)
================================================================ */
function opsAgent(ss, pesan) {
  const katalog = getKatalogText_(ss);
  
  const sys = `You are an Operations Agent handling order checkouts.
Your job is to identify what the user wants to buy from the catalog.
[KATALOG]:
${katalog}

If the user mentions an item, output JSON:
{"sku_ditemukan": "SKU", "jumlah": 1, "reply": "Pesan untuk meminta alamat dan nama pelanggan"}

If the user provides an address, output JSON:
{"reply": "Pesan bahwa order sedang diproses dan instruksi pembayaran"}

Always output pure JSON.`;

  const user = `Customer: "${pesan}"`;
  const result = panggilGroq_(sys, user, 300);
  
  // Auto-Kurangi Stok jika sku terdeteksi (Simulasi Sederhana)
  if (result.sku_ditemukan) {
      kurangiStok_(ss, result.sku_ditemukan, result.jumlah || 1);
  }
  
  return result.reply || "Boleh diinfokan pesanan detail beserta alamatnya Kak?";
}

/* ================================================================
   AGEN 5: ADMIN (Asisten Pribadi Owner)
================================================================ */
function adminAgent(ss, pesan) {
  // Khusus Owner, kita berikan AI kemampuan penuh tanpa batasan Katalog
  const sys = `You are a highly capable Executive Virtual Assistant for the Owner of this business.
You are extremely smart, professional, and helpful. You can help draft promos, analyze text, or answer general knowledge questions.
Address the owner respectfully.`;

  const user = `Owner: "${pesan}"`;
  return panggilGroqChat_(sys, user);
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
    temperature: 0.7,
    max_tokens: 500
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
  const sheet = getOrCreateSheet_(ss, CONFIG.SHEET_KATALOG, ["SKU", "Nama Barang", "Harga", "Stok"]);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return "Belum ada produk di katalog.";
  return data.slice(1).map(row => `- Produk: ${row[1]} (SKU: ${row[0]})\n  Harga: Rp ${fmt_(row[2])}\n  Sisa Stok: ${row[3]}`).join("\n\n");
}

function kurangiStok_(ss, sku, jumlah) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_KATALOG);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
     if (data[i][0].toString().toLowerCase() === sku.toString().toLowerCase()) {
         const currentStock = Number(data[i][3]) || 0;
         if (currentStock >= jumlah) {
             sheet.getRange(i+1, 4).setValue(currentStock - jumlah);
         }
         break;
     }
  }
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
