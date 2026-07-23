// ============================================
// WA Control Center — Client-Side Application
// ============================================

(function() {
  'use strict';

  // ---- Socket.IO Connection ----
  const socket = io();

  // ---- DOM Elements ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Dashboard elements
  const statusDot = $('#status-dot');
  const statusText = $('#status-text');
  const statusChip = $('#status-chip');
  const connectionStatus = $('#connection-status');
  const uptimeEl = $('#uptime');
  const phoneNumber = $('#phone-number');
  const btnLogout = $('#btn-logout');
  const qrImage = $('#qr-image');
  const qrPlaceholder = $('#qr-placeholder');
  const qrCard = $('#qr-card');
  const qrHint = $('#qr-hint');
  const logList = $('#log-list');
  const btnClearLog = $('#btn-clear-log');

  // Settings elements
  const settingsForm = $('#settings-form');
  const toggleApiKey = $('#toggle-api-key');
  const autoReplyCheckbox = $('#autoReply');
  const autoReplyLabel = $('#auto-reply-label');
  const saveStatus = $('#save-status');

  // Sidebar
  const sidebarStatus = $('#sidebar-status');

  // Clock
  const liveClock = $('#live-clock');

  // ---- Status Mapping ----
  const STATUS_MAP = {
    connected: {
      text: 'Terhubung',
      dotClass: 'connected',
      description: 'WhatsApp terhubung dan aktif'
    },
    waiting_scan: {
      text: 'Menunggu Scan',
      dotClass: 'waiting',
      description: 'Silakan scan QR Code'
    },
    disconnected: {
      text: 'Terputus',
      dotClass: 'disconnected',
      description: 'Tidak terhubung ke WhatsApp'
    }
  };

  // ---- Socket Event Handlers ----
  socket.on('connect', () => {
    addLog('Terhubung ke server', 'info');
  });

  socket.on('disconnect', () => {
    addLog('Terputus dari server', 'error');
  });

  // Handle QR Code
  socket.on('qr', (data) => {
    if (!qrImage || !qrPlaceholder) return;

    if (data.qr) {
      qrImage.src = data.qr;
      qrImage.style.display = 'block';
      qrPlaceholder.style.display = 'none';
      if (qrHint) qrHint.textContent = 'Buka WhatsApp di ponsel → Menu → Perangkat Tertaut → Tautkan Perangkat';
      addLog('QR Code baru diterima', 'info');
    } else {
      qrImage.style.display = 'none';
      qrPlaceholder.style.display = 'flex';
    }
  });

  // Handle Status Updates
  socket.on('status', (data) => {
    updateStatus(data.status, data.phoneNumber);
  });

  // Handle Message Logs
  socket.on('message_log', (data) => {
    addLog(data.message, data.type || 'info');
  });

  // ---- UI Update Functions ----
  function updateStatus(status, phone) {
    const info = STATUS_MAP[status] || STATUS_MAP.disconnected;

    // Update dashboard elements
    if (statusDot) {
      statusDot.className = 'status-dot ' + info.dotClass;
    }
    if (statusText) {
      statusText.textContent = info.text;
    }
    if (connectionStatus) {
      connectionStatus.textContent = info.description;
    }
    if (phoneNumber && phone) {
      phoneNumber.textContent = phone;
    }

    // Update sidebar status
    if (sidebarStatus) {
      const dot = sidebarStatus.querySelector('.status-dot');
      const label = sidebarStatus.querySelector('.status-label');
      if (dot) dot.className = 'status-dot ' + info.dotClass;
      if (label) label.textContent = info.text;
    }

    // Show/hide QR card and logout button based on status
    if (status === 'connected') {
      if (qrCard) qrCard.style.display = 'none';
      if (btnLogout) btnLogout.style.display = 'inline-flex';
      addLog('WhatsApp berhasil terhubung! ✅', 'success');
    } else if (status === 'waiting_scan') {
      if (qrCard) qrCard.style.display = 'block';
      if (btnLogout) btnLogout.style.display = 'none';
    } else {
      if (qrCard) qrCard.style.display = 'block';
      if (btnLogout) btnLogout.style.display = 'none';
      if (qrImage) qrImage.style.display = 'none';
      if (qrPlaceholder) qrPlaceholder.style.display = 'flex';
    }
  }

  // ---- Activity Log ----
  function addLog(message, type = 'info') {
    if (!logList) return;

    // Remove empty state
    const emptyEl = logList.querySelector('.log-empty');
    if (emptyEl) emptyEl.remove();

    const now = new Date();
    const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const item = document.createElement('div');
    item.className = `log-item log-${type}`;
    item.innerHTML = `
      <span class="log-time">${time}</span>
      <span class="log-msg">${escapeHtml(message)}</span>
    `;

    logList.prepend(item);

    // Limit to 50 entries
    while (logList.children.length > 50) {
      logList.removeChild(logList.lastChild);
    }
  }

  // ---- Settings Form ----
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btnSave = $('#btn-save');
      btnSave.classList.add('loading');
      btnSave.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> Menyimpan...';

      try {
        const formData = {
          webhookUrl: $('#webhookUrl').value.trim(),
          groqApiKey: $('#groqApiKey').value.trim(),
          autoReply: autoReplyCheckbox ? autoReplyCheckbox.checked : true,
          prefix: $('#prefix').value.trim()
        };

        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const result = await res.json();

        if (result.success) {
          showToast('Pengaturan berhasil disimpan! ✅', 'success');
          if (saveStatus) {
            saveStatus.textContent = '✅ Tersimpan!';
            saveStatus.classList.add('show');
            setTimeout(() => saveStatus.classList.remove('show'), 3000);
          }
          // Update last saved
          const lastSaved = $('#last-saved');
          if (lastSaved) {
            lastSaved.textContent = new Date().toLocaleString('id-ID');
          }
          // Update webhook status
          const webhookStatus = $('#webhook-status');
          if (webhookStatus) {
            webhookStatus.textContent = formData.webhookUrl ? '✅ Terkonfigurasi' : '⚠️ Belum diatur';
          }
        } else {
          showToast('Gagal menyimpan: ' + result.error, 'error');
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      } finally {
        btnSave.classList.remove('loading');
        btnSave.innerHTML = '<span class="btn-icon">💾</span> Simpan Pengaturan';
      }
    });
  }

  // ---- Toggle API Key Visibility ----
  if (toggleApiKey) {
    toggleApiKey.addEventListener('click', () => {
      const input = $('#groqApiKey');
      if (input.type === 'password') {
        input.type = 'text';
        toggleApiKey.textContent = '🙈';
      } else {
        input.type = 'password';
        toggleApiKey.textContent = '👁️';
      }
    });
  }

  // ---- Auto Reply Toggle Label ----
  if (autoReplyCheckbox && autoReplyLabel) {
    autoReplyCheckbox.addEventListener('change', () => {
      autoReplyLabel.textContent = autoReplyCheckbox.checked ? 'Aktif' : 'Nonaktif';
    });
  }

  // ---- Logout Button ----
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (!confirm('Yakin ingin logout dari WhatsApp?')) return;

      btnLogout.classList.add('loading');
      try {
        const res = await fetch('/api/logout', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
          showToast('Berhasil logout dari WhatsApp', 'success');
        } else {
          showToast('Gagal logout: ' + result.error, 'error');
        }
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      } finally {
        btnLogout.classList.remove('loading');
      }
    });
  }

  // ---- Clear Log ----
  if (btnClearLog) {
    btnClearLog.addEventListener('click', () => {
      if (logList) {
        logList.innerHTML = '<div class="log-empty"><span>📝</span><p>Belum ada aktivitas</p></div>';
      }
    });
  }

  // ---- Toast Notification ----
  function showToast(message, type = 'info') {
    const container = $('#toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // ---- Live Clock ----
  function updateClock() {
    if (liveClock) {
      liveClock.textContent = new Date().toLocaleString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    }
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ---- Uptime Counter ----
  let startTime = Date.now();
  function updateUptime() {
    if (!uptimeEl) return;
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    uptimeEl.textContent = `${h}j ${m}m ${s}d`;
  }
  setInterval(updateUptime, 1000);

  // ---- Utility ----
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

})();
