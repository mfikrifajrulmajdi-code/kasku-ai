const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getConfig, setConfig } = require('../config/db');
const { processMessage } = require('./aiEngine');

const queueService = require('./queueService');
const abandonedCartService = require('./abandonedCartService');
const inboxStore = require('./inboxStore');
const deliveryLogStore = require('./deliveryLogStore');
const groupAutomationService = require('./groupAutomationService');

const cron = require('node-cron');



// ============================================
// WhatsApp Service — Baileys Engine
// ============================================

let currentStatus = 'disconnected'; // disconnected | waiting_scan | connected
let currentQR = null;
let ioInstance = null;
let sock = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 5;
const SESSION_DIR = path.join(__dirname, '..', 'sessions');

// In-Memory Store untuk Riwayat Obrolan (Maksimal 10 per user)
const memoryStore = {};

// ============================================
// Improvement #7 & #8: Per-Chat Queue & Rate Limiting
// ============================================
// Note: chatQueues = prevents duplicate processing of same sender's messages.
// This is different from services/queueService.js which rate-limits outbound WhatsApp replies to avoid Meta ban.
const chatQueues = {}; // { sender: Promise }
const rateLimits = {}; // { sender: { count, lastReset } }
const MAX_MESSAGES_PER_MINUTE = 10;

// Cleanup expired rate limits & stale memory every 30 minutes
setInterval(() => {
    const now = Date.now();
    for (const sender in rateLimits) {
        if (now - rateLimits[sender].lastReset > 300000) { // 5 min stale
            delete rateLimits[sender];
        }
    }
    // Cap memoryStore: remove entries older than 2 hours of inactivity
    const MAX_MEMORY_ENTRIES = 500;
    const keys = Object.keys(memoryStore);
    if (keys.length > MAX_MEMORY_ENTRIES) {
        const toRemove = keys.slice(0, keys.length - MAX_MEMORY_ENTRIES);
        toRemove.forEach(k => delete memoryStore[k]);
        console.log(`[MEMORY-CLEANUP] 🧹 Dibersihkan ${toRemove.length} entry memori lama.`);
    }
}, 30 * 60 * 1000);

function isRateLimited(sender) {
  const now = Date.now();
  if (!rateLimits[sender] || now - rateLimits[sender].lastReset > 60000) {
    rateLimits[sender] = { count: 0, lastReset: now };
  }
  rateLimits[sender].count++;
  return rateLimits[sender].count > MAX_MESSAGES_PER_MINUTE;
}

function enqueueMessage(sender, fn) {
  if (!chatQueues[sender]) {
    chatQueues[sender] = Promise.resolve();
  }
  const next = chatQueues[sender].then(fn).catch(err => {
    console.error(`[QUEUE ERROR] ${sender}:`, err);
  });
  chatQueues[sender] = next;
  return next;
}

// Mulai WhatsApp service dengan Baileys
async function start(io) {
  ioInstance = io;
  console.log('📱 WhatsApp Service dimulai...');

  try {
    await connectToWhatsApp();
  } catch (err) {
    console.error('❌ Gagal memulai WhatsApp Service:', err.message);
    emitLog('Gagal memulai WhatsApp: ' + err.message, 'error');
    updateStatus('disconnected');
  }
}

