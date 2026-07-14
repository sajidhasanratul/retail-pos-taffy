(function () {
  'use strict';

  const ReturnList = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      let fromDate = localStorage.getItem('ret_from') || '';
      let toDate = localStorage.getItem('ret_to') || '';
      let searchQuery = '';

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">📋 Return List</h2>
            <p class="page-subtitle">View and trace all processed sales return records.</p>
          </div>
          <div class="page-actions">
            <a href="#/sales-return" class="btn btn-primary btn-sm">+ Process Return</a>
          </div>
        </div>

        <div class="filter-bar fade-in">
          <div class="search-box" style="flex: 2;">
            <input type="text" id="ret-search" placeholder="Search by Return ID, Invoice ID, customer name or phone...">
          </div>
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 150px;">
            <label class="form-label">From Date</label>
            <input type="date" class="form-input" id="ret-from" value="${fromDate}">
          </div>
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 150px;">
            <label class="form-label">To Date</label>
            <input type="date" class="form-input" id="ret-to" value="${toDate}">
          </div>
          <button class="btn btn-primary" id="btn-ret-filter" style="margin-top: 18px;">Apply</button>
        </div>

        <div class="card fade-in">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Return ID</th>
                    <th>Invoice ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th class="text-right">Refund Total</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody id="ret-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="ret-modal-overlay"></div>
      `;

      // Event binds
      document.getElementById('btn-ret-filter').onclick = async () => {
        fromDate = document.getElementById('ret-from').value;
        toDate = document.getElementById('ret-to').value;
        localStorage.setItem('ret_from', fromDate);
        localStorage.setItem('ret_to', toDate);
        await this.updateList(fromDate, toDate, searchQuery);
      };

      document.getElementById('ret-search').oninput = H.debounce(async (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        await this.updateList(fromDate, toDate, searchQuery);
      }, 200);

      // Initial load
      await this.updateList(fromDate, toDate, searchQuery);
    },

    async updateList(from, to, search) {
      const S = POS.Store;
      const H = POS.Helpers;

      const returns = await S.query('returns', r => {
        if (search) {
          const retMatch = r.returnId.toLowerCase().includes(search);
          const invMatch = r.invoiceId.toLowerCase().includes(search);
          const nameMatch = r.customerName.toLowerCase().includes(search);
          const phoneMatch = r.customerPhone.includes(search);
          if (!retMatch && !invMatch && !nameMatch && !phoneMatch) return false;
        }

        if (!H.isDateInRange(r.date, from, to)) return false;

        return true;
      });

      const tbody = document.getElementById('ret-tbody');
      tbody.innerHTML = '';

      if (returns.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No returns matching filters found.</td></tr>`;
        return;
      }

      returns.forEach(r => {
        tbody.innerHTML += `
          <tr class="ret-row" data-id="${r.id}">
            <td style="font-weight:700;">${r.returnId}</td>
            <td style="font-weight:600; color:var(--primary);">${r.invoiceId}</td>
            <td>
              <div style="font-weight:600;">${H.esc(r.customerName)}</div>
              <div class="text-muted text-sm">${H.esc(r.customerPhone)}</div>
            </td>
            <td>${H.formatDateTime(r.date)}</td>
            <td class="text-right text-success" style="font-weight:700;">${H.formatCurrency(r.returnTotal)}</td>
            <td class="text-center">
              <button class="btn btn-secondary btn-sm btn-view-return">👁️ View Details</button>
            </td>
          </tr>
        `;
      });

      // Bind events
      tbody.querySelectorAll('.ret-row').forEach(row => {
        const id = row.dataset.id;
        const retObj = returns.find(r => r.id === id);

        row.querySelector('.btn-view-return').onclick = () => this.showDetailsModal(retObj);
      });
    },

    async showDetailsModal(retObj) {
      const S = POS.Store;
      const H = POS.Helpers;
      const overlay = document.getElementById('ret-modal-overlay');

      const items = await S.query('returnItems', i => i.returnId === retObj.id);

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
            <td class="text-right" style="font-weight:600;">${H.formatCurrency(i.returnAmount)}</td>
          </tr>
        `;
      });

      overlay.innerHTML = `
        <div class="modal" style="max-width:600px;">
          <div class="modal-header">
            <h3>Return Details: ${retObj.returnId}</h3>
            <button class="modal-close" id="modal-close-return">&times;</button>
          </div>
          <div class="modal-body">
            <div class="grid-2 mb-2">
              <div>
                <h4 style="margin-bottom:4px;">Invoice Association</h4>
                <p><strong>Invoice ID:</strong> ${retObj.invoiceId}</p>
                <p><strong>Customer:</strong> ${H.esc(retObj.customerName)} (${H.esc(retObj.customerPhone)})</p>
              </div>
              <div class="text-right">
                <h4 style="margin-bottom:4px;">Return Timing</h4>
                <p><strong>Returned On:</strong> ${H.formatDateTime(retObj.date)}</p>
              </div>
            </div>

            <div class="table-wrapper mb-2">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th class="text-center" style="width:60px;">Returned Qty</th>
                    <th class="text-right" style="width:100px;">Unit Price</th>
                    <th class="text-right" style="width:100px;">Subtotal Refund</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <div class="flex justify-between" style="border-top:2px solid var(--border); padding-top:10px;">
              <span style="font-size:16px; font-weight:700;">Total Refund Amount</span>
              <span style="font-size:18px; font-weight:800; color:var(--success);">${H.formatCurrency(retObj.returnTotal)}</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-close-ret-footer">Close</button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = () => overlay.classList.remove('active');
      overlay.querySelector('#modal-close-return').onclick = close;
      overlay.querySelector('#btn-close-ret-footer').onclick = close;
    }
  };

  window.POS = window.POS || {};
  window.POS.ReturnList = ReturnList;
})();
