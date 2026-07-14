(function () {
  'use strict';

  const Customers = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      let searchQuery = '';

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">👥 Customer Directory</h2>
            <p class="page-subtitle">Manage customer records, customize VIP/Elite labels, set personalized discounts, and view order logs.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary btn-sm" id="btn-add-customer">+ Add Customer</button>
          </div>
        </div>

        <div class="filter-bar fade-in">
          <div class="search-box" style="flex:1;">
            <input type="text" id="cust-search" placeholder="Search by name, phone or labels (e.g. VIP, Elite)...">
          </div>
        </div>

        <div class="customer-grid fade-in" id="customers-container" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:20px;"></div>

        <div class="modal-overlay" id="cust-modal-overlay"></div>
      `;

      // Event handlers
      document.getElementById('btn-add-customer').onclick = () => this.showAddEditModal(null);

      document.getElementById('cust-search').oninput = H.debounce(async (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        await this.updateList(searchQuery);
      }, 200);

      // Initial load
      await this.updateList(searchQuery);
    },

    async updateList(search) {
      const S = POS.Store;
      const H = POS.Helpers;

      const customers = await S.query('customers', c => {
        if (search) {
          const nameMatch = c.name.toLowerCase().includes(search);
          const phoneMatch = c.phone.includes(search);
          const labelMatch = c.label ? c.label.toLowerCase().includes(search) : false;
          if (!nameMatch && !phoneMatch && !labelMatch) return false;
        }
        return true;
      });

      const container = document.getElementById('customers-container');
      container.innerHTML = '';

      if (customers.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1;" class="card">
            <div class="card-body text-center text-muted">
              ⚠️ No customer records found matching query.
            </div>
          </div>
        `;
        return;
      }

      const orders = await S.getAll('orders');

      customers.forEach(c => {
        // Calculate totals for customer
        // We match by customerId or phone number to catch guest checkouts where guest updated details
        const custOrders = orders.filter(o => o.customerId === c.id || (c.phone && o.customerPhone === c.phone));
        const totalSpent = custOrders.reduce((s, o) => s + o.grandTotal, 0);

        const avatarChar = c.name ? c.name.charAt(0).toUpperCase() : '?';
        const labelStyle = c.label ? `background:${H.labelColors[c.label] || '#64748b'};` : 'background:#64748b;';

        container.innerHTML += `
          <div class="customer-card fade-in" data-id="${c.id}">
            <div class="customer-top">
              <div class="customer-avatar" style="${labelStyle}">${avatarChar}</div>
              <div>
                <div class="customer-name">${H.esc(c.name)}</div>
                <div class="customer-phone">📞 ${H.esc(c.phone)}</div>
              </div>
              <div style="margin-left:auto; display:flex; flex-direction:column; gap:4px; align-items:flex-end;">
                ${c.label ? `<span class="badge-label" style="${labelStyle}">${c.label}</span>` : ''}
                ${c.customDiscount > 0 ? `<span class="badge badge-success">${c.customDiscount}% Disc</span>` : ''}
              </div>
            </div>
            <div class="customer-meta" style="margin-top: 10px; padding-top: 10px; border-top:1px solid var(--border-light)">
              <span>🛍️ <strong>${custOrders.length}</strong> Orders</span>
              <span>💰 Spent <strong>${H.formatCurrency(totalSpent)}</strong></span>
            </div>
            <div class="customer-actions" style="margin-top: 8px;">
              <button class="btn btn-secondary btn-sm btn-view-purchases" style="flex:1;">🛒 View Orders</button>
              <button class="btn btn-secondary btn-sm btn-edit-customer" style="padding: 6px 10px;">✏️ Edit</button>
              <button class="btn btn-secondary btn-sm btn-delete-customer" style="padding: 6px 10px; color:var(--danger)">🗑️</button>
            </div>
          </div>
        `;
      });

      // Bind actions
      container.querySelectorAll('.customer-card').forEach(card => {
        const id = card.dataset.id;
        const c = customers.find(cust => cust.id === id);

        card.querySelector('.btn-view-purchases').onclick = () => this.showPurchaseHistoryModal(c);
        card.querySelector('.btn-edit-customer').onclick = () => this.showAddEditModal(c);
        card.querySelector('.btn-delete-customer').onclick = async () => {
          if (await H.confirm(`Are you sure you want to delete customer ${c.name}?`)) {
            await S.delete('customers', c.id);
            H.showToast('Customer record deleted.');
            await this.updateList(search);
          }
        };
      });
    },

    async showAddEditModal(customer) {
      const S = POS.Store;
      const H = POS.Helpers;
      const overlay = document.getElementById('cust-modal-overlay');

      const isEdit = !!customer;
      const title = isEdit ? 'Edit Customer Profile' : 'Add New Customer';

      overlay.innerHTML = `
        <div class="modal" style="max-width:500px;">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" id="modal-close-cust">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" class="form-input" id="c-name" value="${customer ? H.esc(customer.name) : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="text" class="form-input" id="c-phone" value="${customer ? H.esc(customer.phone) : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" id="c-email" value="${customer ? H.esc(customer.email) : ''}">
            </div>
            <div class="form-group">
              <label class="form-label">Label Group</label>
              <select class="form-select" id="c-label">
                ${H.customerLabels.map(l => `<option value="${l}" ${customer && customer.label === l ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Custom Discount Percentage (%)</label>
              <input type="number" class="form-input" id="c-discount" min="0" max="100" value="${customer ? customer.customDiscount : '0'}">
            </div>
            <div class="form-group">
              <label class="form-label">Address</label>
              <textarea class="form-textarea" id="c-address">${customer ? H.esc(customer.address) : ''}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-cust-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-cust-save">Save changes</button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = () => overlay.classList.remove('active');
      overlay.querySelector('#modal-close-cust').onclick = close;
      overlay.querySelector('#btn-cust-cancel').onclick = close;

      overlay.querySelector('#btn-cust-save').onclick = async () => {
        const name = overlay.querySelector('#c-name').value.trim();
        const phone = overlay.querySelector('#c-phone').value.trim();
        const email = overlay.querySelector('#c-email').value.trim();
        const label = overlay.querySelector('#c-label').value;
        const discount = parseFloat(overlay.querySelector('#c-discount').value) || 0;
        const address = overlay.querySelector('#c-address').value.trim();

        if (!name || !phone) {
          H.showToast('Name and phone are required fields', 'error');
          return;
        }

        const data = { name, phone, email, label, customDiscount: discount, address };

        if (isEdit) {
          await S.update('customers', customer.id, data);
          H.showToast('Customer profile updated.');
        } else {
          await S.add('customers', data);
          H.showToast('Customer created successfully.');
        }

        close();
        await this.render(); // refresh entire screen
      };
    },

    async showPurchaseHistoryModal(customer) {
      const S = POS.Store;
      const H = POS.Helpers;
      const overlay = document.getElementById('cust-modal-overlay');

      const orders = await S.getAll('orders');
      // Match orders by customer ID or Phone number
      const custOrders = orders.filter(o => o.customerId === customer.id || (customer.phone && o.customerPhone === customer.phone));

      let ordersHtml = '';
      if (custOrders.length === 0) {
        ordersHtml = `<tr><td colspan="5" class="text-center text-muted">No sales orders found for this customer.</td></tr>`;
      } else {
        custOrders.forEach(o => {
          ordersHtml += `
            <tr class="cust-order-row" data-inv="${o.invoiceId}">
              <td style="font-weight:700; color:var(--primary); cursor:pointer;">${o.invoiceId}</td>
              <td>${H.formatDateTime(o.date)}</td>
              <td class="text-right" style="font-weight:600;">${H.formatCurrency(o.grandTotal)}</td>
              <td class="text-right text-success">${H.formatCurrency(o.paidAmount)}</td>
              <td class="text-right text-danger">${H.formatCurrency(o.dueAmount)}</td>
            </tr>
          `;
        });
      }

      overlay.innerHTML = `
        <div class="modal" style="max-width:650px;">
          <div class="modal-header">
            <h3>Purchase History: ${H.esc(customer.name)}</h3>
            <button class="modal-close" id="modal-close-purchases">&times;</button>
          </div>
          <div class="modal-body">
            <div style="background:var(--bg); border:1px solid var(--border); padding:12px; border-radius:var(--radius-sm); margin-bottom:16px;">
              <p><strong>Phone:</strong> ${H.esc(customer.phone)}</p>
              <p><strong>Email:</strong> ${customer.email ? H.esc(customer.email) : 'N/A'}</p>
              <p><strong>Group Label:</strong> ${customer.label || 'Regular'}</p>
              <p><strong>Direct discount amount setup:</strong> ${customer.customDiscount}%</p>
            </div>

            <h4 style="margin-bottom:8px;">Order Details</h4>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Date</th>
                    <th class="text-right">Total</th>
                    <th class="text-right">Paid</th>
                    <th class="text-right">Due</th>
                  </tr>
                </thead>
                <tbody id="cust-purchases-tbody">
                  ${ordersHtml}
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-close-purchases-footer">Close</button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = () => overlay.classList.remove('active');
      overlay.querySelector('#modal-close-purchases').onclick = close;
      overlay.querySelector('#btn-close-purchases-footer').onclick = close;

      // Allow clicking Invoice ID in purchase list to jump straight to receipt view
      overlay.querySelectorAll('.cust-order-row').forEach(row => {
        const invId = row.dataset.inv;
        row.querySelector('td:first-child').onclick = async () => {
          close();
          const matchOrders = await S.query('orders', o => o.invoiceId === invId);
          if (matchOrders.length > 0) {
            POS.SalesList.showDetailsModal(matchOrders[0]);
          }
        };
      });
    }
  };

  window.POS = window.POS || {};
  window.POS.Customers = Customers;
})();
