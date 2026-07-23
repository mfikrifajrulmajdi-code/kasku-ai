const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.json');

const DEFAULT_CONFIG = {
  webhookUrl: '',
  groqApiKey: '',
  autoReply: true,
  prefix: '',
  lastUpdated: null
};

// Pastikan file database.json ada
function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
  }
}

// Baca seluruh konfigurasi
function getConfig() {
  ensureDB();
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

// Update konfigurasi (merge dengan data lama)
function setConfig(newData) {
  const current = getConfig();
  const updated = { ...current, ...newData, lastUpdated: new Date().toISOString() };
  fs.writeFileSync(DB_PATH, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

// Ambil satu nilai
function getConfigValue(key) {
  const config = getConfig();
  return config[key];
}

module.exports = { getConfig, setConfig, getConfigValue, ensureDB };
