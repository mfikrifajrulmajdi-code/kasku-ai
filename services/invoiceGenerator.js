const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate a PDF invoice
 * @param {Object} data 
 * @returns {Promise<string>} Path to the generated PDF file
 */
function generateInvoice(data) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            
            const invoicesDir = path.join(__dirname, '../invoices');
            if (!fs.existsSync(invoicesDir)) {
                fs.mkdirSync(invoicesDir, { recursive: true });
            }
            
            const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
            const filePath = path.join(invoicesDir, `${invoiceNumber}.pdf`);
            const stream = fs.createWriteStream(filePath);
            
            doc.pipe(stream);
            
            // Header
            doc.fillColor('#444444')
               .fontSize(20)
               .text('INVOICE', 50, 50, { align: 'right' })
               .fontSize(10)
               .text(`Invoice Number: ${invoiceNumber}`, { align: 'right' })
               .text(`Date: ${new Date().toLocaleDateString('id-ID')}`, { align: 'right' });
            
            // Company Info
            doc.fontSize(16)
               .text('KasKu Enterprise', 50, 50)
               .fontSize(10)
               .text('Kawasan Bisnis Sudirman')
               .text('Jakarta, Indonesia')
               .moveDown();
               
            // Billed To
            doc.fillColor('#000000')
               .text(`Bill To:`, 50, 130)
               .font('Helvetica-Bold')
               .text(data.nama, 50, 145)
               .font('Helvetica')
               .text(data.keterangan || '-', 50, 160)
               .moveDown();
               
            // Table Header
            const tableTop = 200;
            doc.font('Helvetica-Bold');
            generateTableRow(doc, tableTop, 'Item Description', 'Amount');
            generateHr(doc, tableTop + 20);
            
            // Table Row
            doc.font('Helvetica');
            const itemDescription = data.keterangan || "Jasa / Layanan";
            const amountStr = `Rp ${Number(data.nominal).toLocaleString('id-ID')}`;
            generateTableRow(doc, tableTop + 30, itemDescription, amountStr);
            generateHr(doc, tableTop + 50);
            
            // Total
            doc.font('Helvetica-Bold');
            generateTableRow(doc, tableTop + 60, 'Total Due', amountStr);
            
            // Footer
            doc.font('Helvetica')
               .fontSize(10)
               .text(
                   'Pembayaran dapat dilakukan ke rekening BCA 1234567890 a/n KasKu.',
                   50,
                   700,
                   { align: 'center', width: 500 }
               );
               
            doc.end();
            
            stream.on('finish', () => resolve(filePath));
            stream.on('error', reject);
            
        } catch (error) {
            reject(error);
        }
    });
}

function generateTableRow(doc, y, item, amount) {
    doc.fontSize(10)
       .text(item, 50, y)
       .text(amount, 400, y, { width: 90, align: 'right' });
}

function generateHr(doc, y) {
    doc.strokeColor('#aaaaaa')
       .lineWidth(1)
       .moveTo(50, y)
       .lineTo(550, y)
       .stroke();
}

module.exports = { generateInvoice };
