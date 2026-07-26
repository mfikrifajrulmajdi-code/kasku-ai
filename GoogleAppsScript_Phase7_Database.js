/* ================================================================
   KASKU AI - DATABASE MODE
   Versi: 9.0 (Hanya berfungsi sebagai API Database untuk Node.js)
   ================================================================ */

const CONFIG = {
  SHEET_TRANSAKSI: "Transaksi",
  SHEET_REKENING:  "Rekening",
  SHEET_KATALOG:   "Katalog",
  SHEET_FAQ:       "FAQ",
  SHEET_HR:        "HR_Loker",
  SHEET_HUTANG:    "Hutang_Piutang"
};

function getConfig_(key) {
  const val = PropertiesService.getScriptProperties().getProperty(key);
  if (!val) throw new Error(`Script Property '${key}' belum diset.`);
  return val;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return respond_({ status: "error", message: "Sistem sibuk" });
  try {
    if (!e || !e.postData) return respond_({ status: "error", message: "Payload kosong" });
    const data = safeParseJson_(e.postData.contents);
    if (!data || !data.action) return respond_({ status: "error", message: "Aksi tidak diketahui" });

    const ss = SpreadsheetApp.openById(getConfig_("SPREADSHEET_ID"));
    
    switch (data.action) {
      case "GET_DATA":
        return respond_({
          status: "success",
          katalog: getKatalogText_(ss),
          faq: getFaqText_(ss),
          saldo: data.rekening ? getSaldo_(ss, data.rekening) : getAllSaldo_(ss)
        });
        
      case "KURANGI_STOK":
        kurangiStok_(ss, data.sku, data.jumlah);
        return respond_({ status: "success" });
        
      case "CATAT_TRANSAKSI":
        appendTransaksi_(ss, data.session, data.from, data.pesan, data.ai);
        updateSaldo_(ss, data.ai.rek, data.ai.amt, data.ai.type);
        return respond_({ status: "success" });
        
      case "CATAT_HUTANG_PIUTANG":
        appendHutangPiutang_(ss, data.session, data.from, data.ai);
        if(data.ai.rek && data.ai.rek !== "None") {
           // Jika mempengaruhi rekening, update saldo rekening
           // Hutang (kita terima pinjaman) -> Saldo Bertambah
           // Bayar Hutang (kita bayar pinjaman) -> Saldo Berkurang
           // Piutang (kita ngasih pinjaman) -> Saldo Berkurang
           // Terima Cicilan (kita terima cicilan) -> Saldo Bertambah
           let type = "Keluar";
           if(data.ai.jenis === "Hutang" || data.ai.jenis === "Terima Cicilan") type = "Masuk";
           updateSaldo_(ss, data.ai.rek, data.ai.amt, type);
        }
        return respond_({ status: "success" });
        
      case "REKAP_HUTANG_PIUTANG":
        return respond_({ status: "success", rekap: getRekapHutangPiutang_(ss) });

      case "HAPUS_TERAKHIR":
        return respond_(hapusTransaksiTerakhir_(ss));
        
      default:
        return respond_({ status: "error", message: "Aksi tidak valid" });
    }
  } catch (err) {
    return respond_({ status: "error", message: err.message });
  } finally {
    lock.releaseLock();
  }
}

/* ================================================================
   SPREADSHEET HELPERS
================================================================ */
function getKatalogText_(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_KATALOG);
  if (!sheet) return "Belum ada produk.";
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return "Belum ada produk.";
  return data.slice(1).map(row => `- Produk: ${row[1]} (SKU: ${row[0]})\n  Harga: Rp ${fmt_(row[2])}\n  Sisa Stok: ${row[3]}`).join("\n\n");
}

function kurangiStok_(ss, sku, jumlah) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_KATALOG);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
     if (data[i][0].toString().toLowerCase() === sku.toString().toLowerCase()) {
         const currentStock = Number(data[i][3]) || 0;
         if (currentStock >= jumlah) sheet.getRange(i+1, 4).setValue(currentStock - jumlah);
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
  const rek = (ai.rek || "Cash").trim();
  sheet.appendRow([new Date(), session, from, pesan, ai.cat, Math.abs(ai.amt), ai.type, rek]);
}

