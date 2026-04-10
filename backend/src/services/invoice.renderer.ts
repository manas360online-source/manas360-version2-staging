type InvoiceItem = {
	description: string;
	quantity: number;
	unitPriceMinor: number;
  taxableMinor?: number;
  cgstMinor?: number;
  sgstMinor?: number;
	totalMinor: number;
};

export type InvoiceRenderData = {
  invoiceId?: string;
	invoiceNumber: string;
	invoiceYear: number;
	sequenceNumber: number;
	issuedAt: Date;
	companyName: string;
	companyGstin?: string | null;
	companyAddress?: Record<string, unknown> | null;
	customerName: string;
	customerEmail?: string | null;
	customerPhone?: string | null;
	customerGstin?: string | null;
	billingAddress?: Record<string, unknown> | null;
	currency: string;
	items: InvoiceItem[];
	subtotalMinor: number;
	gstRate: number;
	cgstMinor: number;
	sgstMinor: number;
	gstAmountMinor: number;
	totalMinor: number;
	paymentReference: string;
	paymentStatus: string;
	metadata?: Record<string, unknown> | null;
};

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
  stateCode: '29',
};

const BANK = {
  accountName: 'MANAS360 Mental Wellness Private Limited',
  bank: 'Kotak Mahindra Bank',
  accountNo: '9449442180',
  accountType: 'Startup Regular Current Account - CBS',
  ifsc: 'KKBK0008065',
  branch: 'City Mansion, 54 Langford Road, Bengaluru 560025',
  upiId: 'manas360mentalwellnesspvtltd@kotak',
};

const SAC_CODES: Record<string, string> = {
  therapy_session: '999312',
  ai_support: '998314',
  subscription: '999312',
  assessment: '999312',
  training: '999293',
  corporate_eap: '999312',
  digital_pet: '998314',
  certificate: '999293',
};

const formatCurrencyMinor = (minor: number): string =>
	new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		maximumFractionDigits: 2,
	}).format((Number(minor) || 0) / 100);

const formatPlainMinor = (minor: number): string =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(minor) || 0) / 100);

const escapeHtml = (value: unknown): string =>
	String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');

const formatAddress = (value?: Record<string, unknown> | null): string => {
	if (!value || typeof value !== 'object') {
		return '';
	}

	const parts = [
		value.line1,
		value.line2,
		value.city,
		value.state,
		value.postalCode,
		value.country,
	]
		.map((part) => String(part ?? '').trim())
		.filter(Boolean);

	return parts.join(', ');
};

const numberToWords = (amount: number): string => {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Zero Rupees Only';
  }

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertChunk = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return ones[n] || '';
    if (n < 100) {
      const ten = tens[Math.floor(n / 10)] || '';
      const one = n % 10;
      return `${ten}${one ? ` ${ones[one]}` : ''}`.trim();
    }
    const hundred = ones[Math.floor(n / 100)] || '';
    const rem = n % 100;
    return `${hundred} Hundred${rem ? ` and ${convertChunk(rem)}` : ''}`.trim();
  };

  const convert = (n: number): string => {
    if (n === 0) return '';
    if (n < 1000) return convertChunk(n);
    if (n < 100000) {
      return `${convertChunk(Math.floor(n / 1000))} Thousand ${convert(n % 1000)}`.trim();
    }
    if (n < 10000000) {
      return `${convertChunk(Math.floor(n / 100000))} Lakh ${convert(n % 100000)}`.trim();
    }
    return `${convertChunk(Math.floor(n / 10000000))} Crore ${convert(n % 10000000)}`.trim();
  };

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = `${convert(rupees)} Rupees`;
  if (paise > 0) {
    words += ` and ${convertChunk(paise)} Paise`;
  }
  return `${words} Only`;
};