// Koneksi utama ke WhatsApp
async function connectToWhatsApp() {
  // Inisialisasi auth state (persistent session)
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  
  // Ambil versi WA terbaru agar tidak ditolak server
  const { version, isLatest } = await fetchLatestBaileysVersion();
  console.log(`📱 Menggunakan WA v${version.join('.')} (isLatest: ${isLatest})`);

  // Buat socket WhatsApp
  sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // QR ditampilkan di Web UI, bukan terminal
    browser: Browsers.macOS('Desktop'),
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    retryRequestDelayMs: 250,
  });

  // ---- Event: Connection Update ----
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // QR Code baru dari WhatsApp
    if (qr) {
      console.log('📸 QR Code baru diterima dari WhatsApp');
      reconnectAttempts = 0; // Reset reconnect counter saat QR muncul

      try {
        // Convert QR string ke base64 image
        const qrBase64 = await QRCode.toDataURL(qr, {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });
        currentQR = qrBase64;
        updateStatus('waiting_scan');

        // Kirim ke semua client via Socket.IO
        if (ioInstance) {
          ioInstance.emit('qr', { qr: qrBase64 });
        }
        emitLog('QR Code baru — silakan scan dengan WhatsApp', 'info');
      } catch (err) {
        console.error('❌ Gagal generate QR image:', err);
      }
    }

    // Koneksi berhasil terbuka
    if (connection === 'open') {
      console.log('✅ WhatsApp terhubung!');
      currentQR = null;
      reconnectAttempts = 0;

      // Ambil nomor telepon yang terhubung
      const phoneNumber = sock.user?.id?.split(':')[0] || sock.user?.id || 'Unknown';

      updateStatus('connected', phoneNumber);
      
      // Mulai Cron Job Recovery Keranjang Ditinggalkan (Agen Gita Marketing)
      abandonedCartService.startAbandonedCartCron(async (targetJid, content) => {
          if (sock) await sock.sendMessage(targetJid, content);
      });

      if (ioInstance) {
        ioInstance.emit('qr', { qr: null }); // Hapus QR
      }
      emitLog(`Terhubung sebagai ${phoneNumber}`, 'success');
    }

    // Koneksi tertutup
    if (connection === 'close') {
      currentQR = null;

      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.output?.payload?.message || 'Unknown';

      console.log(`🔌 Koneksi ditutup. Status: ${statusCode}, Alasan: ${reason}`);
      updateStatus('disconnected');

      // Cek apakah perlu reconnect
      if (statusCode === DisconnectReason.loggedOut) {
        // User logout manual — hapus session dan jangan reconnect
        console.log('🚪 Logout terdeteksi. Menghapus session...');
        emitLog('Logout dari WhatsApp. Session dihapus.', 'error');
        clearSession();
        // Reconnect untuk generate QR baru setelah delay
        setTimeout(() => {
          reconnectAttempts = 0;
          connectToWhatsApp().catch(err => {
            console.error('❌ Gagal restart setelah logout:', err.message);
          });
        }, 5000);
      } else if (reconnectAttempts < MAX_RECONNECT) {
        // Error jaringan atau lainnya — coba reconnect
        reconnectAttempts++;
        const delay = Math.min(reconnectAttempts * 3000, 15000);
        console.log(`🔄 Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT} dalam ${delay / 1000}s...`);
        emitLog(`Reconnect ${reconnectAttempts}/${MAX_RECONNECT}...`, 'info');
        setTimeout(() => {
          connectToWhatsApp().catch(err => {
            console.error('❌ Gagal reconnect:', err.message);
          });
        }, delay);
      } else {
        console.log('❌ Melebihi batas reconnect. Menunggu perintah manual...');
        emitLog('Gagal terhubung setelah beberapa percobaan. Klik Logout lalu restart untuk mencoba lagi.', 'error');
      }
    }
  });

  // ---- Event: Credentials Update ----
  sock.ev.on('creds.update', saveCreds);

  // ---- Event: ACK Status Update (Centang 1, Centang 2 Abu, Centang Biru) ----
  sock.ev.on('messages.update', (updates) => {
    for (const update of updates) {
      if (update.key && update.key.id && update.update && update.update.status !== undefined) {
        deliveryLogStore.updateACKStatus(update.key.id, update.update.status);
      }
    }
  });

  // ---- Event: WhatsApp Group Member Joined (Group Greeter) ----
  sock.ev.on('group-participants.update', (update) => {
    groupAutomationService.handleGroupParticipantsUpdate(sock, update);
  });

  // ---- Event: Pesan Masuk ----
  sock.ev.on('messages.upsert', async ({ type, messages }) => {
    // Hanya proses pesan real-time (bukan history sync)
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        // Skip pesan dari bot sendiri
        if (msg.key.fromMe) continue;

        // Ambil teks pesan
        let messageText = extractMessageText(msg) || "";
        let imageData = null;

        if (msg.message?.imageMessage) {
            console.log("📸 Gambar terdeteksi, mengunduh...");
            emitLog("Mendownload gambar...", "info");
            try {
                const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: console });
                imageData = {
                    mimetype: msg.message.imageMessage.mimetype,
                    data: buffer.toString('base64')
                };
                if (!messageText) messageText = "[Mengirimkan Gambar]";
            } catch (err) {
                console.error("Gagal mendownload gambar:", err);
            }
        }
        
        // --- 🎙️ INTERCEPT VOICE NOTE (PESAN SUARA) ---
        if (msg.message?.audioMessage) {
            console.log("🎙️ Pesan suara (Voice Note) terdeteksi, mengunduh...");
            emitLog("Mendownload Voice Note untuk diubah ke Teks...", "info");
            try {
                const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger: console });
                const sttResult = await transcribeAudio(buffer);
                console.log(`[STT RESULT]: ${sttResult}`);
                messageText = sttResult; // Timpa messageText dengan hasil transkripsi
                
                // Beri tahu user bahwa bot sedang mendengarkan
                await sock.sendMessage(msg.key.remoteJid, { text: `*(Mendengarkan Voice Note)*: "${sttResult}"\n_Tunggu sebentar, Hadi sedang mencatat..._` });
            } catch (err) {
                console.error("Gagal memproses Voice Note:", err);
                await sock.sendMessage(msg.key.remoteJid, { text: "⚠️ Maaf Bos, saya gagal mencerna pesan suaranya. Coba ketik aja ya." });
                continue; // Skip processing if audio fails
            }
        }

        if (!messageText) continue;

        const sender = msg.key.remoteJid;
        const pushName = msg.pushName || 'Unknown';

        console.log(`💬 Pesan dari ${pushName} (${sender}): ${messageText}`);
        emitLog(`Pesan dari ${pushName}: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`, 'info');

        // Catat ke Inbox Live Chat
        inboxStore.recordInboxMessage('default', sender, pushName, messageText, 'incoming');

        // Cek apakah Human CS Takeover aktif untuk nomor ini
        if (inboxStore.isTakeoverActive('default', sender)) {
          console.log(`[TAKEOVER-ACTIVE] 👤 Human CS Takeover aktif untuk ${pushName} (${sender}). AI auto-reply dilewati.`);
          emitLog(`Human CS Takeover aktif untuk ${pushName}, AI dilewati.`, 'info');
          continue;
        }

        // Baca konfigurasi
        const config = getConfig();

        // Cek prefix (jika diatur)
        if (config.prefix && !messageText.startsWith(config.prefix)) {
          continue;
        }

        // Cek auto-reply aktif
        if (!config.autoReply) {
          emitLog('Auto-reply nonaktif, pesan diabaikan', 'info');
          continue;
        }

        // Cek webhook URL
        if (!config.webhookUrl) {
          console.log('⚠️ Webhook URL belum diatur. Pesan tidak diteruskan.');
          emitLog('Webhook URL belum diatur!', 'error');
          continue;
        }

        // Kirim pesan ke Google Apps Script via webhook
        const cleanMessage = config.prefix
          ? messageText.replace(config.prefix, '').trim()
          : messageText;

        // Simpan ke memori (User)
        if (!memoryStore[sender]) memoryStore[sender] = [];
        memoryStore[sender].push({ role: 'user', content: cleanMessage });
        
        // Batasi memori maksimal 10 pesan (agar tidak terlalu berat)
        if (memoryStore[sender].length > 10) {
            memoryStore[sender] = memoryStore[sender].slice(-10);
        }

        // Cek Rate Limit (Anti-Spam)
        if (isRateLimited(sender)) {
          console.log(`⚠️ Rate limit exceeded for ${sender}`);
          emitLog(`Rate limit terlampaui untuk ${pushName}`, 'warn');
          await sock.sendMessage(sender, { text: '⚠️ Mohon maaf, Anda terlalu cepat mengirim pesan. Mohon tunggu beberapa detik lagi ya...' });
          continue;
        }

        // Processing via Per-Chat Queue (Anti-Duplikasi Balasan)
        await enqueueMessage(sender, async () => {
          // Panggil AI Engine Lokal (Dual-LLM Fallback)
          emitLog('🤖 Memproses AI secara lokal...', 'info');
          const response = await processMessage("KasKu-AI", sender, cleanMessage, memoryStore[sender], imageData);

          // Kirim balasan ke pengirim WhatsApp
          if (response) {
            let responseText = response;
            let isInvoice = false;
            let invoicePath = null;
            let isCrossChat = false;
            let crossChatTarget = null;
            let crossChatMsg = null;
            
            try {
                const parsed = JSON.parse(response);
                if (parsed.type === "INVOICE_GENERATED") {
                    responseText = parsed.reply;
                    isInvoice = true;
                    invoicePath = parsed.filePath;
                } else if (parsed.type === "CROSS_CHAT") {
                    responseText = parsed.replyToSender;
                    isCrossChat = true;
                    
                    // Deteksi nomor HP atau Vendor A
                    let targetNo = parsed.target;
                    if (targetNo === "VENDOR_A") {
                        targetNo = "628985335666"; // Nomor testing dari Bos
                    } else {
                        // Bersihkan angka (hilangkan 0 di depan, ganti 62)
                        if (targetNo.startsWith('0')) targetNo = '62' + targetNo.substring(1);
                        targetNo = targetNo.replace(/[^0-9]/g, '');
                    }
                    
                    crossChatTarget = targetNo + "@s.whatsapp.net";
                    crossChatMsg = parsed.pesan;
                }
            } catch(e) {}
            
            // Simpan balasan bot ke memori
            memoryStore[sender].push({ role: 'assistant', content: responseText });
            if (memoryStore[sender].length > 10) {
                memoryStore[sender] = memoryStore[sender].slice(-10);
            }

            if (isInvoice && invoicePath) {
                await sock.sendMessage(sender, { 
                    document: require('fs').readFileSync(invoicePath), 
                    mimetype: 'application/pdf', 
                    fileName: `Invoice_KasKu_${Date.now()}.pdf`,
                    caption: responseText
                });
            } else if (responseText.includes("[KIRIM_BROSUR]")) {
                responseText = responseText.replace("[KIRIM_BROSUR]", "").trim();
                responseText += "\n\n🌐 *Katalog Lengkap & Beli Instan:* http://localhost:3000/katalog";
                
                const brosurPath = path.join(__dirname, '..', 'public', 'images', 'brosur.jpg');
                if (require('fs').existsSync(brosurPath)) {
                    await sock.sendMessage(sender, {
                        image: require('fs').readFileSync(brosurPath),
                        caption: responseText
                    });
                } else {
                    await sock.sendMessage(sender, { text: responseText });
                }
            } else {
                await sock.sendMessage(sender, { text: responseText });
            }
            
            // Eksekusi Cross-Chat jika ada
            if (isCrossChat && crossChatTarget && crossChatMsg) {
                emitLog(`🔄 CROSS-CHAT: Mengirim pesan dari Joko ke Target (${crossChatTarget})`, 'info');
                try {
                    await sock.sendMessage(crossChatTarget, { 
                        text: `${crossChatMsg}`
                    });
                    emitLog(`✅ CROSS-CHAT Berhasil ke ${crossChatTarget}`, 'success');
                } catch (err) {
                    emitLog(`❌ Gagal CROSS-CHAT: ${err.message}`, 'error');
                }
            }
            
            console.log(`📤 Balasan terkirim ke ${pushName}`);
            emitLog(`Balasan terkirim ke ${pushName}`, 'success');
          }
        });


      } catch (err) {
        console.error('❌ Error memproses pesan:', err.message);
        emitLog(`Error: ${err.message}`, 'error');
      }
    }
  });

  // ============================================
  // CRON JOBS: ASISTEN PROAKTIF
  // ============================================
  cron.schedule('0 17 * * *', async () => {
      console.log('⏰ Menjalankan Cron: Laporan Harian Sore');
      emitLog('Menjalankan Asisten Proaktif Sore', 'info');
      
      try {
          const aiConf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'ai-config.json')));
          // Default Owner JID (fallback ke nomor yg terdaftar di memori log/di-hardcode untuk demo)
          const targetJid = "153463694602350@lid"; 
          
          if (sock && currentStatus === 'connected') {
              const proactiveMessage = "🌅 *Halo Bos!* Toko sudah mau tutup nih. Apakah ada transaksi pengeluaran tunai hari ini yang belum dicatat? Kalau ada, langsung ketik aja ya! - *Hadi (Finance)*";
              await sock.sendMessage(targetJid, { text: proactiveMessage });
              emitLog('Pesan proaktif sore berhasil dikirim', 'success');
          }
      } catch (err) {
          console.error("Gagal menjalankan cron", err);
      }
  });

}

