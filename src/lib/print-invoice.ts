import { getInvoiceBranding, type InvoiceBranding } from './invoice-branding';

interface LineItem {
  name: string;
  quantity: number;
  unit_price: number;
  serial_number?: string;
}

interface InvoiceData {
  id: string;
  created_at?: string;
  paid_at?: string;
  status: string;
  currency: string;
  product_name: string;
  original_price?: string;
  amount: number | string;
  item_discount?: string;
  item_discount_type?: string;
  sale_discount?: string;
  sale_discount_type?: string;
  serial_number?: string;
  bakong_transaction_id?: string;
  notes?: string;
  user?: { full_name?: string; email?: string; phone?: string } | null;
}

/** Parse "Product ×3, Other" into line items */
const parseLineItems = (order: InvoiceData): LineItem[] => {
  const amount = typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount;
  const originalPrice = order.original_price ? parseFloat(order.original_price) : amount;
  const serials = order.serial_number?.split(',').map(s => s.trim()).filter(Boolean) || [];

  const grouped = new Map<string, number>();
  const ordered: string[] = [];
  let totalUnits = 0;

  order.product_name.split(',').map(s => s.trim()).filter(Boolean).forEach(entry => {
    const match = entry.match(/^(.+?)\s*[×x]\s*(\d+)$/i);
    const name = match ? match[1].trim() : entry;
    const qty = match ? parseInt(match[2], 10) : 1;
    if (!grouped.has(name)) ordered.push(name);
    grouped.set(name, (grouped.get(name) || 0) + qty);
    totalUnits += qty;
  });

  const perUnit = totalUnits > 0 ? originalPrice / totalUnits : originalPrice;

  return ordered.map((name, i) => ({
    name,
    quantity: grouped.get(name) || 1,
    unit_price: perUnit,
    serial_number: i === 0 && serials.length ? serials.join(', ') : undefined,
  }));
};

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d.replace(/-/g, '/')).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function buildInvoiceHTML(order: InvoiceData, branding: InvoiceBranding): string {
  const amount = typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount;
  const originalPrice = order.original_price ? parseFloat(order.original_price) : amount;
  const totalDiscount = originalPrice - amount;
  const items = parseLineItems(order);

  const itemDiscountRaw = order.item_discount ? parseFloat(order.item_discount) : 0;
  const saleDiscountRaw = order.sale_discount ? parseFloat(order.sale_discount) : 0;
  const saleDiscountAmount = Math.min(saleDiscountRaw, totalDiscount);
  const itemDiscountAmount = totalDiscount - saleDiscountAmount;

  const invId = order.id.slice(0, 8).toUpperCase();
  const pc = branding.primary_color || '#111';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Invoice #${invId}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;max-width:680px;margin:0 auto;padding:40px 36px;color:#1a1a1a;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:13px;line-height:1.5}

/* Header */
.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
.logo-area{display:flex;align-items:center;gap:12px}
.logo-img{width:36px;height:36px;border-radius:8px;overflow:hidden;flex-shrink:0}
.logo-img img{width:100%;height:100%;object-fit:contain}
.logo-fallback{width:36px;height:36px;border-radius:8px;background:${pc};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0}
.co-name{font-size:16px;font-weight:700;color:#1a1a1a}
.co-detail{font-size:11px;color:#888;margin-top:1px}
.inv-meta{text-align:right}
.inv-title{font-size:20px;font-weight:700;color:#1a1a1a;letter-spacing:-0.5px}
.inv-id{font-size:11px;color:#888;margin-top:2px;font-variant-numeric:tabular-nums}

/* Divider line */
.line{height:1px;background:#e5e5e5;margin:0 0 24px}

/* Info grid */
.info{display:flex;justify-content:space-between;margin-bottom:28px;gap:20px}
.info-col{flex:1}
.info-label{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#aaa;margin-bottom:6px}
.info-value{font-size:13px;font-weight:500;color:#1a1a1a}
.info-sub{font-size:12px;color:#777;margin-top:2px}
.badge{display:inline-block;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:600;letter-spacing:0.3px}
.badge-paid{background:#ecfdf5;color:#065f46}
.badge-pending{background:#fffbeb;color:#92400e}
.badge-failed{background:#fef2f2;color:#991b1b}
.badge-expired,.badge-cancelled{background:#f5f5f5;color:#666}

/* Table */
table{width:100%;border-collapse:collapse;margin-bottom:24px}
thead th{text-align:left;padding:10px 0;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#999;border-bottom:2px solid #eee}
thead th.r{text-align:right}
tbody td{padding:12px 0;font-size:13px;color:#333;border-bottom:1px solid #f5f5f5}
tbody td.r{text-align:right;font-variant-numeric:tabular-nums}
tbody td.name{font-weight:500;color:#1a1a1a}
.sn{font-size:11px;color:#999;margin-top:2px}

/* Summary */
.summary{display:flex;justify-content:flex-end;margin-bottom:28px}
.summary-inner{width:240px}
.s-row{display:flex;justify-content:space-between;padding:5px 0;font-size:12px;color:#777}
.s-row.disc{color:#dc2626}
.s-row.total{border-top:2px solid #1a1a1a;margin-top:8px;padding-top:10px;font-size:15px;font-weight:700;color:#1a1a1a}

/* Notes */
.note{padding:14px 16px;background:#fafafa;border-radius:8px;margin-bottom:28px}
.note-label{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#aaa;margin-bottom:4px}
.note-text{font-size:12px;color:#555;line-height:1.6}

/* Footer */
.ftr{text-align:center;padding-top:20px;border-top:1px solid #eee}
.ftr-msg{font-size:13px;font-weight:500;color:#1a1a1a;margin-bottom:4px}
.ftr-co{font-size:11px;color:#aaa}

@media print{body{padding:20px 16px}}
</style></head><body>

<div class="hdr">
  <div class="logo-area">
    ${branding.site_logo_url
      ? `<div class="logo-img"><img src="${branding.site_logo_url}" alt="" /></div>`
      : `<div class="logo-fallback">${branding.site_name.charAt(0)}</div>`}
    <div>
      <div class="co-name">${branding.site_name}</div>
      ${branding.site_tagline ? `<div class="co-detail">${branding.site_tagline}</div>` : ''}
      ${branding.support_phone ? `<div class="co-detail">${branding.support_phone}</div>` : ''}
      ${branding.site_address ? `<div class="co-detail">${branding.site_address}</div>` : ''}
    </div>
  </div>
  <div class="inv-meta">
    <div class="inv-title">Invoice</div>
    <div class="inv-id">#${invId} · ${fmtDate(order.created_at)}</div>
  </div>
</div>

<div class="line"></div>

<div class="info">
  <div class="info-col">
    <div class="info-label">Bill To</div>
    <div class="info-value">${order.user?.full_name || 'Walk-in Customer'}</div>
    ${order.user?.email ? `<div class="info-sub">${order.user.email}</div>` : ''}
    ${order.user?.phone ? `<div class="info-sub">${order.user.phone}</div>` : ''}
  </div>
  <div class="info-col" style="text-align:right">
    <div class="info-label">Status</div>
    <div style="margin-top:2px"><span class="badge badge-${order.status}">${statusLabel(order.status)}</span></div>
    ${order.bakong_transaction_id ? `<div class="info-sub" style="margin-top:6px">Txn: ${order.bakong_transaction_id}</div>` : ''}
    ${order.paid_at ? `<div class="info-sub">Paid ${fmtDate(order.paid_at)}</div>` : ''}
  </div>
</div>

<table>
  <thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Total</th></tr></thead>
  <tbody>
    ${items.map(item => {
      const lineTotal = item.unit_price * item.quantity;
      return `<tr>
        <td class="name">${item.name}${item.serial_number ? `<div class="sn">S/N: ${item.serial_number}</div>` : ''}</td>
        <td class="r">${item.quantity}</td>
        <td class="r">$${item.unit_price.toFixed(2)}</td>
        <td class="r" style="font-weight:600">$${lineTotal.toFixed(2)}</td>
      </tr>`;
    }).join('')}
  </tbody>
</table>

<div class="summary">
  <div class="summary-inner">
    <div class="s-row"><span>Subtotal</span><span>$${originalPrice.toFixed(2)}</span></div>
    ${itemDiscountAmount > 0.005 ? `<div class="s-row disc"><span>Discount</span><span>−$${itemDiscountAmount.toFixed(2)}</span></div>` : ''}
    ${saleDiscountAmount > 0.005 ? `<div class="s-row disc"><span>Sale Discount</span><span>−$${saleDiscountAmount.toFixed(2)}</span></div>` : ''}
    <div class="s-row total"><span>Total</span><span>$${amount.toFixed(2)} ${order.currency}</span></div>
  </div>
</div>

${order.notes ? `<div class="note"><div class="note-label">Notes</div><div class="note-text">${order.notes}</div></div>` : ''}

<div class="ftr">
  <div class="ftr-msg">${branding.invoice_footer_text}</div>
  <div class="ftr-co">${branding.site_name}${branding.support_email ? ` · ${branding.support_email}` : ''}</div>
</div>

</body></html>`;
}

export async function printInvoice(order: InvoiceData) {
  const branding = await getInvoiceBranding();
  const html = buildInvoiceHTML(order, branding);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:none;left:-9999px';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open();
  doc.write(html);
  doc.close();
  iframe.onload = () => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
}
