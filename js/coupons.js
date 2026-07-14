(function () {
  'use strict';

  const Coupons = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">🏷️ Coupon Management</h2>
            <p class="page-subtitle">Configure custom discount coupon codes for checkout transactions.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary btn-sm" id="btn-add-coupon">+ Add New Coupon</button>
          </div>
        </div>

        <div class="card mt-2 fade-in">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Coupon Code</th>
                    <th>Discount Type</th>
                    <th>Discount Value</th>
                    <th style="width: 100px; text-align: center;">Actions</th>
                  </tr>
                </thead>
                <tbody id="coupons-tbody">
                  <tr>
                    <td colspan="4" class="text-center text-muted">Loading coupons...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-add-coupon').onclick = () => this.showAddModal();
      await this.updateList();
    },

    async updateList() {
      const S = POS.Store;
      const H = POS.Helpers;
      const tbody = document.getElementById('coupons-tbody');
      const list = await S.getAll('coupons');

      tbody.innerHTML = '';
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No coupons configured. Click "+ Add New Coupon" to create one.</td></tr>`;
        return;
      }

      list.forEach(c => {
        const valText = c.discountType === 'percentage' 
          ? `${parseFloat(c.discountValue)}%` 
          : H.formatCurrency(c.discountValue);

        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="font-weight: 700; color: var(--primary-dark); letter-spacing: 1px;">${H.esc(c.code)}</td>
          <td><span class="badge ${c.discountType === 'percentage' ? 'badge-info' : 'badge-success'}">${c.discountType === 'percentage' ? 'Percentage' : 'Fixed Amount'}</span></td>
          <td style="font-weight: 600;">${valText}</td>
          <td class="text-center">
            <button class="btn btn-danger btn-xs btn-delete-coupon" data-code="${H.esc(c.code)}">🗑️ Delete</button>
          </td>
        `;

        tbody.appendChild(row);

        row.querySelector('.btn-delete-coupon').onclick = async () => {
          if (await H.confirm(`Are you sure you want to delete coupon "${c.code}"?`)) {
            const ok = await S.delete('coupons', c.code);
            if (ok) {
              H.showToast('Coupon deleted successfully');
              await this.updateList();
            } else {
              H.showToast('Could not delete coupon', 'error');
            }
          }
        };
      });
    },

    showAddModal() {
      const S = POS.Store;
      const H = POS.Helpers;
      const modalOverlay = document.getElementById('global-modal-overlay');
      if (!modalOverlay) return;

      modalOverlay.innerHTML = `
        <div class="modal animate" style="max-width: 400px;">
          <div class="modal-header">
            <h3>🏷️ Create Coupon</h3>
            <button class="modal-close" id="modal-close-coupon">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-2">
              <label class="form-label">Coupon Code (Uppercase)</label>
              <input type="text" class="form-input" id="coup-code" placeholder="e.g. EXTRA20" required style="text-transform: uppercase;">
            </div>
            <div class="form-group mb-2">
              <label class="form-label">Discount Type</label>
              <select class="form-select" id="coup-type">
                <option value="percentage">Percentage (%)</option>
                <option value="amount">Fixed Amount (৳)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Discount Value</label>
              <input type="number" class="form-input" id="coup-val" placeholder="Value" min="0" required>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-coupon-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-coupon-save">Create Coupon</button>
          </div>
        </div>
      `;

      modalOverlay.classList.add('active');

      const close = () => modalOverlay.classList.remove('active');
      modalOverlay.querySelector('#modal-close-coupon').onclick = close;
      modalOverlay.querySelector('#btn-coupon-cancel').onclick = close;

      modalOverlay.querySelector('#btn-coupon-save').onclick = async () => {
        const code = document.getElementById('coup-code').value.trim().toUpperCase();
        const discountType = document.getElementById('coup-type').value;
        const discountValue = parseFloat(document.getElementById('coup-val').value) || 0;

        if (!code || discountValue <= 0) {
          H.showToast('Please fill out all fields with valid values.', 'error');
          return;
        }

        const res = await S.add('coupons', { code, discountType, discountValue });
        if (res) {
          H.showToast('Coupon created successfully!');
          close();
          await this.updateList();
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.Coupons = Coupons;
})();
