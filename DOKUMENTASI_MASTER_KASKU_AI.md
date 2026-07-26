# 📘 DOKUMENTASI MASTER PROYEK KASKU-AI V2.0 (FLAGSHIP ENTERPRISE)

---

## 📌 Ringkasan Eksekutif Proyek

**KasKu-AI** adalah sistem **Autonomous Multi-Agent E-Commerce Engine** berbasis Node.js, Baileys WhatsApp Web API, dan Midtrans Payment Gateway. 

Sistem ini mengoordinasikan **10 Agen AI Spesialis** yang bekerja secara otonom untuk mengelola seluruh siklus bisnis e-commerce (konsultasi sales, penerbitan invoice, kalkulasi ongkir real-time, pemotongan stok gudang, verifikasi pembayaran otomatis QRIS/VA, pelacakan pengiriman, hingga penanganan komplain retur).

---

## 🏛️ Arsitektur Sistem & 10 Agen Spesialis

```
                                  ┌───────────────────────────┐
                                  │ 🧠 Supreme Router Agent   │
                                  │  (Intent Classifier AI)   │
                                  └─────────────┬─────────────┘
                                                │
         ┌──────────────┬──────────────┬────────┼──────────────┬──────────────┬──────────────┐
         ▼              ▼              ▼        ▼              ▼              ▼              ▼
     🤝 Bima        👩‍💼 Citra       👩‍💼 Aika   🎧 Deni        🔧 Eka        📦 Joko        📊 Hadi
    (SALES)         (OPS)         (CS)   (COMPLAINT)    (SUPPORT)   (PROCUREMENT)   (FINANCE)
```

| Nama Agen | Divisi & Peran | Tugas & Spesialisasi Operasional | File Sumber |
|:---|:---|:---|:---|
| **Bima** | `SALES` | Konsultan penjualan natural, memberikan rekomendasi produk & konsultasi ukuran. | `services/agents/salesAgent.js` |
| **Citra** | `OPS` | Kasir & Admin Operasional, validasi alamat lengkap, hitung ongkir, terbitkan invoice Midtrans. | `services/agents/opsAgent.js` |
| **Aika** | `CS` | Customer Service umum, menjawab FAQ toko, alamat, dan jam operasional. | `services/agents/csAgent.js` |
| **Deni** | `COMPLAINT` | Penanganan komplain barang cacat/rusak, salah kirim, dan klaim garansi retur (RMA). | `services/agents/complaintAgent.js` |
| **Eka** | `SUPPORT` | Layanan dukungan teknis produk & perbaikan panduan pemakaian. | `services/agents/supportAgent.js` |
| **Fira** | `HR` | Manajemen rekrutmen karyawan internal dan informasi SOP kerja. | `services/agents/hrAgent.js` |
| **Gita** | `MARKETING` | Penyusunan kampanye promosi, copywriting broadcast, dan promo FOMO. | `services/agents/marketingAgent.js` |
| **Hadi** | `FINANCE` | Pencatatan laporan keuangan, audit mutasi bank, dan ringkasan omset harian. | `services/agents/financeAgent.js` |
| **Iwan** | `ADMIN` | Asisten eksekutif Owner, manajemen kontak, dan broadcast pesan. | `services/agents/adminAgent.js` |
| **Joko** | `PROCUREMENT` | Manajemen stok gudang, alert stok menipis, dan negosiasi bahan ke supplier. | `services/agents/procurementAgent.js` |

---

## 🛠️ Engine & Service Utama

1. **📱 Native WhatsApp Menu Service (`services/menuService.js`)**:
   Merespon pesan `menu`, `!menu`, `1` s/d `9` dengan kartu menu terstruktur resmi.

2. **💳 Midtrans Payment Gateway (`services/midtransService.js`)**:
   Integrasi Snap API (Merchant ID `M086776065`) untuk pembayaran otomatis QRIS, GoPay, ShopeePay, & Virtual Account Bank dengan verifikasi SHA512 signature.

3. **🚚 Indonesian Expeditions Shipping Rate Engine (`services/ongkirService.js`)**:
   Hitung tarif ongkir real-time dari Gudang Tasikmalaya ke seluruh kota di Indonesia untuk kurir J&T Express, JNE, SiCepat, dan POS Indonesia.

4. **📦 Real-Time Stock Management Store (`services/stockStore.js`)**:
   Manajemen persediaan stok per SKU di `config/stocks.json`, pemotongan stok otomatis, dan alert stok menipis (`stok <= 3`) ke Agen Joko.

5. **🛒 Persistent Shopping Cart (`services/cartStore.js`)**:
   Manajemen keranjang belanja tersimpan permanen di disk (`config/carts.json`).

6. **🏷️ Auto Order ID & Tracking Store (`services/orderStore.js`)**:
   Penerbitan ID pesanan `KASKU-XXXX` / `#KASKU-XXXX` dan pelacakan status pengiriman live.

7. **🧠 Self-Learning AI Engine (`services/learningSystem.js`)**:
   Menyimpan koreksi Owner (`koreksi: <teks>`) ke `config/lessons.json` yang dibaca secara *live* oleh seluruh agen tanpa perlu restart server.

---

## 🌐 Endpoint Web UI & Dashboard

- **Dashboard Utama WA & QR Scan:** `http://localhost:3000/dashboard`
- **Katalog Web Glassmorphism Modern:** `http://localhost:3000/katalog`
- **Evaluator Autopilot QA Dashboard:** `http://localhost:3000/evaluator`
- **AI Sandbox Simulation:** `http://localhost:3000/sandbox`

---

## 🧪 Panduan Perintah Uji Coba (Testing Commands)

- **Menjalankan Server:** `npm start`
- **Uji Coba Strict SOP Alamat & Invoice:** `node scratch/testStrictSOP.js`
- **Uji Coba Ongkir & Stock Engine:** `node scratch/testOngkirAndStock.js`
- **Uji Coba Native WA Menu & Choices:** `node scratch/testMenuAndCatalog.js`
- **Uji Coba Autonomous Gap Discovery Suite:** `node scratch/runGapDiscoverySuite.js`
- **Uji Coba 16 Test Cases Real Engine:** `node scratch/runReal100Scenarios.js`
- **Uji Coba Monte Carlo 100-Scenario Stress Test:** `node scratch/run100ScenarioStressEngine.js`

---

## 📄 Hak Cipta & Lisensi
© 2026 KasKu Store. Ditenagai oleh KasKu Multi-Agent Agentic AI System v2.0.
