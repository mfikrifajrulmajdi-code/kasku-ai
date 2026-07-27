// ============================================================================
// HEALTH MONITOR — Pantau Kesehatan Sistem 24/7
// Cek Backend, Frontend, & WhatsApp Connection setiap 60 detik
// Kirim notifikasi WA ke Owner jika ada masalah
// ============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

// Konfigurasi
const CHECK_INTERVAL = 60 * 1000;  // Cek setiap 60 detik
const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:3001';
const LOG_FILE = path.join(__dirname, '..', 'logs', 'health.log');

// State tracking
let consecutiveBackendFails = 0;
let consecutiveFrontendFails = 0;
let lastAlertTime = 0;
const ALERT_COOLDOWN = 5 * 60 * 1000; // Minimal 5 menit antar alert

// Pastikan folder logs ada
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

function timestamp() {
    return new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

function log(message) {
    const line = `[${timestamp()}] ${message}`;
    console.log(line);
    try {
        fs.appendFileSync(LOG_FILE, line + '\n');
    } catch (e) { /* ignore */ }
}

function checkUrl(url) {
    return new Promise((resolve) => {
        const req = http.get(url, { timeout: 10000 }, (res) => {
            resolve({ ok: res.statusCode < 500, statusCode: res.statusCode });
            res.resume(); // Consume response to free memory
        });
        req.on('error', (err) => {
            resolve({ ok: false, error: err.message });
        });
        req.on('timeout', () => {
            req.destroy();
            resolve({ ok: false, error: 'Timeout (10s)' });
        });
    });
}

async function sendWhatsAppAlert(message) {
    const now = Date.now();
    if (now - lastAlertTime < ALERT_COOLDOWN) {
        log('⏸️  Alert cooldown aktif, skip notifikasi WA');
        return;
    }

    try {
        // Kirim via API internal kita sendiri
        const postData = JSON.stringify({ 
            phone: process.env.OWNER_PHONE || '628985335666',
            message: `🚨 *SYSTEM ALERT*\n\n${message}\n\n⏰ ${timestamp()}`
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/send-alert',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        };

        const req = http.request(options, (res) => {
            res.resume();
            if (res.statusCode === 200) {
                log('📱 Alert WA terkirim ke Owner');
                lastAlertTime = now;
            }
        });
        req.on('error', () => { /* Backend mungkin down, skip */ });
        req.write(postData);
        req.end();
    } catch (e) {
        log('⚠️  Gagal kirim alert WA: ' + e.message);
    }
}

async function healthCheck() {
    // 1. Cek Backend
    const backend = await checkUrl(BACKEND_URL);
    if (backend.ok) {
        if (consecutiveBackendFails > 0) {
            log('✅ Backend RECOVERED setelah ' + consecutiveBackendFails + ' kali gagal');
        }
        consecutiveBackendFails = 0;
    } else {
        consecutiveBackendFails++;
        log(`❌ Backend DOWN (${consecutiveBackendFails}x berturut-turut) — ${backend.error || 'Status ' + backend.statusCode}`);
        
        if (consecutiveBackendFails >= 3) {
            await sendWhatsAppAlert(
                `❌ *Backend Server DOWN!*\nSudah gagal ${consecutiveBackendFails}x berturut-turut.\nError: ${backend.error || 'Status ' + backend.statusCode}\n\nPM2 sedang mencoba auto-restart...`
            );
        }
    }

    // 2. Cek Frontend
    const frontend = await checkUrl(FRONTEND_URL);
    if (frontend.ok) {
        if (consecutiveFrontendFails > 0) {
            log('✅ Frontend RECOVERED setelah ' + consecutiveFrontendFails + ' kali gagal');
        }
        consecutiveFrontendFails = 0;
    } else {
        consecutiveFrontendFails++;
        log(`⚠️  Frontend DOWN (${consecutiveFrontendFails}x berturut-turut) — ${frontend.error || 'Status ' + frontend.statusCode}`);

        if (consecutiveFrontendFails >= 3) {
            await sendWhatsAppAlert(
                `⚠️ *Frontend UI DOWN!*\nSudah gagal ${consecutiveFrontendFails}x berturut-turut.\nError: ${frontend.error || 'Status ' + frontend.statusCode}`
            );
        }
    }

    // 3. Log status ringkas setiap 10 menit (setiap 10 check)
    if (healthCheckCount % 10 === 0) {
        const uptimeHours = (process.uptime() / 3600).toFixed(1);
        const memMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        log(`📊 Health Summary — Uptime: ${uptimeHours}h | Backend: ${backend.ok ? '✅' : '❌'} | Frontend: ${frontend.ok ? '✅' : '⚠️'} | Monitor RAM: ${memMB}MB`);
    }
}

let healthCheckCount = 0;

// Startup
log('');
log('═══════════════════════════════════════════════════════');
log('🩺 Health Monitor AKTIF');
log('   Backend URL : ' + BACKEND_URL);
log('   Frontend URL: ' + FRONTEND_URL);
log('   Interval    : ' + (CHECK_INTERVAL / 1000) + ' detik');
log('   Alert ke    : Owner via WhatsApp');
log('═══════════════════════════════════════════════════════');
log('');

// Jalankan health check berkala
setInterval(() => {
    healthCheckCount++;
    healthCheck().catch(err => log('⚠️ Health check error: ' + err.message));
}, CHECK_INTERVAL);

// Jalankan pertama kali setelah 10 detik (tunggu server startup)
setTimeout(() => {
    healthCheckCount++;
    healthCheck().catch(err => log('⚠️ Initial health check error: ' + err.message));
}, 10000);
