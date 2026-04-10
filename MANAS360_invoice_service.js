/**
 * ⚠️ DEPRECATED / REFERENCE ONLY
 * This PDFKit generator is NOT used in production.
 * Production invoices are rendered via backend/src/services/invoice.renderer.ts
 * using the HTML -> PDF pipeline.
 *
 * MANAS360 — Dynamic Invoice PDF Generator
 * Story 13.12B (Invoice Module)
 * 
 * Stack: Node.js/Express + PDFKit
 * Trigger: Called by backend on PAYMENT_SUCCESS event
 * Output: PDF buffer → sent via WATI WhatsApp + ZeptoMail
 * 
 * Install: npm install pdfkit qrcode
 */

const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');

// ═══════════════════════════════════════════
// COMPANY CONSTANTS (from nameboard)
// ═══════════════════════════════════════════
const COMPANY = {
  name: 'MANAS360 Mental Wellness Pvt. Ltd.',
  shortName: 'MANAS360',
  address: '6, MLV, Talaghatpura, Kanakapura Road',
  city: 'Bengaluru 560062, Karnataka, India',
  cin: 'U86900KA2026PTC215013',
  gstin: '29AAUCM4417G1Z1',
  dpiit: 'DIPP244635',
  udhyam: 'KR-03-0654344',
  email: 'Manas360online@gmail.com',
  website: 'www.MANAS360.com',
  phone: '+91-80-6940-9284',
  mobile: '+91-8944-942-2180',
  stateCode: '29', // Karnataka
};

// Bank details (from cancelled cheque)
const BANK = {
  accountName: 'MANAS360 Mental Wellness Private Limited',
  bank: 'Kotak Mahindra Bank',
  accountNo: '9449442180',
  accountType: 'Startup Regular Current Account - CBS',
  ifsc: 'KKBK0008065',
  branch: 'City Mansion, 54 Langford Road, Bengaluru 560025',
  upiId: 'manas360mentalwellnesspvtltd@kotak',
};

// GST rate for mental health services
const GST_RATE = 0.18; // 18% total (9% CGST + 9% SGST)
const CGST_RATE = 0.09;
const SGST_RATE = 0.09;

// SAC codes for MANAS360 services
const SAC_CODES = {
  therapy_session: '999312',      // Health & social services
  ai_support: '998314',           // IT consulting / AI services
  subscription: '999312',         // Health subscription
  assessment: '999312',           // Health assessment
  training: '999293',             // Training & coaching
  corporate_eap: '999312',        // Corporate wellness
  digital_pet: '998314',          // Digital content
  certificate: '999293',          // Certification
};

// ═══════════════════════════════════════════
// COLORS (brand)
// ═══════════════════════════════════════════
const NAVY = '#002365';
const OLIVE = '#7F8000';
const ICE = '#E4F1F9';
const DARK = '#333333';
const MGRAY = '#666666';
const LGRAY = '#F5F5F5';
const GREEN = '#0A7A0A';

// ═══════════════════════════════════════════
// NUMBER TO WORDS (Indian format)
// ═══════════════════════════════════════════
function numberToWords(num) {
  if (num === 0) return 'Zero Rupees Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  
  function convertChunk(n) {
    if (n === 0) return '';
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertChunk(n % 100) : '');
  }
  
  function convert(n) {
    if (n === 0) return '';
    if (n < 1000) return convertChunk(n);
    if (n < 100000) return convertChunk(Math.floor(n / 1000)) + ' Thousand ' + convert(n % 1000);
    if (n < 10000000) return convertChunk(Math.floor(n / 100000)) + ' Lakh ' + convert(n % 100000);
    return convertChunk(Math.floor(n / 10000000)) + ' Crore ' + convert(n % 10000000);
  }
  
  let result = convert(rupees).trim() + ' Rupees';
  if (paise > 0) result += ' and ' + convertChunk(paise) + ' Paise';
  return result + ' Only';
}

// ═══════════════════════════════════════════
// INVOICE NUMBER GENERATOR
// ═══════════════════════════════════════════
function generateInvoiceNumber(prefix = 'INV') {
  const now = new Date();
  const fy = now.getMonth() >= 3
    ? `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(2)}`
    : `${now.getFullYear() - 1}-${now.getFullYear().toString().slice(2)}`;
  const seq = Date.now().toString().slice(-6);
  return `MANAS360/${fy}/${prefix}-${seq}`;
}

