(function () {
  'use strict';

  const SalesList = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      const today = H.today();
      let fromDate = localStorage.getItem('sales_from') || '';
      let toDate = localStorage.getItem('sales_to') || '';
      let searchQuery = '';

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">📋 Sales List</h2>
            <p class="page-subtitle">View, search, filter and export all completed sales orders.</p>
          </div>
          <div class="page-actions">
            <a href="#/new-order" class="btn btn-primary btn-sm">+ Add New Sale</a>
            <button class="btn btn-success btn-sm" id="btn-export-csv">📥 Export CSV</button>
          </div>
        </div>

        <div class="filter-bar fade-in">
          <div class="search-box" style="flex: 2;">
            <input type="text" id="sales-search" placeholder="Search by Invoice ID, customer name or phone...">
          </div>
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 130px;">
            <label class="form-label">From Date</label>
            <input type="date" class="form-input" id="sales-from" value="${fromDate}">
          </div>
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 130px;">
            <label class="form-label">To Date</label>
            <input type="date" class="form-input" id="sales-to" value="${toDate}">
          </div>
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 130px;">
            <label class="form-label">Month</label>
            <select class="form-select" id="sales-month">
              <option value="all">All Months</option>
              <option value="0">January</option>
              <option value="1">February</option>
              <option value="2">March</option>
              <option value="3">April</option>
              <option value="4">May</option>
              <option value="5">June</option>
              <option value="6">July</option>
              <option value="7">August</option>
              <option value="8">September</option>
              <option value="9">October</option>
              <option value="10">November</option>
              <option value="11">December</option>
            </select>
          </div>
          <button class="btn btn-primary" id="btn-sales-filter" style="margin-top: 18px;">Apply</button>
        </div>

        <div class="stats-grid fade-in" style="grid-template-columns: 1fr 1fr; margin-bottom: 20px;">
          <div class="stat-card green" style="padding: 15px;">
            <div class="stat-icon">💰</div>
            <div class="stat-info">
              <div class="stat-label">Total Sales Amount</div>
              <div class="stat-value" id="stats-total-amount">৳0.00</div>
            </div>
          </div>
          <div class="stat-card blue" style="padding: 15px;">
            <div class="stat-icon">🛒</div>
            <div class="stat-info">
              <div class="stat-label">Today's Sales</div>
              <div class="stat-value" id="stats-today-amount">৳0.00</div>
            </div>
          </div>
        </div>

        <div class="card fade-in">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Customer</th>
                    <th>Sales Date</th>
                    <th class="text-right">Subtotal</th>
                    <th class="text-right">Discount</th>
                    <th class="text-right">Tax</th>
                    <th class="text-right">Grand Total</th>
                    <th class="text-right">Paid</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody id="sales-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="sales-modal-overlay"></div>
      `;

      // Set up events
      document.getElementById('btn-sales-filter').onclick = async () => {
        fromDate = document.getElementById('sales-from').value;
        toDate = document.getElementById('sales-to').value;
        localStorage.setItem('sales_from', fromDate);
        localStorage.setItem('sales_to', toDate);
        await this.updateList(fromDate, toDate, searchQuery);
      };

      document.getElementById('sales-search').oninput = H.debounce(async (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        await this.updateList(fromDate, toDate, searchQuery);
      }, 200);

      document.getElementById('btn-export-csv').onclick = async () => {
        const list = await this.getFilteredOrders(fromDate, toDate, searchQuery);
        const csvData = list.map(o => ({
          'Invoice ID': o.invoiceId,
          'Customer Name': o.customerName,
          'Customer Phone': o.customerPhone,
          'Date': H.formatDateTime(o.date),
          'Subtotal': o.subtotal,
          'Discount Type': o.discountType,
          'Discount Value': o.discountValue,
          'Discount Amount': o.discountAmount,
          'Tax Percent': o.taxPercent,
          'Tax Amount': o.taxAmount,
          'Grand Total': o.grandTotal,
          'Paid': o.paidAmount,
          'Due': o.dueAmount,
          'Returned': o.returnedAmount
        }));
        H.exportCSV(csvData, 'sales_list');
      };

      // Initial load
      await this.updateList(fromDate, toDate, searchQuery);
    },

    async getFilteredOrders(from, to, search) {
      const S = POS.Store;
      const H = POS.Helpers;
      const monthSelect = document.getElementById('sales-month').value;

      return await S.query('orders', o => {
        // Search filter
        if (search) {
          const invMatch = o.invoiceId.toLowerCase().includes(search);
          const custNameMatch = o.customerName.toLowerCase().includes(search);
          const custPhoneMatch = o.customerPhone.includes(search);
          if (!invMatch && !custNameMatch && !custPhoneMatch) return false;
        }

        // Date range filter
        if (!H.isDateInRange(o.date, from, to)) return false;

        // Month filter
        if (monthSelect !== 'all') {
          const orderMonth = new Date(o.date).getMonth();
          if (orderMonth !== parseInt(monthSelect)) return false;
        }

        return true;
      });
    },

    async updateList(from, to, search) {
      const S = POS.Store;
      const H = POS.Helpers;

      const list = await this.getFilteredOrders(from, to, search);
      const today = H.today();
      const todaySales = await S.query('orders', o => H.isDateInRange(o.date, today, today));

      const totalToday = todaySales.reduce((s, o) => s + (parseFloat(o.grandTotal) || 0), 0);
      const totalFiltered = list.reduce((s, o) => s + (parseFloat(o.grandTotal) || 0), 0);

      document.getElementById('stats-total-amount').textContent = H.formatCurrency(totalFiltered);
      document.getElementById('stats-today-amount').textContent = H.formatCurrency(totalToday);

      const tbody = document.getElementById('sales-tbody');
      tbody.innerHTML = '';

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted">No sales orders found matching criteria.</td></tr>`;
        return;
      }

      // Track group totals
      let groupSub = 0, groupDisc = 0, groupTax = 0, groupTotal = 0, groupPaid = 0;

      list.forEach(o => {
        groupSub += parseFloat(o.subtotal) || 0;
        groupDisc += parseFloat(o.discountAmount) || 0;
        groupTax += parseFloat(o.taxAmount) || 0;
        groupTotal += parseFloat(o.grandTotal) || 0;
        groupPaid += parseFloat(o.paidAmount) || 0;

        tbody.innerHTML += `
          <tr class="sales-row" data-id="${o.id}">
            <td style="font-weight:700;">${o.invoiceId}</td>
            <td>
              <div style="font-weight:600;">${H.esc(o.customerName)}</div>
              <div class="text-muted text-sm">${H.esc(o.customerPhone)}</div>
            </td>
            <td>${H.formatDateTime(o.date)}</td>
            <td class="text-right">${H.formatCurrency(o.subtotal)}</td>
            <td class="text-right text-danger">${o.discountAmount > 0 ? '-' : ''}${H.formatCurrency(o.discountAmount)}</td>
            <td class="text-right">${H.formatCurrency(o.taxAmount)}</td>
            <td class="text-right" style="font-weight:700; color:var(--primary);">${H.formatCurrency(o.grandTotal)}</td>
            <td class="text-right text-success" style="font-weight:600;">${H.formatCurrency(o.paidAmount)}</td>
            <td class="text-center">
              <div style="display:flex; justify-content:center; gap:6px;">
                <button class="btn btn-secondary btn-sm btn-view-invoice" title="View Details">👁️</button>
                <button class="btn btn-secondary btn-sm btn-print-invoice" title="Print Receipt">🖨️</button>
                <button class="btn btn-secondary btn-sm btn-return-invoice" title="Return Items" style="color:var(--warning);">🔄</button>
              </div>
            </td>
          </tr>
        `;
      });

      // Append group totals row
      tbody.innerHTML += `
        <tr class="total-row">
          <td colspan="3" style="font-weight:800;">Group Total</td>
          <td class="text-right">${H.formatCurrency(groupSub)}</td>
          <td class="text-right text-danger">-${H.formatCurrency(groupDisc)}</td>
          <td class="text-right">${H.formatCurrency(groupTax)}</td>
          <td class="text-right" style="color:var(--primary);">${H.formatCurrency(groupTotal)}</td>
          <td class="text-right text-success">${H.formatCurrency(groupPaid)}</td>
          <td></td>
        </tr>
      `;

      // Bind button events
      tbody.querySelectorAll('.sales-row').forEach(row => {
        const id = row.dataset.id;
        const order = list.find(o => o.id === id);

        row.querySelector('.btn-view-invoice').onclick = () => this.showDetailsModal(order);
        row.querySelector('.btn-print-invoice').onclick = () => this.printReceipt(order);
        row.querySelector('.btn-return-invoice').onclick = () => {
          localStorage.setItem('return_search_invoice', order.invoiceId);
          POS.Router.navigate('/sales-return');
        };
      });
    },

    async showDetailsModal(order) {
      const S = POS.Store;
      const H = POS.Helpers;
      const user = S.getCurrentUser();
      const overlay = document.getElementById('sales-modal-overlay');

      const items = await S.query('orderItems', i => i.orderId === order.id);
      const payments = await S.query('payments', p => p.orderId === order.id);

      let itemsHtml = '';
      items.forEach(i => {
        itemsHtml += `
          <tr>
            <td>
              <div style="font-weight:600;">${H.esc(i.productName)}</div>
              ${i.variationName ? `<div class="text-muted text-sm">${H.esc(i.variationName)}</div>` : ''}
            </td>
            <td class="text-center">${i.qty}</td>
            <td class="text-right">${H.formatCurrency(i.unitPrice)}</td>
            <td class="text-right" style="font-weight:600;">${H.formatCurrency(i.total)}</td>
          </tr>
        `;
      });

      let paymentsHtml = '';
      payments.forEach(p => {
        paymentsHtml += `
          <div class="flex justify-between text-sm" style="border-bottom:1px solid var(--border-light); padding:4px 0;">
            <span class="text-muted">${p.method}</span>
            <span style="font-weight:600;">${H.formatCurrency(p.amount)}</span>
          </div>
        `;
      });

      overlay.innerHTML = `
        <div class="modal" style="max-width:650px;">
          <div class="modal-header">
            <h3>Invoice Details: ${order.invoiceId}</h3>
            <button class="modal-close" id="modal-close-invoice">&times;</button>
          </div>
          <div class="modal-body">
            <div class="grid-2 mb-2">
              <div>
                <h4 style="margin-bottom:4px;">Customer Info</h4>
                <p><strong>Name:</strong> ${H.esc(order.customerName)}</p>
                <p><strong>Phone:</strong> ${H.esc(order.customerPhone)}</p>
              </div>
              <div class="text-right">
                <h4 style="margin-bottom:4px;">Order Info</h4>
                <p><strong>Date:</strong> ${H.formatDateTime(order.date)}</p>
                <p><strong>Status:</strong> <span class="badge badge-success">${order.status}</span></p>
              </div>
            </div>

            <div class="table-wrapper mb-2">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th class="text-center" style="width:60px;">Qty</th>
                    <th class="text-right" style="width:100px;">Price</th>
                    <th class="text-right" style="width:100px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <div class="grid-2">
              <div>
                <h4 style="margin-bottom:8px;">Payments Received</h4>
                ${paymentsHtml || '<p class="text-muted text-sm">No payment records found.</p>'}
              </div>
              <div class="flex flex-col gap-1 text-right">
                <div class="flex justify-between">
                  <span class="text-muted">Sub Total:</span>
                  <span style="font-weight:600;">${H.formatCurrency(order.subtotal)}</span>
                </div>
                ${order.discountAmount > 0 ? `
                  <div class="flex justify-between text-danger">
                    <span>Discount:</span>
                    <span>-${H.formatCurrency(order.discountAmount)}</span>
                  </div>
                ` : ''}
                ${order.taxAmount > 0 ? `
                  <div class="flex justify-between">
                    <span>Tax (${order.taxPercent}%):</span>
                    <span>${H.formatCurrency(order.taxAmount)}</span>
                  </div>
                ` : ''}
                <div class="flex justify-between" style="border-top:1px solid var(--border); padding-top:4px; margin-top:4px;">
                  <span style="font-weight:700;">Grand Total:</span>
                  <span style="font-weight:800; color:var(--primary);">${H.formatCurrency(order.grandTotal)}</span>
                </div>
                <div class="flex justify-between text-success">
                  <span>Paid Amount:</span>
                  <span style="font-weight:700;">${H.formatCurrency(order.paidAmount)}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            ${user && (user.role === 'admin' || user.role === 'manager') ? `<button class="btn btn-warning" id="btn-edit-inv-modal" style="margin-right:auto;">✏️ Edit Order</button>` : ''}
            <button class="btn btn-secondary" id="btn-close-inv-footer">Close</button>
            <button class="btn btn-primary" id="btn-print-inv-modal">🖨️ Print Receipt</button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = () => overlay.classList.remove('active');
      overlay.querySelector('#modal-close-invoice').onclick = close;
      overlay.querySelector('#btn-close-inv-footer').onclick = close;

      const editBtn = overlay.querySelector('#btn-edit-inv-modal');
      if (editBtn) {
        editBtn.onclick = () => {
          close();
          POS.Router.navigate('/edit-order/' + order.id);
        };
      }

      overlay.querySelector('#btn-print-inv-modal').onclick = async () => {
        const items = await S.query('orderItems', i => i.orderId === order.id);
        H.printOrder(order, items);
      };
    },

    async printReceipt(order) {
      const S = POS.Store;
      const H = POS.Helpers;
      const items = await S.query('orderItems', i => i.orderId === order.id);
      H.printOrder(order, items);
    }
  };

  window.POS = window.POS || {};
  window.POS.SalesList = SalesList;
})();
