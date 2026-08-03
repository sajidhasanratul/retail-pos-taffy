(function () {
  'use strict';

  const Helpers = {
    /* ── Currency ──────────────────────────────────── */
    formatCurrency(amount) {
      const n = parseFloat(amount) || 0;
      return '৳' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    rawNumber(amount) {
      return parseFloat(amount) || 0;
    },

    /* ── Dates ─────────────────────────────────────── */
    formatDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    formatDateTime(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    },

    formatDateInput(dateStr) {
      const d = new Date(dateStr || Date.now());
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    },

    today() {
      return this.formatDateInput(new Date());
    },

    isDateInRange(dateStr, from, to) {
      if (!dateStr) return false;
      const d = new Date(dateStr).setHours(0, 0, 0, 0);
      if (from && d < new Date(from).setHours(0, 0, 0, 0)) return false;
      if (to && d > new Date(to).setHours(23, 59, 59, 999)) return false;
      return true;
    },

    /* ── CSV Export ────────────────────────────────── */
    exportCSV(data, filename) {
      if (!data || !data.length) return;
      const headers = Object.keys(data[0]);
      const rows = data.map(row =>
        headers.map(h => {
          let val = row[h] ?? '';
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        }).join(',')
      );
      const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = (filename || 'export') + '.csv';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    parseCSV(text) {
      if (!text) return [];
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return [];

      const parseLine = (line) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const headers = parseLine(lines[0]);
      const list = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        if (values.length < headers.length) continue;
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = values[idx] ?? '';
        });
        list.push(obj);
      }
      return list;
    },

    printHTML(html, title, settings = {}) {
      const w = window.open('', '_blank', 'width=800,height=600');
      const isReceipt = settings.default_print_type === 'receipt';
      const bodyClass = isReceipt ? 'receipt-body' : 'paper-body';
      w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${title || 'Print'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Libre+Barcode+39&display=swap" rel="stylesheet">
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:'Inter',sans-serif;padding:30px;color:#1e293b;font-size:13px}
          body.receipt-body { padding: 4px; font-size: 8pt; color: #000; line-height: 1.3; }
          body.receipt-body * { font-size: 8pt; }
          body.receipt-body h3 { font-size: 10pt !important; }
          body.receipt-body h4 { font-size: 8.5pt !important; }
          body.receipt-body small { font-size: 7.5pt !important; }
          body.receipt-body table th, body.receipt-body table td { font-size: 7.5pt !important; padding: 2px 0; }
          table{width:100%;border-collapse:collapse;margin:12px 0}
          th,td{border:1px solid #cbd5e1;padding:8px 10px;text-align:left}
          th{background:#f1f5f9;font-weight:600}
          .text-right{text-align:right} .text-center{text-align:center}
          h1{font-size:20px;margin-bottom:4px} h2{font-size:16px;margin:16px 0 8px}
          .invoice-header{display:flex;justify-content:space-between;margin-bottom:20px}
          .totals{margin-top:12px;text-align:right} .totals .grand{font-size:18px;font-weight:700}
          
          /* Thermal Receipt Printer CSS */
          /* Thermal Receipt Printer CSS */
          .thermal-receipt {
            max-width: ${settings.receipt_width || 80}mm;
            margin: 0 auto;
            color: #000;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
          }
          .thermal-receipt table {
            border: none;
            width: 100%;
            border-collapse: collapse;
          }
          
          /* Style 1: Standard Minimalist (Default) */
          .thermal-receipt.style-1 th, .thermal-receipt.style-1 td {
            border: none;
            border-bottom: 1px dashed #ccc;
            padding: 5px 2px;
            font-size: 11px;
            background: none !important;
          }
          .thermal-receipt.style-1 th {
            border-bottom: 2px dashed #000;
            font-weight: 700;
            text-transform: uppercase;
          }
          .thermal-receipt.style-1 hr {
            border: none;
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .thermal-receipt.style-1 .totals {
            margin-top: 10px;
            border-top: 2px dashed #000;
            padding-top: 8px;
            text-align: right;
          }
          
          /* Style 2: Classic Bordered (Compact) */
          .thermal-receipt.style-2 {
            border: 2px solid #000;
            padding: 8px;
          }
          .thermal-receipt.style-2 th, .thermal-receipt.style-2 td {
            border: 1px solid #000;
            padding: 5px;
            font-size: 11px;
            background: none !important;
          }
          .thermal-receipt.style-2 th {
            font-weight: 700;
            background: #f1f5f9 !important;
          }
          .thermal-receipt.style-2 hr {
            border: none;
            border-top: 1px solid #000;
            margin: 8px 0;
          }
          .thermal-receipt.style-2 .totals {
            margin-top: 8px;
            border-top: 1px solid #000;
            padding-top: 6px;
            text-align: right;
          }

          /* Style 3: Modern Elegant (Centered Header) */
          .thermal-receipt.style-3 {
            text-align: center;
          }
          .thermal-receipt.style-3 table {
            text-align: center;
          }
          .thermal-receipt.style-3 th, .thermal-receipt.style-3 td {
            border: none;
            border-bottom: 1px solid #ddd;
            padding: 6px 3px;
            font-size: 11px;
            text-align: center;
          }
          .thermal-receipt.style-3 th:first-child, .thermal-receipt.style-3 td:first-child {
            text-align: left;
          }
          .thermal-receipt.style-3 th:last-child, .thermal-receipt.style-3 td:last-child {
            text-align: right;
          }
          .thermal-receipt.style-3 th {
            border-bottom: 2px solid #000;
            font-weight: 700;
          }
          .thermal-receipt.style-3 hr {
            border: none;
            border-top: 2px double #000;
            margin: 10px 0;
          }
          .thermal-receipt.style-3 .totals {
            margin-top: 10px;
            border-top: 2px double #000;
            padding-top: 8px;
            text-align: right;
          }
          
          .thermal-receipt .totals p {
            margin: 3px 0;
          }
          
          /* Product Label Printer CSS */
          .product-label {
            width: 50mm;
            height: 30mm;
            padding: 3mm;
            border: 1px dashed #94a3b8;
            margin: 0 auto;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            font-family: 'Inter', sans-serif;
            color: #000;
          }
          .label-title {
            font-size: 10px;
            font-weight: 800;
            margin-bottom: 2px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
          .label-price {
            font-size: 11px;
            font-weight: 800;
            margin: 1px 0;
          }
          .label-barcode {
            margin: 2px auto;
            font-family: 'Libre Barcode 39', monospace;
            font-size: 24px;
            letter-spacing: 2px;
          }
          .label-sku {
            font-size: 8px;
            color: #334155;
            font-weight: 600;
          }
          
          /* Paper Invoice CSS styles */
          .paper-invoice {
            max-width: ${settings.invoice_width || 800}px;
            margin: 0 auto;
            color: #1e293b;
            padding: 10px;
          }
          .paper-invoice .invoice-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
            padding-bottom: 16px;
          }
          .paper-invoice .store-details h2 {
            font-size: 22px;
            font-weight: 700;
            color: #0f172a;
          }
          .paper-invoice .invoice-meta {
            text-align: right;
          }
          .paper-invoice .invoice-meta h1 {
            font-size: 26px;
            font-weight: 800;
            color: #1e293b;
            letter-spacing: -0.5px;
          }
          .paper-invoice .billing-details {
            margin-bottom: 20px;
            background: #f8fafc;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .paper-invoice .billing-details h3 {
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 4px;
            color: #475569;
            text-transform: uppercase;
          }
          .paper-invoice .items-table th, .paper-invoice .items-table td {
            padding: 10px 12px;
            font-size: 12px;
          }
          .paper-invoice .invoice-bottom {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            gap: 40px;
          }
          .paper-invoice .notes-area {
            flex: 1;
            font-size: 11px;
            color: #64748b;
            line-height: 1.5;
          }
          .paper-invoice .totals-area {
            width: 300px;
          }
          .paper-invoice .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 13px;
            border-bottom: 1px solid #e2e8f0;
          }
          .paper-invoice .totals-row.grand {
            font-size: 16px;
            font-weight: 800;
            color: #0f172a;
            border-bottom: 2px solid #0f172a;
            padding: 8px 0;
          }
          .paper-invoice .totals-row.paid {
            font-size: 13px;
            color: #10b981;
            border: none;
          }
          .paper-invoice .signature-line {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            font-size: 12px;
          }
          .paper-invoice .sig-box {
            text-align: center;
          }
          
          /* Modern Minimalist Theme */
          .paper-invoice.theme-modern .invoice-top {
            border-bottom: 3px solid #3b82f6;
          }
          .paper-invoice.theme-modern .items-table th {
            background: #3b82f6;
            color: #fff;
          }
          
          /* Classic Business Theme */
          .paper-invoice.theme-classic .invoice-top {
            border-bottom: 4px double #000;
          }
          .paper-invoice.theme-classic .items-table th {
            background: #000;
            color: #fff;
          }
          .paper-invoice.theme-classic .billing-details {
            background: #fff;
            border-radius: 0;
            border: 2px solid #000;
          }

          /* Compact Invoice Theme */
          .paper-invoice.theme-compact {
            font-size: 11px;
          }
          .paper-invoice.theme-compact .invoice-top {
            margin-bottom: 12px;
            padding-bottom: 8px;
          }
          .paper-invoice.theme-compact .items-table th, .paper-invoice.theme-compact .items-table td {
            padding: 6px 8px;
          }
          
          @media print {
            body { padding: 0 !important; }
            body.receipt-body { padding: 1mm !important; }
            body.receipt-body .thermal-receipt { width: 100% !important; max-width: 100% !important; }
            .product-label { border: none !important; }
            .paper-invoice { width: 100% !important; padding: 0 !important; margin: 0 !important; }
            thead { display: table-row-group !important; }
          }
        </style></head><body class="${bodyClass}">${html}</body></html>`);
      w.document.close();
      setTimeout(() => { w.print(); }, 400);
    },

    async printOrder(order, items, localPayments = null) {
      const S = POS.Store;
      const settings = await S.getSettings();
      const printType = settings.default_print_type || 'receipt';

      let paymentsList = localPayments;
      if (!paymentsList) {
        try {
          const pRes = await fetch(`${window.location.origin}/api/payments`, {
            headers: S.getHeaders()
          });
          if (pRes.ok) {
            const allP = await pRes.json();
            paymentsList = allP.filter(p => p.orderId === order.id);
          }
        } catch (err) {
          console.error(err);
        }
      }
      if (!paymentsList) paymentsList = [];

      let itemsHtml = '';
      if (printType === 'receipt') {
        items.forEach(item => {
          const varText = item.variationName ? ` (${this.esc(item.variationName)})` : '';
          itemsHtml += `
            <div style="padding: 4px 0; border-bottom: 1px dashed #ddd; font-size: 8.5pt;">
              <div style="font-weight: 700; word-break: break-word;">${this.esc(item.productName)}${varText}</div>
              <div style="display: flex; justify-content: space-between; font-size: 8pt; color: #333; margin-top: 2px;">
                <span>${item.qty} x ${this.formatCurrency(item.unitPrice)}</span>
                <strong>${this.formatCurrency(item.total || (item.unitPrice * item.qty))}</strong>
              </div>
            </div>
          `;
        });
      } else {
        items.forEach(item => {
          itemsHtml += `
            <tr>
              <td>${this.esc(item.productName)} ${item.variationName ? `<br><small style="color:#555">${this.esc(item.variationName)}</small>` : ''}</td>
              <td class="text-center">${item.qty}</td>
              <td class="text-right">${this.formatCurrency(item.unitPrice)}</td>
              <td class="text-right">${this.formatCurrency(item.total || (item.unitPrice * item.qty))}</td>
            </tr>
          `;
        });
      }

      const showStoreName = settings.invoice_show_store_name !== '0';
      const storeName = showStoreName ? (settings.store_name || '').trim() : '';
      const storeAddress = settings.store_address || '';
      const storePhone = settings.store_phone || '';

      let printContent = '';

      if (printType === 'receipt') {
        // Thermal Receipt layout
        printContent = `
          <div class="thermal-receipt ${settings.receipt_style || 'style-1'}">
            <div style="text-align: center; margin-bottom: 8px;">
              ${settings.invoice_logo ? `<img src="${settings.invoice_logo}" style="max-width: 60px; max-height: 60px; object-fit: contain; margin-bottom: 6px; display: block; margin-left: auto; margin-right: auto;">` : ''}
              ${storeName ? `<h3 style="margin:0; font-size:12pt;">🏪 ${this.esc(storeName)}</h3>` : ''}
              <p style="font-size:8pt; margin: 2px 0 0 0;">${this.esc(storeAddress)}</p>
              <p style="font-size:8pt; margin: 1px 0 0 0;">Phone: ${this.esc(storePhone)}</p>
              ${settings.store_website ? `<p style="font-size:8pt; margin: 1px 0 0 0;">Website: ${this.esc(settings.store_website)}</p>` : ''}
            </div>
            <hr>
            <div style="font-size: 8pt; line-height: 1.4; margin-bottom: 6px;">
              <div><strong>Invoice ID:</strong> ${order.invoiceId}</div>
              <div><strong>Customer:</strong> ${this.esc(order.customerName)} (${this.esc(order.customerPhone)})</div>
              <div><strong>Date:</strong> ${this.formatDateTime(order.date)}</div>
            </div>
            <hr>
            <div style="margin: 6px 0;">
              ${itemsHtml}
            </div>
            
            <div class="totals" style="font-size: 8.5pt;">
              <p>Sub Total: <strong>${this.formatCurrency(order.subtotal)}</strong></p>
              ${order.discountAmount > 0 ? `<p>Discount: <strong style="color:#000">-${this.formatCurrency(order.discountAmount)}</strong></p>` : ''}
              ${order.taxAmount > 0 ? `<p>Tax (${order.taxPercent}%): <strong>${this.formatCurrency(order.taxAmount)}</strong></p>` : ''}
              <p style="font-size:10.5pt; font-weight:800; border-top:1px dashed #000; padding-top:4px; margin-top:4px;">Grand Total: <span>${this.formatCurrency(order.grandTotal)}</span></p>
            </div>

            ${paymentsList.length > 0 ? `
              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #000; font-size: 8pt; line-height: 1.4;">
                <div style="font-weight: 700; margin-bottom: 2px;">Payment Details:</div>
                ${paymentsList.map(p => `
                  <div style="display: flex; justify-content: space-between;">
                    <span>• ${this.esc(p.method)}${(p.lastFour || p.lastfour) ? ` (xxxx-${p.lastFour || p.lastfour})` : ''}</span>
                    <strong>${this.formatCurrency(p.amount)}</strong>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            <hr>
            <div style="text-align: center; margin-top: 15px; font-size: 8pt;">
              ${settings.invoice_note ? `<p style="margin-bottom: 8px; font-style: italic; color:#333;">${this.esc(settings.invoice_note)}</p>` : ''}
              <p style="font-weight:700;">Thank you for shopping with us!</p>
              ${settings.store_website ? `<p style="font-size: 8pt; margin-top:4px; color:#555;">${this.esc(settings.store_website)}</p>` : ''}
              <p style="font-size: 7.5pt; margin-top:6px; color:#888;">Software by Zen IT</p>
            </div>
          </div>
        `;
      } else {
        // Paper A4 Invoice layout
        printContent = `
          <div class="paper-invoice ${settings.invoice_style || 'theme-modern'}">
            <div class="invoice-top">
              <div class="store-details" style="display:flex; align-items:center; gap:16px;">
                ${settings.invoice_logo ? `<img src="${settings.invoice_logo}" style="max-width: 80px; max-height: 80px; object-fit: contain; border-radius: 4px;">` : ''}
                <div>
                  ${storeName ? `<h2 style="margin:0;">🏬 ${this.esc(storeName)}</h2>` : ''}
                  <p style="margin:2px 0 0 0; font-size:12px; color:#64748b;">${this.esc(storeAddress)}</p>
                  <p style="margin:1px 0 0 0; font-size:12px; color:#64748b;"><strong>Phone:</strong> ${this.esc(storePhone)}</p>
                  ${settings.store_website ? `<p style="margin:1px 0 0 0; font-size:12px; color:#64748b;"><strong>Website:</strong> ${this.esc(settings.store_website)}</p>` : ''}
                </div>
              </div>
              <div class="invoice-meta">
                <h1>RETAIL INVOICE</h1>
                <p><strong>Invoice ID:</strong> ${order.invoiceId}</p>
                <p><strong>Sales Date:</strong> ${this.formatDateTime(order.date)}</p>
              </div>
            </div>
            
            <div class="billing-details">
              <h3>Bill To:</h3>
              <p><strong>Customer Name:</strong> ${this.esc(order.customerName)}</p>
              <p><strong>Contact Phone:</strong> ${this.esc(order.customerPhone)}</p>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th style="text-align:left;">Item Description</th>
                  <th style="text-align:center; width:80px;">Qty</th>
                  <th style="text-align:right; width:120px;">Unit Price</th>
                  <th style="text-align:right; width:120px;">Total Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="invoice-bottom">
              <div class="notes-area">
                <p style="font-weight:700; margin-bottom:4px; color:var(--text-dark);">Terms & Conditions / Note</p>
                ${settings.invoice_note ? `<p style="white-space: pre-line; line-height: 1.5; color: #555;">${this.esc(settings.invoice_note)}</p>` : '<p>1. Goods once sold cannot be returned or exchanged.</p><p>2. Keep this invoice safe for any warranty claims.</p>'}
                <div style="margin-top: 15px; font-size: 11px; color:#475569;">
                  ${settings.store_website ? `<p>Website: <strong>${this.esc(settings.store_website)}</strong></p>` : ''}
                </div>
              </div>
              <div class="totals-area">
                <div class="totals-row">
                  <span>Sub Total:</span>
                  <strong>${this.formatCurrency(order.subtotal)}</strong>
                </div>
                ${order.discountAmount > 0 ? `
                  <div class="totals-row text-danger">
                    <span>Discount:</span>
                    <strong>-${this.formatCurrency(order.discountAmount)}</strong>
                  </div>
                ` : ''}
                ${order.taxAmount > 0 ? `
                  <div class="totals-row">
                    <span>Tax (${order.taxPercent}%):</span>
                    <strong>${this.formatCurrency(order.taxAmount)}</strong>
                  </div>
                ` : ''}
                <div class="totals-row grand">
                  <span>Grand Total:</span>
                  <strong>${this.formatCurrency(order.grandTotal)}</strong>
                </div>

                ${paymentsList.length > 0 ? `
                  <div style="margin-top:12px; border-top:1px dashed #cbd5e1; padding-top:8px; font-size:11px;">
                    <div style="font-weight:700; color:#475569; margin-bottom:4px;">Payment Method:</div>
                    ${paymentsList.map(p => `
                      <div class="totals-row" style="border:none; padding:2px 0;">
                        <span>• ${this.esc(p.method)}${(p.lastFour || p.lastfour) ? ` (xxxx-${p.lastFour || p.lastfour})` : ''}</span>
                        <strong>${this.formatCurrency(p.amount)}</strong>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="signature-line">
              <div class="sig-box">
                <div style="border-top:1px solid #94a3b8; width:180px; margin-top:50px;">Customer Signature</div>
              </div>
              <div class="sig-box">
                <div style="border-top:1px solid #94a3b8; width:180px; margin-top:50px;">Authorized Signature</div>
              </div>
            </div>
          </div>
        `;
      }

      this.printHTML(printContent, `Invoice ${order.invoiceId}`, settings);
    },

    /* ── Toast Notification ────────────────────────── */
    showToast(message, type) {
      type = type || 'success';
      const icons = { success: '✓', error: '✗', info: 'ⓘ', warning: '⚠' };
      const toast = document.createElement('div');
      toast.className = 'toast toast-' + type;
      toast.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ⓘ') + '</span><span>' + message + '</span>';
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
      }, 3000);
    },

    /* ── Confirm Dialog ────────────────────────────── */
    confirm(message) {
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
          <div class="modal" style="max-width:420px">
            <div class="modal-header"><h3>Confirm Action</h3>
              <button class="modal-close" id="confirm-close">&times;</button></div>
            <div class="modal-body"><p style="font-size:15px">${message}</p></div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="confirm-no">Cancel</button>
              <button class="btn btn-danger" id="confirm-yes">Confirm</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        const close = (val) => { overlay.remove(); resolve(val); };
        overlay.querySelector('#confirm-yes').onclick = () => close(true);
        overlay.querySelector('#confirm-no').onclick = () => close(false);
        overlay.querySelector('#confirm-close').onclick = () => close(false);
      });
    },

    /* ── Debounce ──────────────────────────────────── */
    debounce(fn, ms) {
      let t; return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms || 300); };
    },

    /* ── Escape HTML ──────────────────────────────── */
    esc(str) {
      const d = document.createElement('div');
      d.textContent = str || '';
      return d.innerHTML;
    },

    /* ── Payment methods ──────────────────────────── */
    paymentMethods: ['Cash', 'Card', 'bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Other'],

    /* ── Customer labels ──────────────────────────── */
    customerLabels: ['Regular', 'VIP', 'Elite', 'Wholesale', 'Premium', 'New'],

    labelColors: {
      Regular: '#64748b', VIP: '#7c3aed', Elite: '#d97706',
      Wholesale: '#059669', Premium: '#2563eb', New: '#06b6d4'
    }
  };

  window.POS = window.POS || {};
  window.POS.Helpers = Helpers;
})();