// ---- Helper: Ekstrak teks dari berbagai jenis pesan ----
function extractMessageText(msg) {
  const message = msg.message;
  if (!message) return null;

  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    null
  );
}

// ---- Helper: Kirim data ke Google Apps Script ----
async function forwardToWebhook(webhookUrl, payload) {
  try {
    console.log(`🔗 Mengirim ke webhook: ${webhookUrl}`);
    emitLog('Mengirim ke webhook...', 'info');

    const { data } = await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      maxRedirects: 5,
    });

    // Parse response — mendukung berbagai format GAS
    let replyText = null;

    if (typeof data === 'string') {
      replyText = data;
    } else if (typeof data === 'object') {
      replyText = data.reply || data.message || data.text || data.response || null;
    }

    if (replyText) {
      console.log(`📨 Response dari webhook: ${replyText.substring(0, 100)}`);
      emitLog('Response diterima dari webhook', 'success');
    } else {
      console.log('📨 Webhook merespons tanpa balasan teks');
      emitLog('Webhook merespons (tanpa balasan)', 'info');
    }

    return replyText;

  } catch (err) {
    console.error('❌ Gagal mengirim ke webhook:', err.message);
    emitLog(`Webhook error: ${err.message}`, 'error');
    return null;
  }
}

// ---- Helper: Update status dan broadcast ----
function updateStatus(status, phoneNumber) {
  currentStatus = status;
  if (ioInstance) {
    const payload = { status };
    if (phoneNumber) payload.phoneNumber = phoneNumber;
    ioInstance.emit('status', payload);
  }
}

