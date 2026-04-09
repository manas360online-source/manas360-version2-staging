type InvoiceItem = {
	description: string;
	quantity: number;
	unitPriceMinor: number;
	totalMinor: number;
};

export type InvoiceRenderData = {
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

const formatCurrencyMinor = (minor: number): string =>
	new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
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

export const renderInvoiceHtml = (data: InvoiceRenderData): string => {
	const invoiceDate = new Intl.DateTimeFormat('en-IN', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'Asia/Kolkata',
	}).format(data.issuedAt);

	const companyAddress = formatAddress(data.companyAddress);
	const billingAddress = formatAddress(data.billingAddress);
	const itemRows = data.items
		.map((item, index) => `
			<tr>
				<td>${index + 1}</td>
				<td>
					<div class="item-name">${escapeHtml(item.description)}</div>
					<div class="muted">Qty ${item.quantity}</div>
				</td>
				<td>${formatCurrencyMinor(item.unitPriceMinor)}</td>
				<td>${item.quantity}</td>
				<td>${formatCurrencyMinor(item.totalMinor)}</td>
			</tr>`)
		.join('');

	return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.invoiceNumber)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #111827;
      --muted: #6b7280;
      --line: #e5e7eb;
      --accent: #0f766e;
      --paper: #ffffff;
      --bg: #f8fafc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .sheet {
      max-width: 980px;
      margin: 0 auto;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
    }
    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      margin-bottom: 28px;
    }
    .brand {
      display: grid;
      gap: 6px;
    }
    .brand h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: -0.04em;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(15, 118, 110, 0.08);
      color: var(--accent);
      font-weight: 700;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }
    .meta-grid {
      display: grid;
      gap: 8px;
      text-align: right;
      font-size: 13px;
    }
    .muted { color: var(--muted); }
    .section-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 24px;
    }
    .panel {
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 18px;
      background: #fff;
    }
    .panel h2 {
      margin: 0 0 10px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--muted);
    }
    .panel p {
      margin: 4px 0;
      line-height: 1.5;
    }
    .table-wrap {
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      margin-top: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    thead {
      background: #f9fafb;
    }
    th, td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }
    .item-name { font-weight: 600; }
    .totals {
      display: grid;
      gap: 10px;
      max-width: 360px;
      margin-left: auto;
      margin-top: 18px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      font-size: 14px;
    }
    .total-row strong {
      font-size: 16px;
    }
    .grand {
      border-top: 1px solid var(--line);
      padding-top: 12px;
      margin-top: 4px;
      font-size: 18px;
      font-weight: 700;
    }
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
      font-size: 12px;
      color: var(--muted);
      line-height: 1.6;
    }
    @media print {
      body { background: white; padding: 0; }
      .sheet { box-shadow: none; border-radius: 0; border: none; }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <section class="topbar">
      <div class="brand">
        <span class="badge">Tax Invoice</span>
        <h1>${escapeHtml(data.companyName)}</h1>
        <div class="muted">Invoice ${escapeHtml(data.invoiceNumber)}</div>
      </div>
      <div class="meta-grid">
        <div><strong>Date</strong><br />${escapeHtml(invoiceDate)}</div>
        <div><strong>Sequence</strong><br />${data.invoiceYear}-${String(data.sequenceNumber).padStart(4, '0')}</div>
        <div><strong>Payment Ref</strong><br />${escapeHtml(data.paymentReference)}</div>
        <div><strong>Status</strong><br />${escapeHtml(data.paymentStatus)}</div>
      </div>
    </section>

    <section class="section-grid">
      <div class="panel">
        <h2>Seller</h2>
        <p><strong>${escapeHtml(data.companyName)}</strong></p>
        ${data.companyGstin ? `<p>GSTIN: ${escapeHtml(data.companyGstin)}</p>` : ''}
        ${companyAddress ? `<p>${escapeHtml(companyAddress)}</p>` : ''}
      </div>
      <div class="panel">
        <h2>Bill To</h2>
        <p><strong>${escapeHtml(data.customerName)}</strong></p>
        ${data.customerEmail ? `<p>${escapeHtml(data.customerEmail)}</p>` : ''}
        ${data.customerPhone ? `<p>${escapeHtml(data.customerPhone)}</p>` : ''}
        ${data.customerGstin ? `<p>GSTIN: ${escapeHtml(data.customerGstin)}</p>` : ''}
        ${billingAddress ? `<p>${escapeHtml(billingAddress)}</p>` : ''}
      </div>
    </section>

    <section class="panel">
      <h2>Invoice Items</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th>Unit Price</th>
              <th>Qty</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>
      <div class="totals">
        <div class="total-row"><span>Subtotal</span><strong>${formatCurrencyMinor(data.subtotalMinor)}</strong></div>
        <div class="total-row"><span>CGST (${data.gstRate / 2}%)</span><strong>${formatCurrencyMinor(data.cgstMinor)}</strong></div>
        <div class="total-row"><span>SGST (${data.gstRate / 2}%)</span><strong>${formatCurrencyMinor(data.sgstMinor)}</strong></div>
        <div class="total-row"><span>GST Total</span><strong>${formatCurrencyMinor(data.gstAmountMinor)}</strong></div>
        <div class="total-row grand"><span>Total</span><strong>${formatCurrencyMinor(data.totalMinor)}</strong></div>
      </div>
    </section>

    <section class="footer">
      This invoice was generated automatically by the MANAS360 payment pipeline.
      ${data.metadata?.source ? `Source: ${escapeHtml(data.metadata.source as string)}.` : ''}
    </section>
  </main>
</body>
</html>`;
};