export const renderInvoiceHtml = (data: InvoiceRenderData): string => {
  const invoiceDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(data.issuedAt);

	const companyAddress = formatAddress(data.companyAddress);
	const billingAddress = formatAddress(data.billingAddress);
  const finalTotal = Math.round((Number(data.totalMinor) || 0) / 100);
  const amountInWords = numberToWords((Number(data.totalMinor) || 0) / 100);
  const paymentRef = escapeHtml(data.paymentReference || '-');
  const qrDataUrl = String(data.metadata?.upiQrDataUrl || '').trim();
  const invoiceId = escapeHtml(String(data.invoiceId || data.metadata?.invoiceId || '-'));

  const itemRows = data.items.map((item, index) => {
    const taxableMinor = Math.max(0, Number(item.taxableMinor ?? item.unitPriceMinor ?? 0));
    const cgstMinor = Math.max(0, Number(item.cgstMinor ?? 0));
    const sgstMinor = Math.max(0, Number(item.sgstMinor ?? 0));
    const sacCode = String((data.metadata?.sacCode as string) || SAC_CODES.therapy_session);
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(item.description)}</td>
        <td>${escapeHtml(sacCode)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${formatPlainMinor(item.unitPriceMinor)}</td>
        <td class="num">${formatPlainMinor(taxableMinor)}</td>
        <td class="num">${formatPlainMinor(cgstMinor)}</td>
        <td class="num">${formatPlainMinor(sgstMinor)}</td>
        <td class="num">${formatPlainMinor(item.totalMinor)}</td>
      </tr>`;
  }).join('');

	return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.invoiceNumber)}</title>
  <style>
    :root {
      color-scheme: light;
      --navy: #002365;
      --olive: #7f8000;
      --dark: #333333;
      --muted: #666666;
      --line: #dddddd;
      --panel: #f5f5f5;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 22px;
      color: var(--dark);
      font-family: Helvetica, Arial, sans-serif;
      font-size: 12px;
    }
  .main {
    max-width: 920px;
    margin: 0 auto;
    }
  .hr-accent {
    height: 5px;
    background: linear-gradient(90deg, var(--navy) 0 82%, var(--olive) 82% 100%);
    margin-bottom: 10px;
  }
  .head {
      display: flex;
      justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    }
  .h-company {
    font-size: 22px;
    font-weight: 700;
    color: var(--navy);
    line-height: 1.2;
    }
  .h-sub {
    font-size: 10px;
    color: var(--olive);
    margin-top: 2px;
    }
  .h-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--navy);
    text-align: right;
    }
  .meta {
      display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    padding-bottom: 10px;
  }
  .meta-col .r {
    display: grid;
    grid-template-columns: 94px 1fr;
    gap: 8px;
    margin-bottom: 4px;
    font-size: 11px;
  }
  .meta-col .k {
    font-weight: 700;
    color: var(--muted);
  }
  .meta-col .paid {
    color: #0a7a0a;
    font-weight: 700;
  }
  .section {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  .billto-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--navy);
  }
  .billto-name {
    margin-top: 6px;
    font-size: 12px;
    font-weight: 700;
  }
  .billto-line {
    font-size: 11px;
    color: var(--muted);
    margin-top: 2px;
  }
  .table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    font-size: 10.5px;
  }
  .table thead th {
    background: var(--navy);
    color: #fff;
    padding: 6px;
    text-align: left;
    font-weight: 700;
    border: 1px solid #e7e7e7;
  }
  .table tbody td {
    padding: 6px;
    border: 1px solid #e7e7e7;
    vertical-align: top;
  }
  .table tbody tr:nth-child(even) {
    background: var(--panel);
  }
  .num { text-align: right; }
  .summary {
    display: grid;
    justify-content: end;
    margin-top: 10px;
  }
  .summary .r {
    display: grid;
    grid-template-columns: 130px 100px;
    gap: 10px;
    font-size: 11px;
    margin-bottom: 4px;
  }
  .summary .k { color: var(--muted); }
  .summary .v { text-align: right; }
  .summary .grand {
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px solid var(--navy);
    font-weight: 700;
    color: var(--navy);
  }
  .words {
    margin-top: 8px;
    font-size: 10px;
    font-style: italic;
    color: var(--muted);
  }
  .bank {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
    display: grid;
    grid-template-columns: 1fr 90px;
    gap: 10px;
  }
  .qr-wrap {
    text-align: center;
  }
  .qr-wrap img {
    width: 78px;
    height: 78px;
    object-fit: contain;
    border: 1px solid var(--line);
    padding: 4px;
  }
  .qr-label {
    font-size: 9px;
    color: var(--navy);
    font-weight: 700;
    margin-top: 4px;
  }
  .bank-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 6px;
  }
  .bank .r {
    display: grid;
    grid-template-columns: 95px 1fr;
    gap: 8px;
    font-size: 10px;
    margin-bottom: 2px;
  }
  .terms {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  .terms-title {
    font-size: 11px;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 5px;
  }
  .terms ol {
    margin: 0;
    padding-left: 16px;
    font-size: 9.5px;
    color: var(--muted);
    line-height: 1.45;
  }
  .footer {
    margin-top: 10px;
    padding-top: 7px;
    border-top: 1px solid var(--olive);
    text-align: center;
    font-size: 9px;
    color: var(--muted);
    line-height: 1.35;
    }
    @media print {
    body { padding: 0; }
    }
  </style>
</head>
<body>
  <main class="main">
  <div class="hr-accent"></div>

  <section class="head">
    <div>
    <div class="h-company">MANAS360</div>
    <div class="h-sub">Mental Wellness Pvt. Ltd.</div>
    <div style="margin-top:6px;color:#666;font-size:10px;">Invoice ${escapeHtml(data.invoiceNumber)}</div>
    </div>
    <div class="h-title">TAX INVOICE</div>
  </section>

  <div style="font-size:9px;color:#666;line-height:1.35; margin-top:6px;">
    ${escapeHtml(COMPANY.address)}, ${escapeHtml(COMPANY.city)}<br/>
    CIN: ${escapeHtml(COMPANY.cin)} | GSTIN: ${escapeHtml(data.companyGstin || COMPANY.gstin)} | DPIIT: ${escapeHtml(COMPANY.dpiit)} | UDHYAM: ${escapeHtml(COMPANY.udhyam)}<br/>
    E: ${escapeHtml(COMPANY.email)} | W: ${escapeHtml(COMPANY.website)} | Ph: ${escapeHtml(COMPANY.phone)} | M: ${escapeHtml(COMPANY.mobile)}
  </div>

  <section class="meta">
    <div class="meta-col">
    <div class="r"><div class="k">Invoice No:</div><div>${escapeHtml(data.invoiceNumber)}</div></div>
    <div class="r"><div class="k">Invoice Date:</div><div>${escapeHtml(invoiceDate)}</div></div>
    <div class="r"><div class="k">Due Date:</div><div>${escapeHtml(invoiceDate)}</div></div>
    <div class="r"><div class="k">Place of Supply:</div><div>Karnataka (${escapeHtml(COMPANY.stateCode)})</div></div>
    </div>
    <div class="meta-col">
    <div class="r"><div class="k">Payment Mode:</div><div>${escapeHtml(String(data.metadata?.paymentMode || 'PhonePe UPI'))}</div></div>
    <div class="r"><div class="k">Transaction ID:</div><div>${paymentRef}</div></div>
    <div class="r"><div class="k">Payment Status:</div><div class="paid">PAID</div></div>
    <div class="r"><div class="k">Reference:</div><div>${escapeHtml(String(data.metadata?.reference || data.paymentReference || '-'))}</div></div>
    </div>
  </section>

  <section class="section">
    <div class="billto-title">BILL TO:</div>
    <div class="billto-name">${escapeHtml(data.customerName)}</div>
    ${data.customerPhone ? `<div class="billto-line">Phone: ${escapeHtml(data.customerPhone)}</div>` : ''}
    ${data.customerEmail ? `<div class="billto-line">Email: ${escapeHtml(data.customerEmail)}</div>` : ''}
    ${billingAddress ? `<div class="billto-line">Address: ${escapeHtml(billingAddress)}</div>` : ''}
    ${companyAddress ? `<div class="billto-line">Company Address: ${escapeHtml(companyAddress)}</div>` : ''}
  </section>

  <table class="table" aria-label="invoice-items">
    <thead>
    <tr>
      <th>#</th>
      <th>Description</th>
      <th>SAC</th>
      <th class="num">Qty</th>
      <th class="num">Rate</th>
      <th class="num">Taxable</th>
      <th class="num">CGST ${(data.gstRate / 2).toFixed(0)}%</th>
      <th class="num">SGST ${(data.gstRate / 2).toFixed(0)}%</th>
      <th class="num">Total</th>
    </tr>
    </thead>
    <tbody>
    ${itemRows}
    </tbody>
  </table>

  <div class="summary">
    <div class="r"><div class="k">Taxable Amount:</div><div class="v">${formatPlainMinor(data.subtotalMinor)}</div></div>
    <div class="r"><div class="k">CGST @ ${(data.gstRate / 2).toFixed(0)}%:</div><div class="v">${formatPlainMinor(data.cgstMinor)}</div></div>
    <div class="r"><div class="k">SGST @ ${(data.gstRate / 2).toFixed(0)}%:</div><div class="v">${formatPlainMinor(data.sgstMinor)}</div></div>
    <div class="r"><div class="k">Round Off:</div><div class="v">${(finalTotal - ((Number(data.totalMinor) || 0) / 100)) >= 0 ? '+' : ''}${(finalTotal - ((Number(data.totalMinor) || 0) / 100)).toFixed(2)}</div></div>
    <div class="r grand"><div>GRAND TOTAL:</div><div class="v">INR ${new Intl.NumberFormat('en-IN').format(finalTotal)}.00</div></div>
  </div>

  <div class="words">Amount in words: ${escapeHtml(amountInWords)}</div>

  <section class="bank">
    <div>
    <div class="bank-title">BANK DETAILS FOR NEFT/RTGS:</div>
    <div class="r"><div>Account Name:</div><div>${escapeHtml(BANK.accountName)}</div></div>
    <div class="r"><div>Bank:</div><div>${escapeHtml(BANK.bank)}</div></div>
    <div class="r"><div>Account No:</div><div>${escapeHtml(BANK.accountNo)}</div></div>
    <div class="r"><div>Account Type:</div><div>${escapeHtml(BANK.accountType)}</div></div>
    <div class="r"><div>IFSC:</div><div>${escapeHtml(BANK.ifsc)}</div></div>
    <div class="r"><div>Branch:</div><div>${escapeHtml(BANK.branch)}</div></div>
    <div class="r"><div>UPI:</div><div>${escapeHtml(BANK.upiId)}</div></div>
    </div>
    <div class="qr-wrap">
    ${qrDataUrl ? `<img src="${escapeHtml(qrDataUrl)}" alt="UPI QR" />` : ''}
    <div class="qr-label">Scan to Pay</div>
    </div>
  </section>

  <section class="terms">
    <div class="terms-title">TERMS & CONDITIONS:</div>
    <ol>
    <li>MANAS360 is a technology aggregator platform, not a healthcare provider.</li>
    <li>All therapists are independent practitioners.</li>
    <li>Refund policy: No refunds for completed sessions. Cancellation 24 hours prior for full credit.</li>
    <li>This is a computer-generated invoice and does not require a physical signature.</li>
    <li>Subject to Bengaluru jurisdiction. Disputes governed by Indian law.</li>
    <li>DPDPA 2023 compliant. Data hosted on AWS Mumbai (ap-south-1).</li>
    </ol>
  </section>

  <section class="footer">
    ${escapeHtml(COMPANY.name)} | CIN: ${escapeHtml(COMPANY.cin)} | ${escapeHtml(COMPANY.website)}<br/>
    Digitally generated invoice. No signature required. Invoice ID: ${invoiceId}.<br/>
    System-generated invoice from payment confirmation. For queries: support@manas360.com.
    ${data.metadata?.source ? ` Source: ${escapeHtml(String(data.metadata.source))}.` : ''}
  </section>
  </main>
</body>
</html>`;
};