// ---- Helper: Emit log ke Web UI ----
function emitLog(message, type = 'info') {
  if (ioInstance) {
    ioInstance.emit('message_log', { message, type });
  }
}

// ---- Helper: Hapus folder session ----
function clearSession() {
  try {
    if (fs.existsSync(SESSION_DIR)) {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
      console.log('🗑️ Folder session dihapus');
    }
  } catch (err) {
    console.error('❌ Gagal hapus session:', err.message);
  }
}

// ---- Public API ----
function getStatus() {
  return currentStatus;
}

function getCurrentQR() {
  return currentQR;
}

async function logout() {
  try {
    if (sock) {
      try {
        await sock.logout();
      } catch (e) {
        // Ignore logout errors if already disconnected
        console.log('⚠️ Logout error (mungkin sudah terputus):', e.message);
      }
      try {
        sock.end();
      } catch (e) {
        // Ignore end errors
      }
      sock = null;
    }
    clearSession();
    currentQR = null;
    reconnectAttempts = MAX_RECONNECT; // Prevent auto-reconnect temporarily
    updateStatus('disconnected');
    emitLog('Logout berhasil. Scan ulang untuk menghubungkan kembali.', 'info');

    // Restart connection setelah delay untuk generate QR baru
    setTimeout(() => {
      reconnectAttempts = 0;
      console.log('🔄 Memulai ulang untuk generate QR baru...');
      connectToWhatsApp().catch(err => {
        console.error('❌ Gagal restart setelah logout:', err.message);
        emitLog('Gagal restart. Silakan restart server.', 'error');
      });
    }, 3000);

  } catch (err) {
    console.error('❌ Error saat logout:', err.message);
    clearSession();
    currentQR = null;
    sock = null;
    updateStatus('disconnected');
    throw err;
  }
}

