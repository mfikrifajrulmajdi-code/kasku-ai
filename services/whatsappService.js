const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { getConfig } = require('../config/db');

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

  // ---- Event: Pesan Masuk ----
  sock.ev.on('messages.upsert', async ({ type, messages }) => {
    // Hanya proses pesan real-time (bukan history sync)
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        // Skip pesan dari bot sendiri
        if (msg.key.fromMe) continue;

        // Ambil teks pesan
        const messageText = extractMessageText(msg);
        if (!messageText) continue;

        const sender = msg.key.remoteJid;
        const pushName = msg.pushName || 'Unknown';

        console.log(`💬 Pesan dari ${pushName} (${sender}): ${messageText}`);
        emitLog(`Pesan dari ${pushName}: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`, 'info');

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

        // Payload yang mendukung format standar WA Control Center dan Script Keuangan
        const payload = {
          sender,
          pushName,
          message: cleanMessage,
          timestamp: msg.messageTimestamp,
          groqApiKey: config.groqApiKey || undefined,
          // Field khusus untuk kompatibilitas Script Keuangan
          body: cleanMessage,
          from: sender,
          session: "WA-Control-Center"
        };

        const response = await forwardToWebhook(config.webhookUrl, payload);

        // Kirim balasan ke pengirim WhatsApp
        if (response) {
          await sock.sendMessage(sender, { text: response });
          console.log(`📤 Balasan terkirim ke ${pushName}`);
          emitLog(`Balasan terkirim ke ${pushName}`, 'success');
        }

      } catch (err) {
        console.error('❌ Error memproses pesan:', err.message);
        emitLog(`Error: ${err.message}`, 'error');
      }
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

module.exports = { start, getStatus, getCurrentQR, logout };
