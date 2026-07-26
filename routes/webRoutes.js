const express = require('express');
const router = express.Router();
const { getConfig } = require('../config/db');
const axios = require('axios');
const { requireAuth, handleLogin, handleLogout } = require('../middleware/adminAuth');
const tenantResolver = require('../middleware/tenantResolver');

router.get('/admin/login', (req, res) => {
    res.render('admin-login', { layout: false, error: null });
});
router.post('/admin/login', handleLogin);
router.get('/admin/logout', handleLogout);

// Redirect root ke dashboard
router.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Halaman Dashboard
router.get('/dashboard', (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard',
    page: 'dashboard'
  });
});

// Halaman Katalog Web
router.get('/katalog', tenantResolver, async (req, res) => {
  const config = getConfig();
  let ownerPhone = config.ownerPhone || "6285196749541";
  if (ownerPhone.startsWith("08")) ownerPhone = "628" + ownerPhone.substring(2);
  
  // Ambil Data Live dari GAS
  let items = [];
  try {
      const fs = require('fs');
      const path = require('path');
      const dbConf = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'database.json'), 'utf8'));
      
      const dbRes = await axios.post(dbConf.webhookUrl, { action: "GET_DATA" }, { headers: { 'Content-Type': 'application/json' } });
      const rawCatalog = dbRes.data.katalog || "";
      
      // Parser: Pisahkan per blok produk (dipisah dengan baris kosong)
      const blocks = rawCatalog.split('\n\n');
      
      for (const block of blocks) {
          if (!block.trim()) continue;
          
          let nama = "Produk Tidak Diketahui";
          let harga = "Hubungi Admin";
          let stok = "0";
          let sku = "";
          let gambar = "";
          let video = "";
          let kategori = "Umum";
          
          const namaMatch = block.match(/- Produk:\s*(.*)/i);
          const hargaMatch = block.match(/Harga:\s*(?:Rp)?\s*([\d\.,]+)/i);
          const stokMatch = block.match(/Sisa Stok:\s*(\d+)/i);
          const gambarMatch = block.match(/Gambar:\s*(http.*)/i);
          const videoMatch = block.match(/Video:\s*(http.*)/i);
          const katMatch = block.match(/Kategori:\s*(.*)/i);
          
          if (namaMatch) {
              nama = namaMatch[1].trim();
              const skuMatch = nama.match(/SKU:\s*([\w\d]+)/i);
              if (skuMatch) sku = skuMatch[1].trim();
          }
          if (hargaMatch) harga = hargaMatch[1].trim();
          if (stokMatch) stok = stokMatch[1].trim();
          if (katMatch) kategori = katMatch[1].trim();
          
          // Logika Gambar & Video Hibrida (Sheets URL / File Lokal)
          if (gambarMatch) {
              gambar = gambarMatch[1].trim();
          } else if (sku) {
              const extensions = ['.jpg', '.jpeg', '.png', '.webp'];
              for (const ext of extensions) {
                  const imgPath = path.join(__dirname, '..', 'public', 'images', 'products', `${sku}${ext}`);
                  if (fs.existsSync(imgPath)) {
                      gambar = `/images/products/${sku}${ext}`;
                      break;
                  }
              }
          }
          
          if (videoMatch) {
              video = videoMatch[1].trim();
          } else if (sku) {
              const vidPath = path.join(__dirname, '..', 'public', 'images', 'products', `${sku}.mp4`);
              if (fs.existsSync(vidPath)) {
                  video = `/images/products/${sku}.mp4`;
              }
          }
          
          // Fallback kategori dari nama produk jika tidak ada tag khusus
          if (kategori === "Umum") {
              const lowerName = nama.toLowerCase();
              if (lowerName.includes('sepatu')) kategori = "Sepatu";
              else if (lowerName.includes('sandal')) kategori = "Sandal";
              else if (lowerName.includes('kaos') || lowerName.includes('baju')) kategori = "Pakaian";
              else if (lowerName.includes('tas')) kategori = "Aksesoris";
          }
          
          items.push({ nama, harga, stok, sku, gambar, video, kategori });
      }

  } catch (err) {
      console.error("Gagal load katalog:", err.message);
  }
  
  res.render('katalog', {
    layout: false,
    waNumber: ownerPhone,
    items: items,
    tenantConfig: req.tenantConfig,
    storeName: req.tenantConfig.companyName || 'KasKu Store',
    logoUrl: req.tenantConfig.logoUrl || '/favicon.ico'
  });
});

// Halaman Settings
router.get('/settings', requireAuth, (req, res) => {
  const config = getConfig();
  res.render('settings', {
    title: 'Pengaturan',
    page: 'settings',
    config
  });
});

// Halaman Broadcast
router.get('/broadcast', (req, res) => {
  res.render('broadcast', {
    title: 'Broadcast Massal',
    page: 'broadcast'
  });
});

// Halaman Sandbox (Simulasi Percakapan AI)
router.get('/sandbox', (req, res) => {
  res.render('sandbox', {
    title: 'AI Sandbox',
    page: 'sandbox'
  });
});

// Halaman Evaluator Agent (QA & Evaluation Dashboard)
router.get('/evaluator', (req, res) => {
  res.render('evaluator', {
    title: 'Evaluator Agent',
    page: 'evaluator'
  });
});

// Halaman Super Admin SaaS Multi-Tenant Management
router.get('/admin/tenants', requireAuth, (req, res) => {
  const tenantManager = require('../services/tenantManager');
  const tenants = tenantManager.getAllTenants();
  res.render('tenants', {
    title: 'Multi-Tenant SaaS',
    page: 'tenants',
    tenants: tenants
  });
});

module.exports = router;