// ═══════════════════════════════════════════
// MAIN: GENERATE INVOICE PDF
// ═══════════════════════════════════════════
/**
 * @param {Object} paymentData - from PAYMENT_SUCCESS webhook
 * @param {string} paymentData.patientName
 * @param {string} paymentData.patientPhone
 * @param {string} paymentData.patientEmail
 * @param {string} paymentData.patientAddress (optional)
 * @param {string} paymentData.transactionId - PhonePe txn ID
 * @param {number} paymentData.amount - total amount paid (INR)
 * @param {string} paymentData.paymentMode - 'PhonePe UPI'
 * @param {Array}  paymentData.lineItems - [{description, sacCode, qty, rate}]
 * @param {string} paymentData.reference - e.g. 'SESSION-0042'
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateInvoice(paymentData) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 30, bottom: 30, left: 40, right: 40 },
        info: {
          Title: `MANAS360 Invoice - ${paymentData.transactionId}`,
          Author: 'MANAS360 Mental Wellness Pvt. Ltd.',
          Subject: 'Tax Invoice',
        }
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pw = doc.page.width;
      const margin = 40;
      const rw = pw - 2 * margin;
      let y = 30;

      // ─── ACCENT LINES ───
      doc.moveTo(margin, y).lineTo(pw - margin, y)
        .strokeColor(NAVY).lineWidth(3).stroke();
      doc.moveTo(margin, y + 4).lineTo(pw - margin, y + 4)
        .strokeColor(OLIVE).lineWidth(2).stroke();
      y += 20;

      // ─── COMPANY HEADER ───
      doc.fontSize(18).fillColor(NAVY).font('Helvetica-Bold')
        .text('MANAS360', margin, y, { continued: true })
        .fontSize(9).fillColor(OLIVE).font('Helvetica')
        .text('  Mental Wellness Pvt. Ltd.');

      doc.fontSize(14).fillColor(NAVY).font('Helvetica-Bold')
        .text('TAX INVOICE', margin, y, { align: 'right' });
      y += 22;

      doc.fontSize(7).fillColor(MGRAY).font('Helvetica')
        .text(`${COMPANY.address}, ${COMPANY.city}`, margin, y);
      y += 10;
      doc.text(`CIN: ${COMPANY.cin}  |  GSTIN: ${COMPANY.gstin}  |  DPIIT: ${COMPANY.dpiit}  |  UDHYAM: ${COMPANY.udhyam}`, margin, y);
      y += 10;
      doc.text(`E: ${COMPANY.email}  |  W: ${COMPANY.website}  |  Ph: ${COMPANY.phone}  |  M: ${COMPANY.mobile}`, margin, y);
      y += 14;

      doc.moveTo(margin, y).lineTo(pw - margin, y)
        .strokeColor('#DDDDDD').lineWidth(0.5).stroke();
      y += 14;

      // ─── INVOICE META ───
      const invoiceNo = generateInvoiceNumber('INV');
      const invoiceDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      const metaLeft = [
        ['Invoice No:', invoiceNo],
        ['Invoice Date:', invoiceDate],
        ['Due Date:', invoiceDate],
        ['Place of Supply:', `Karnataka (${COMPANY.stateCode})`],
      ];
      const metaRight = [
        ['Payment Mode:', paymentData.paymentMode || 'PhonePe UPI'],
        ['Transaction ID:', paymentData.transactionId],
        ['Payment Status:', 'PAID'],
        ['Reference:', paymentData.reference || '—'],
      ];

      metaLeft.forEach(([label, val], i) => {
        const yy = y + i * 13;
        doc.fontSize(8).font('Helvetica-Bold').fillColor(MGRAY).text(label, margin, yy);
        doc.font('Helvetica').fillColor(DARK).text(val, margin + 80, yy);
      });

      metaRight.forEach(([label, val], i) => {
        const yy = y + i * 13;
        const rx = pw / 2 + 20;
        doc.fontSize(8).font('Helvetica-Bold').fillColor(MGRAY).text(label, rx, yy);
        if (label === 'Payment Status:') {
          doc.font('Helvetica-Bold').fillColor(GREEN).text(val, rx + 85, yy);
        } else {
          doc.font('Helvetica').fillColor(DARK).text(val, rx + 85, yy);
        }
      });

      y += 65;
      doc.moveTo(margin, y).lineTo(pw - margin, y)
        .strokeColor('#DDDDDD').lineWidth(0.5).stroke();
      y += 14;

      // ─── BILL TO ───
      doc.fontSize(9).font('Helvetica-Bold').fillColor(NAVY)
        .text('BILL TO:', margin, y);
      y += 14;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(DARK)
        .text(paymentData.patientName || 'Patient Name', margin, y);
      y += 12;
      doc.fontSize(8).font('Helvetica').fillColor(MGRAY)
        .text(`Phone: ${paymentData.patientPhone || '+91-XXXXXXXXXX'}`, margin, y);
      y += 10;
      doc.text(`Email: ${paymentData.patientEmail || '—'}`, margin, y);
      y += 10;
      if (paymentData.patientAddress) {
        doc.text(`Address: ${paymentData.patientAddress}`, margin, y);
        y += 10;
      }
      y += 8;

      doc.moveTo(margin, y).lineTo(pw - margin, y)
        .strokeColor('#DDDDDD').lineWidth(0.5).stroke();
      y += 5;

      // ─── LINE ITEMS TABLE ───
      const colWidths = [25, 180, 45, 30, 55, 55, 45, 45, 55];
      const headers = ['#', 'Description', 'SAC', 'Qty', 'Rate', 'Taxable', 'CGST 9%', 'SGST 9%', 'Total'];

      // Header row
      let x = margin;
      doc.rect(margin, y, rw, 18).fill(NAVY);
      headers.forEach((h, i) => {
        doc.fontSize(7).font('Helvetica-Bold').fillColor('white')
          .text(h, x + 3, y + 5, { width: colWidths[i] - 6, align: i >= 3 ? 'right' : 'left' });
        x += colWidths[i];
      });
      y += 18;

      // Calculate line items
      let totalTaxable = 0;
      let totalCGST = 0;
      let totalSGST = 0;
      let grandTotal = 0;

      const items = paymentData.lineItems || [{
        description: 'Therapy Session (50 min)',
        sacCode: '999312',
        qty: 1,
        rate: paymentData.amount
      }];

      items.forEach((item, idx) => {
        const total = item.qty * item.rate;
        const taxable = total / (1 + GST_RATE);
        const cgst = taxable * CGST_RATE;
        const sgst = taxable * SGST_RATE;

        totalTaxable += taxable;
        totalCGST += cgst;
        totalSGST += sgst;
        grandTotal += total;

        const rowBg = idx % 2 === 0 ? '#FFFFFF' : LGRAY;
        doc.rect(margin, y, rw, 20).fill(rowBg);

        const rowData = [
          (idx + 1).toString(),
          item.description,
          item.sacCode || SAC_CODES.therapy_session,
          item.qty.toString(),
          item.rate.toFixed(2),
          taxable.toFixed(2),
          cgst.toFixed(2),
          sgst.toFixed(2),
          total.toFixed(2),
        ];

        x = margin;
        rowData.forEach((val, i) => {
          doc.fontSize(7.5).font('Helvetica').fillColor(DARK)
            .text(val, x + 3, y + 5, { width: colWidths[i] - 6, align: i >= 3 ? 'right' : 'left' });
          x += colWidths[i];
        });
        y += 20;
      });

      // Table border
      doc.rect(margin, y - (items.length * 20) - 18, rw, (items.length * 20) + 18)
        .strokeColor('#DDDDDD').lineWidth(0.5).stroke();
      y += 10;

      // ─── TOTALS ───
      const totalsX = pw - margin - 190;
      const roundOff = Math.round(grandTotal) - grandTotal;
      const finalTotal = Math.round(grandTotal);

      const totals = [
        ['Taxable Amount:', `${totalTaxable.toFixed(2)}`],
        ['CGST @ 9%:', `${totalCGST.toFixed(2)}`],
        ['SGST @ 9%:', `${totalSGST.toFixed(2)}`],
        ['Round Off:', `${roundOff >= 0 ? '+' : ''}${roundOff.toFixed(2)}`],
      ];

      totals.forEach(([label, val]) => {
        doc.fontSize(8).font('Helvetica').fillColor(MGRAY).text(label, totalsX, y);
        doc.font('Helvetica').fillColor(DARK).text(val, pw - margin - 55, y, { width: 55, align: 'right' });
        y += 13;
      });

      y += 2;
      doc.moveTo(totalsX, y).lineTo(pw - margin, y)
        .strokeColor(NAVY).lineWidth(1).stroke();
      y += 6;

      doc.fontSize(11).font('Helvetica-Bold').fillColor(NAVY)
        .text('GRAND TOTAL:', totalsX, y)
        .text(`INR ${finalTotal.toLocaleString('en-IN')}.00`, pw - margin - 80, y, { width: 80, align: 'right' });
      y += 4;
      doc.moveTo(totalsX, y + 12).lineTo(pw - margin, y + 12)
        .strokeColor(NAVY).lineWidth(1).stroke();

      y += 18;
      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(MGRAY)
        .text(`Amount in words: ${numberToWords(finalTotal)}`, margin, y);

      y += 22;
      doc.moveTo(margin, y).lineTo(pw - margin, y)
        .strokeColor('#DDDDDD').lineWidth(0.5).stroke();
      y += 14;

      // ─── BANK DETAILS ───
      doc.fontSize(9).font('Helvetica-Bold').fillColor(NAVY)
        .text('BANK DETAILS FOR NEFT/RTGS:', margin, y);
      y += 14;

      const bankFields = [
        ['Account Name:', BANK.accountName],
        ['Bank:', BANK.bank],
        ['Account No:', BANK.accountNo],
        ['Account Type:', BANK.accountType],
        ['IFSC:', BANK.ifsc],
        ['Branch:', BANK.branch],
      ];

      bankFields.forEach(([label, val]) => {
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(MGRAY).text(label, margin, y);
        doc.font('Helvetica').fillColor(DARK).text(val, margin + 80, y);
        y += 11;
      });

      // ─── UPI QR CODE ───
      try {
        const upiString = `upi://pay?pa=${BANK.upiId}&pn=${encodeURIComponent(COMPANY.shortName)}&am=${finalTotal}&cu=INR&tn=Invoice-${paymentData.transactionId}`;
        const qrDataUrl = await QRCode.toDataURL(upiString, { width: 100, color: { dark: NAVY } });
        const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
        doc.image(qrBuffer, pw - margin - 85, y - 75, { width: 70, height: 70 });
        doc.fontSize(7).font('Helvetica-Bold').fillColor(NAVY)
          .text('Scan to Pay (UPI)', pw - margin - 90, y - 3, { width: 80, align: 'center' });
      } catch (qrErr) {
        // QR generation failed — skip silently
      }

      y += 8;
      doc.moveTo(margin, y).lineTo(pw - margin, y)
        .strokeColor('#DDDDDD').lineWidth(0.5).stroke();
      y += 12;

      // ─── TERMS ───
      doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY)
        .text('TERMS & CONDITIONS:', margin, y);
      y += 11;

      const terms = [
        '1. MANAS360 is a technology aggregator platform, not a healthcare provider.',
        '2. All therapists are independent practitioners.',
        '3. Refund policy: No refunds for completed sessions. Cancellation 24hrs prior for full credit.',
        '4. This is a computer-generated invoice and does not require a physical signature.',
        '5. Subject to Bengaluru jurisdiction. Disputes governed by Indian law.',
        '6. DPDPA 2023 compliant. Data hosted on AWS Mumbai (ap-south-1).',
      ];

      doc.fontSize(6.5).font('Helvetica').fillColor(MGRAY);
      terms.forEach(t => { doc.text(t, margin, y); y += 9; });

      // ─── FOOTER ───
      y = doc.page.height - 40;
      doc.moveTo(margin, y).lineTo(pw - margin, y)
        .strokeColor(OLIVE).lineWidth(1.5).stroke();
      y += 8;
      doc.fontSize(6.5).font('Helvetica').fillColor(MGRAY)
        .text(`${COMPANY.name}  |  CIN: ${COMPANY.cin}  |  ${COMPANY.website}`, margin, y, { align: 'center', width: rw })
        .text('System-generated invoice from PhonePe payment confirmation. For queries: support@manas360.com', margin, y + 9, { align: 'center', width: rw });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ═══════════════════════════════════════════
// EXPRESS ROUTE (plug into your backend)
// ═══════════════════════════════════════════
/**
 * Usage in your Express app:
 * 
 * const { generateInvoice } = require('./services/invoice.service');
 * 
 * // In your payment success handler:
 * app.post('/webhook/phonepe', async (req, res) => {
 *   // ... verify PhonePe signature ...
 *   
 *   const pdfBuffer = await generateInvoice({
 *     patientName: 'Ravi Kumar',
 *     patientPhone: '+91-9876543210',
 *     patientEmail: 'ravi@email.com',
 *     transactionId: req.body.transactionId,
 *     amount: 699,
 *     paymentMode: 'PhonePe UPI',
 *     reference: 'SESSION-0042',
 *     lineItems: [{
 *       description: 'Individual Therapy Session (50 min, Video)',
 *       sacCode: '999312',
 *       qty: 1,
 *       rate: 699
 *     }]
 *   });
 *   
 *   // Option 1: Save to S3 and send URL via WATI
 *   const s3Url = await uploadToS3(pdfBuffer, `invoices/${invoiceNo}.pdf`);
 *   await emitEvent('PAYMENT_SUCCESS', { ...data, receiptUrl: s3Url });
 *   
 *   // Option 2: Send as WhatsApp document via WATI API
 *   await sendWatiDocument(patientPhone, pdfBuffer, 'MANAS360_Invoice.pdf');
 * });
 */

module.exports = { generateInvoice, generateInvoiceNumber, numberToWords, SAC_CODES, COMPANY, BANK };