// ---- Helper: Broadcast Message ----
async function broadcastMessage(numbers, message) {
  if (!sock || currentStatus !== 'connected') {
    throw new Error('WhatsApp belum terhubung');
  }
  
  let successCount = 0;
  let failCount = 0;
  
  for (let num of numbers) {
    try {
      // Format number to JID (e.g., 628xxx@s.whatsapp.net)
      let formattedNum = num.replace(/\D/g, '');
      if (formattedNum.startsWith('0')) {
        formattedNum = '62' + formattedNum.substring(1);
      }
      if (!formattedNum.endsWith('@s.whatsapp.net')) {
        formattedNum += '@s.whatsapp.net';
      }
      
      // Add slight delay to prevent being banned for spamming
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await sock.sendMessage(formattedNum, { text: message });
      successCount++;
      emitLog(`[Broadcast] Terkirim ke ${num}`, 'success');
    } catch (e) {
      failCount++;
      emitLog(`[Broadcast] Gagal ke ${num}: ${e.message}`, 'error');
    }
  }
  
  emitLog(`Broadcast selesai. Berhasil: ${successCount}, Gagal: ${failCount}`, 'info');
  return { successCount, failCount };
}

function getSock() {
  return sock;
}

module.exports = { start, getStatus, getCurrentQR, logout, broadcastMessage, getSock };