function hapusTransaksiTerakhir_(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_TRANSAKSI);
  if (!sheet) return { status: "error", message: "Sheet Transaksi belum ada." };
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { status: "error", message: "Tidak ada data transaksi untuk dihapus." };
  
  // Baca data baris terakhir
  const range = sheet.getRange(lastRow, 1, 1, 8);
  const rowData = range.getValues()[0];
  
  const amount = Number(rowData[5]) || 0;
  const type = rowData[6]; // "Masuk" / "Keluar"
  const rekening = rowData[7]; // "Cash", "BCA", dll
  
  // Hapus baris di sheet transaksi
  sheet.deleteRow(lastRow);
  
  // Kembalikan saldo (revert)
  if (amount > 0 && type && rekening) {
     const reverseType = type === "Masuk" ? "Keluar" : "Masuk";
     updateSaldo_(ss, rekening, amount, reverseType);
  }
  
  return { status: "success", message: `Data terakhir senilai Rp ${fmt_(amount)} di rekening ${rekening} berhasil dihapus/dibatalkan.` };
}

function appendHutangPiutang_(ss, session, from, ai) {
  const sheet = getOrCreateSheet_(ss, CONFIG.SHEET_HUTANG, ["Timestamp", "Session", "From", "Jenis", "Pihak Terkait", "Nominal", "Rekening", "Keterangan"]);
  sheet.appendRow([new Date(), session, from, ai.jenis, ai.pihak, Math.abs(ai.amt), ai.rek || "-", ai.ket || "-"]);
}

function getRekapHutangPiutang_(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_HUTANG);
  if (!sheet) return "Belum ada catatan hutang/piutang.";
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return "Belum ada catatan hutang/piutang.";
  
  // Hitung saldo per pihak
  let summary = {};
  for (let i = 1; i < data.length; i++) {
    const jenis = data[i][3];
    const pihak = data[i][4];
    const amt = Number(data[i][5]) || 0;
    
    if(!summary[pihak]) summary[pihak] = { hutang_kita: 0, piutang_mereka: 0 };
    
    if(jenis === "Hutang") summary[pihak].hutang_kita += amt;
    else if(jenis === "Bayar Hutang") summary[pihak].hutang_kita -= amt;
    else if(jenis === "Piutang") summary[pihak].piutang_mereka += amt;
    else if(jenis === "Terima Cicilan") summary[pihak].piutang_mereka -= amt;
  }
  
  let out = "📒 *Buku Hutang & Piutang*\n━━━━━━━━━━━━━━━━━━\n";
  let hasData = false;
  for(let pihak in summary) {
      const hutang = summary[pihak].hutang_kita;
      const piutang = summary[pihak].piutang_mereka;
      
      if(hutang > 0) {
          out += `▪️ Kita ngutang ke *${pihak}*: Rp ${fmt_(hutang)}\n`;
          hasData = true;
      }
      if(piutang > 0) {
          out += `▪️ *${pihak}* ngutang ke kita: Rp ${fmt_(piutang)}\n`;
          hasData = true;
      }
  }
  if(!hasData) return "🎉 Semua hutang/piutang sudah LUNAS!";
  return out + "━━━━━━━━━━━━━━━━━━";
}

function updateSaldo_(ss, rekening, amt, type) {
  const sheet = getOrCreateSheet_(ss, CONFIG.SHEET_REKENING, ["Rekening", "Saldo"]);
  const data = sheet.getDataRange().getValues();
  const rLower = (rekening || "Cash").toLowerCase().trim();
  amt = Math.abs(amt);
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().toLowerCase() === rLower) {
      const cur = Number(data[i][1])||0;
      sheet.getRange(i+1, 2).setValue(type==="Masuk"?cur+amt:cur-amt); return;
    }
  }
  sheet.appendRow([rekening || "Cash", type==="Masuk"?amt:-amt]);
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
function respond_(jsonObj) { return ContentService.createTextOutput(JSON.stringify(jsonObj)).setMimeType(ContentService.MimeType.JSON); }
