const fs = require('fs');
const axios = require('axios');
const path = require('path');

// Skrip ini untuk mensimulasikan testing lokal jika diperlukan
async function runTest() {
  const dbPath = path.join(__dirname, 'config', 'database.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const webhookUrl = db.webhookUrl;

  const history = [
    { role: 'user', content: 'Saya mau beli Sepatu 1' },
    { role: 'assistant', content: 'Baik, harganya Rp 100. Mau beli berapa?' }
  ];

  const payload = {
    sender: '6281234567890@s.whatsapp.net',
    pushName: 'Tester',
    message: '1 aja ke bali',
    body: '1 aja ke bali',
    from: '6281234567890@s.whatsapp.net',
    session: 'Test-Session',
    history: history
  };

  console.log('Sending mock request to Webhook...');
  try {
    const res = await axios.post(webhookUrl, payload, { headers: { 'Content-Type': 'application/json' } });
    console.log('Response:', res.data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

runTest();
