(function () {
  'use strict';

  const SalesReturn = {
    selectedOrder: null,
    returnItems: [], // items list to return with quantity and returnPrice

    render() {
      const mc = document.getElementById('main-content');
      const H = POS.Helpers;

      let invoiceSearchVal = localStorage.getItem('return_search_invoice') || '';
      localStorage.removeItem('return_search_invoice'); // consume it

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">🔄 Sales Return</h2>
            <p class="page-subtitle">Return items from a completed invoice to refund customers and restore stock levels.</p>
          </div>
          <div class="page-actions">
            <a href="#/return-list" class="btn btn-secondary btn-sm">Return List</a>
          </div>
        </div>

        <div class="card mb-3 fade-in">
          <div class="card-header">🔍 Lookup Invoice</div>
          <div class="card-body">
            <div style="display:flex; gap:10px;">
              <input type="text" class="form-input" id="return-invoice-search" placeholder="Enter Invoice ID (e.g. INV-0001)..." value="${H.esc(invoiceSearchVal)}" style="max-width:400px;">
              <button class="btn btn-primary" id="btn-search-invoice-return">Search</button>
            </div>
          </div>
        </div>

        <div id="return-details-container" class="fade-in"></div>
      `;

      // Event listener
      document.getElementById('btn-search-invoice-return').onclick = () => {
        const val = document.getElementById('return-invoice-search').value.trim();
        this.lookupInvoice(val);
      };

      // Support enter key
      document.getElementById('return-invoice-search').onkeydown = (e) => {
        if (e.key === 'Enter') document.getElementById('btn-search-invoice-return').click();
      };

      // Auto-trigger if prefilled
      if (invoiceSearchVal) {
        this.lookupInvoice(invoiceSearchVal);
      }
    },

    async lookupInvoice(invoiceId) {
      const S = POS.Store;
      const H = POS.Helpers;
      const container = document.getElementById('return-details-container');

      if (!invoiceId) {
        H.showToast('Please enter an Invoice ID', 'error');
        return;
      }

      // Query database for invoice matching code
      const matches = await S.query('orders', o => o.invoiceId.toLowerCase() === invoiceId.toLowerCase());
      if (matches.length === 0) {
        container.innerHTML = `
          <div class="card">
            <div class="card-body text-center text-muted">
              ⚠️ Invoice not found. Double check the ID.
            </div>
          </div>
        `;
        return;
      }

      const order = matches[0];
      this.selectedOrder = order;

      // Load items for this order
      const items = await S.query('orderItems', i => i.orderId === order.id);

      // We need to verify what quantities are already returned!
      const returnRecords = await S.query('returns', r => r.orderId === order.id);
      const returnedItemQuantities = {}; // productId_variationName -> qty

      returnRecords.forEach(r => {
        // Query return items from global store matching this return ticket
        // Wait, since we are calling it on the frontend, let's fetch all returnItems
        // Actually, we can fetch all returnItems in one go
      });

      // Let's optimize: fetch all return items and match
      const allReturnItems = await S.getAll('returnItems');
      returnRecords.forEach(r => {
        const rItems = allReturnItems.filter(ri => ri.returnId === r.id);
        rItems.forEach(ri => {
          const key = ri.productId + '_' + (ri.variationName || '');
          returnedItemQuantities[key] = (returnedItemQuantities[key] || 0) + ri.qty;
        });
      });

      // Prepare items for rendering
      this.returnItems = items.map(item => {
        const key = item.productId + '_' + (item.variationName || '');
        const alreadyReturned = returnedItemQuantities[key] || 0;
        const availableToReturn = item.qty - alreadyReturned;

        return {
          ...item,
          alreadyReturned,
          availableToReturn,
          qtyToReturn: 0 // initial return value selection
        };
      });

      this.renderReturnPanel(order);
    },

    renderReturnPanel(order) {
      const H = POS.Helpers;
      const container = document.getElementById('return-details-container');

      let itemsRows = '';
      this.returnItems.forEach((item, index) => {
        itemsRows += `
          <tr class="return-item-row" data-index="${index}">
            <td>
              <div style="font-weight:600;">${H.esc(item.productName)}</div>
              ${item.variationName ? `<div class="text-muted text-sm">${H.esc(item.variationName)}</div>` : ''}
            </td>
            <td class="text-center">${item.qty}</td>
            <td class="text-center text-warning" style="font-weight:600;">${item.alreadyReturned}</td>
            <td class="text-center text-success" style="font-weight:600;">${item.availableToReturn}</td>
            <td class="text-right">${H.formatCurrency(item.unitPrice)}</td>
            <td>
              <div class="qty-control" style="margin: 0 auto; max-width:120px;">
                <button class="btn-ret-qty-dec" ${item.availableToReturn === 0 ? 'disabled' : ''}>-</button>
                <input type="number" class="input-ret-qty" value="${item.qtyToReturn}" min="0" max="${item.availableToReturn}" ${item.availableToReturn === 0 ? 'readonly' : ''}>
                <button class="btn-ret-qty-inc" ${item.availableToReturn === 0 ? 'disabled' : ''}>+</button>
              </div>
            </td>
            <td class="text-right return-row-total" style="font-weight:700;">৳0.00</td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="selected-sale-card">
          <button class="close-sale" id="btn-close-return-view">&times;</button>
          <h4>Invoice Selected: ${order.invoiceId}</h4>
          <p><strong>Customer:</strong> ${H.esc(order.customerName)} (${H.esc(order.customerPhone)})</p>
          <p><strong>Grand Total:</strong> ${H.formatCurrency(order.grandTotal)}</p>
          <p><strong>Sales Date:</strong> ${H.formatDateTime(order.date)}</p>
        </div>

        <div class="card mt-2">
          <div class="card-header">Select Products to Return</div>
          <div class="card-body">
            <div class="table-wrapper mb-2">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th class="text-center" style="width: 80px;">Sold Qty</th>
                    <th class="text-center" style="width: 100px;">Already Ret.</th>
                    <th class="text-center" style="width: 100px;">Avail. to Ret.</th>
                    <th class="text-right" style="width: 100px;">Unit Price</th>
                    <th class="text-center" style="width: 130px;">Return Qty</th>
                    <th class="text-right" style="width: 100px;">Refund Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>
            </div>

            <div class="section-header green" style="justify-content:space-between; margin-bottom: 20px;">
              <span>Return Summary</span>
              <span style="font-size:18px; font-weight:800;" id="return-total-summary">Refund Total: ৳0.00</span>
            </div>

            <button class="btn btn-success btn-lg btn-block" id="btn-process-return">✓ PROCESS RETURN</button>
          </div>
        </div>
      `;

      // Close return panel click
      document.getElementById('btn-close-return-view').onclick = () => {
        container.innerHTML = '';
        this.selectedOrder = null;
        this.returnItems = [];
      };

      // Qty trigger controls
      container.querySelectorAll('.return-item-row').forEach(row => {
        const idx = parseInt(row.dataset.index);
        const item = this.returnItems[idx];

        row.querySelector('.btn-ret-qty-dec').onclick = () => {
          if (item.qtyToReturn > 0) {
            item.qtyToReturn--;
            this.updateReturnRow(row, item);
          }
        };

        row.querySelector('.btn-ret-qty-inc').onclick = () => {
          if (item.qtyToReturn < item.availableToReturn) {
            item.qtyToReturn++;
            this.updateReturnRow(row, item);
          }
        };

        row.querySelector('.input-ret-qty').onchange = (e) => {
          let val = parseInt(e.target.value) || 0;
          if (val < 0) val = 0;
          if (val > item.availableToReturn) {
            val = item.availableToReturn;
            H.showToast('Quantity exceeds available return amount', 'warning');
          }
          item.qtyToReturn = val;
          this.updateReturnRow(row, item);
        };
      });

      // Process return click
      document.getElementById('btn-process-return').onclick = () => this.processReturn();
    },

    updateReturnRow(row, item) {
      const H = POS.Helpers;
      row.querySelector('.input-ret-qty').value = item.qtyToReturn;
      const total = item.unitPrice * item.qtyToReturn;
      row.querySelector('.return-row-total').textContent = H.formatCurrency(total);
      this.recalculateTotalRefund();
    },

    recalculateTotalRefund() {
      const H = POS.Helpers;
      const sum = this.returnItems.reduce((s, i) => s + (i.unitPrice * i.qtyToReturn), 0);
      document.getElementById('return-total-summary').textContent = `Refund Total: ${H.formatCurrency(sum)}`;
    },

    async processReturn() {
      const S = POS.Store;
      const H = POS.Helpers;

      const toReturn = this.returnItems.filter(i => i.qtyToReturn > 0);
      if (toReturn.length === 0) {
        H.showToast('Please select at least one item to return.', 'error');
        return;
      }

      const totalRefund = toReturn.reduce((s, i) => s + (i.unitPrice * i.qtyToReturn), 0);

      // Create return ticket
      const returnId = await S.getNextId('RET-');
      const returnRecordId = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
      const retObj = {
        id: returnRecordId,
        returnId,
        orderId: this.selectedOrder.id,
        invoiceId: this.selectedOrder.invoiceId,
        customerName: this.selectedOrder.customerName,
        customerPhone: this.selectedOrder.customerPhone,
        date: new Date().toISOString(),
        returnTotal: totalRefund,
        status: 'completed'
      };

      const returnItemsList = toReturn.map(item => ({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
        productId: item.productId,
        productName: item.productName,
        variationName: item.variationName,
        qty: item.qtyToReturn,
        unitPrice: item.unitPrice,
        returnAmount: item.unitPrice * item.qtyToReturn
      }));

      // Call API
      const result = await S.processReturn(retObj, returnItemsList);
      if (result.success) {
        H.showToast(`Return ticket ${returnId} created successfully.`);
        POS.Router.navigate('/return-list');
      } else {
        H.showToast('Failed to complete return: ' + result.error, 'error');
      }
    }
  };

  window.POS = window.POS || {};
  window.POS.SalesReturn = SalesReturn;
})();
