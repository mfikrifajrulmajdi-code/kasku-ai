require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const { ensureDB } = require('./config/db');

// Inisialisasi Express
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Pastikan database.json ada
ensureDB();

// ============ Middleware ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const { sessionMiddleware } = require('./middleware/adminAuth');
app.use(sessionMiddleware());
app.use(express.static(path.join(__dirname, 'public')));

// ============ View Engine (EJS) ============
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// ============ Routes ============
const webRoutes = require('./routes/webRoutes');
const apiRoutes = require('./routes/apiRoutes');
const contactRoutes = require('./routes/contactRoutes');
const extensionRoutes = require('./routes/extensionRoutes');

app.use('/', webRoutes);
app.use('/api', apiRoutes);
app.use('/api', contactRoutes);
app.use('/api', extensionRoutes);

// ============ Socket.IO ============
io.on('connection', (socket) => {
  console.log('🌐 Client terhubung:', socket.id);

  // Kirim status saat ini ke client yang baru connect
  const whatsappService = require('./services/whatsappService');
  const currentStatus = whatsappService.getStatus();
  socket.emit('status', { status: currentStatus });

  // Jika ada QR yang tersimpan dan status masih waiting, kirim ulang
  const currentQR = whatsappService.getCurrentQR();
  if (currentQR && currentStatus === 'waiting_scan') {
    socket.emit('qr', { qr: currentQR });
  }

  socket.on('disconnect', () => {
    console.log('🔌 Client terputus:', socket.id);
  });
});

// ============ Start Server ============
server.listen(PORT, () => {
  console.log(``);
  console.log(`  ╔══════════════════════════════════════════╗`);
  console.log(`  ║   🤖 KasKu AI berjalan!                  ║`);
  console.log(`  ║   🌐 http://localhost:${PORT}               ║`);
  console.log(`  ╚══════════════════════════════════════════╝`);
  console.log(``);

  // Mulai WhatsApp Engine
  const whatsappService = require('./services/whatsappService');
  whatsappService.start(io);
});

module.exports = { io };
