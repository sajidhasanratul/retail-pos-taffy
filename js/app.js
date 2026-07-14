(function () {
  'use strict';

  const App = {
    init() {
      const S = POS.Store;
      S.init();

      // Register routes
      const R = POS.Router;
      R.register('/dashboard',       () => POS.Dashboard.render());
      R.register('/new-order',       () => POS.NewOrder.render());
      R.register('/edit-order/:id',  (p) => POS.EditOrder.render(p.id));
      R.register('/sales-list',      () => POS.SalesList.render());
      R.register('/sales-return',    () => POS.SalesReturn.render());
      R.register('/return-list',     () => POS.ReturnList.render());
      R.register('/reports/:type',   (p) => POS.Reports.render(p.type));
      R.register('/products',        () => POS.Products.render());
      R.register('/customers',       () => POS.Customers.render());
      R.register('/expenses',        () => POS.Expenses.render());
      R.register('/coupons',         () => {
        const u = S.getCurrentUser();
        if (u && u.role === 'admin') {
          POS.Coupons.render();
        } else {
          POS.Helpers.showToast('Access denied: Admin only', 'error');
          R.navigate('/dashboard');
        }
      });
      R.register('/users',           () => POS.Users.render());

      R.init();
      this._setupSidebar();
      this._updateHeaderDate();
      this._setupSettings();
      this._updateUserHeader();
    },

    /* ── Sidebar behaviour ─────────────────────────── */
    _setupSidebar() {
      const S = POS.Store;
      const toggle  = document.getElementById('menu-toggle');
      const sidebar = document.getElementById('sidebar');
      const wrapper = document.getElementById('main-wrapper');
      const overlay = document.getElementById('sidebar-overlay');

      const toggleMenu = () => {
        if (window.innerWidth <= 1024) {
          sidebar.classList.toggle('mobile-open');
          overlay.classList.toggle('active');
        } else {
          sidebar.classList.toggle('collapsed');
          wrapper.classList.toggle('expanded');
        }
      };

      toggle && toggle.addEventListener('click', toggleMenu);
      overlay && overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
      });

      // Close mobile drawer on navigation click
      document.querySelectorAll('#sidebar-nav a').forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth <= 1024) {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
          }
        });
      });

      document.querySelectorAll('.nav-group-header').forEach(header => {
        header.addEventListener('click', () => {
          const items = header.nextElementSibling;
          const isOpen = header.classList.contains('open');

          // Close others
          document.querySelectorAll('.nav-group-header.open').forEach(h => {
            if (h !== header) {
              h.classList.remove('open');
              h.nextElementSibling && h.nextElementSibling.classList.remove('open');
            }
          });

          header.classList.toggle('open', !isOpen);
          items && items.classList.toggle('open', !isOpen);
        });
      });

      // Filter sidebar links depending on user role
      const user = S.getCurrentUser();
      if (user) {
        const role = user.role;

        // Hide specific elements
        if (role === 'cashier') {
          // Hide Dashboard, Catalog, Customers, Reports, Users, Coupons
          document.getElementById('nav-grp-dashboard').style.display = 'none';
          document.getElementById('nav-grp-catalog').style.display = 'none';
          document.getElementById('nav-grp-reports').style.display = 'none';
          document.getElementById('nav-grp-users').style.display = 'none';
          document.getElementById('nav-grp-coupons').style.display = 'none';
          document.getElementById('nav-grp-settings').style.display = 'none';
        } else if (role === 'manager') {
          // Hide Reports, Users, Coupons
          document.getElementById('nav-grp-reports').style.display = 'none';
          document.getElementById('nav-grp-users').style.display = 'none';
          document.getElementById('nav-grp-coupons').style.display = 'none';
          document.getElementById('nav-grp-settings').style.display = '';
        } else {
          // Admin sees everything
          document.getElementById('nav-grp-dashboard').style.display = '';
          document.getElementById('nav-grp-catalog').style.display = '';
          document.getElementById('nav-grp-reports').style.display = '';
          document.getElementById('nav-grp-users').style.display = '';
          document.getElementById('nav-grp-coupons').style.display = '';
          document.getElementById('nav-grp-settings').style.display = '';
        }
      }

      // Logout handler
      const btnLogout = document.getElementById('nav-logout');
      if (btnLogout) {
        btnLogout.onclick = (e) => {
          e.preventDefault();
          S.logout();
        };
      }

      // Auto-open current group
      const hash = window.location.hash.slice(1) || '/dashboard';
      const link = document.querySelector('.nav-item[href="#' + hash + '"]');
      if (link) {
        const group = link.closest('.nav-group-items');
        if (group) {
          group.classList.add('open');
          group.previousElementSibling && group.previousElementSibling.classList.add('open');
        }
      }
    },

    /* ── Header date ───────────────────────────────── */
    _updateHeaderDate() {
      const el = document.getElementById('header-date');
      if (el) {
        el.textContent = new Date().toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
      }
    },

    _updateUserHeader() {
      const S = POS.Store;
      const el = document.getElementById('user-profile-badge');
      if (!el) return;

      const user = S.getCurrentUser();
      if (user) {
        let roleName = user.role.toUpperCase();
        el.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px; cursor:pointer;" class="profile-click-trigger" title="Click to update password">
            <div style="text-align:right;">
              <div style="font-weight:700; color:var(--text-dark); font-size:13px;">${POS.Helpers.esc(user.name)}</div>
              <div style="font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase;">${roleName}</div>
            </div>
            <div style="width:34px; height:34px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px;">
              ${user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        `;
        el.querySelector('.profile-click-trigger').onclick = () => this.showChangePasswordModal();
      } else {
        el.innerHTML = '';
      }
    },

    showChangePasswordModal() {
      const S = POS.Store;
      const H = POS.Helpers;

      let modalOverlay = document.getElementById('global-password-modal-overlay');
      if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'global-password-modal-overlay';
        modalOverlay.className = 'modal-overlay';
        document.body.appendChild(modalOverlay);
      }

      modalOverlay.innerHTML = `
        <div class="modal animate" style="max-width:400px;">
          <div class="modal-header">
            <h3>🔑 Update Password</h3>
            <button class="modal-close" id="modal-close-global-pwd">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-2">
              <label class="form-label">Current Password</label>
              <input type="password" class="form-input" id="pwd-old" placeholder="Enter current password" required>
            </div>
            <div class="form-group mb-2">
              <label class="form-label">New Password</label>
              <input type="password" class="form-input" id="pwd-new" placeholder="Enter new password" required>
            </div>
            <div class="form-group">
              <label class="form-label">Confirm New Password</label>
              <input type="password" class="form-input" id="pwd-confirm" placeholder="Confirm new password" required>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-global-pwd-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-global-pwd-save">Save Password</button>
          </div>
        </div>
      `;

      modalOverlay.classList.add('active');

      const close = () => modalOverlay.classList.remove('active');
      modalOverlay.querySelector('#modal-close-global-pwd').onclick = close;
      modalOverlay.querySelector('#btn-global-pwd-cancel').onclick = close;

      modalOverlay.querySelector('#btn-global-pwd-save').onclick = async () => {
        const oldP = document.getElementById('pwd-old').value;
        const newP = document.getElementById('pwd-new').value;
        const confP = document.getElementById('pwd-confirm').value;

        if (!oldP || !newP || !confP) {
          H.showToast('Please fill out all fields.', 'error');
          return;
        }
        if (newP !== confP) {
          H.showToast('New passwords do not match!', 'error');
          return;
        }

        const res = await S.changePassword(oldP, newP);
        if (res.success) {
          H.showToast('Password updated successfully!');
          close();
        } else {
          H.showToast(res.error || 'Password update failed', 'error');
        }
      };
    },



    _setupSettings() {
      const btn = document.getElementById('nav-settings');
      if (!btn) return;
      btn.addEventListener('click', async () => {
        const mc = document.getElementById('main-content');
        const S = POS.Store;
        const H = POS.Helpers;

        mc.innerHTML = `
          <div class="page-header">
            <div>
              <h2 class="page-title">⚙️ Invoice Settings</h2>
              <p class="page-subtitle">Configure printed store receipt details for your invoices.</p>
            </div>
          </div>
          <div class="card" style="max-width:600px">
            <div class="card-body" style="display:flex; flex-direction:column; gap:16px;">
              <div class="form-group">
                <label class="form-label">Store / Company Name</label>
                <input type="text" class="form-input" id="set-store-name" value="Fetching...">
              </div>
              <div class="form-group">
                <label class="form-label">Store Address</label>
                <input type="text" class="form-input" id="set-store-address" value="Fetching...">
              </div>
              <div class="form-group">
                <label class="form-label">Contact / Phone Number</label>
                <input type="text" class="form-input" id="set-store-phone" value="Fetching...">
              </div>
              <div class="form-group">
                <label class="form-label">Default Print Format</label>
                <select class="form-select" id="set-print-type">
                  <option value="receipt">Thermal Receipt (80mm)</option>
                  <option value="invoice">Paper Invoice (A4/A5)</option>
                </select>
              </div>
              <div class="form-group" id="group-invoice-style">
                <label class="form-label">Paper Invoice Theme</label>
                <select class="form-select" id="set-invoice-style">
                  <option value="theme-modern">Modern Minimalist</option>
                  <option value="theme-classic">Classic Business</option>
                  <option value="theme-compact">Compact Invoice</option>
                </select>
              </div>
              <div class="form-group" id="group-receipt-style">
                <label class="form-label">Thermal Receipt Theme</label>
                <select class="form-select" id="set-receipt-style">
                  <option value="style-1">Style 1: Standard Minimalist</option>
                  <option value="style-2">Style 2: Classic Bordered</option>
                  <option value="style-3">Style 3: Modern Elegant (Centered)</option>
                </select>
              </div>
              <button class="btn btn-primary" id="btn-save-settings" style="padding:14px; font-weight:700;" disabled>
                💾 Save Settings
              </button>
            </div>
          </div>
        `;

        const settings = await S.getSettings();
        document.getElementById('set-store-name').value = settings.store_name || '';
        document.getElementById('set-store-address').value = settings.store_address || '';
        document.getElementById('set-store-phone').value = settings.store_phone || '';
        document.getElementById('set-print-type').value = settings.default_print_type || 'receipt';
        document.getElementById('set-invoice-style').value = settings.invoice_style || 'theme-modern';
        document.getElementById('set-receipt-style').value = settings.receipt_style || 'style-1';
        
        const saveBtn = document.getElementById('btn-save-settings');
        saveBtn.disabled = false;

        saveBtn.onclick = async () => {
          const store_name = document.getElementById('set-store-name').value.trim();
          const store_address = document.getElementById('set-store-address').value.trim();
          const store_phone = document.getElementById('set-store-phone').value.trim();
          const default_print_type = document.getElementById('set-print-type').value;
          const invoice_style = document.getElementById('set-invoice-style').value;
          const receipt_style = document.getElementById('set-receipt-style').value;

          if (!store_name || !store_address || !store_phone) {
            H.showToast('Please fill out all settings fields.', 'error');
            return;
          }

          saveBtn.disabled = true;
          saveBtn.innerText = 'Saving...';

          const res = await S.updateSettings({ 
            store_name, 
            store_address, 
            store_phone, 
            invoice_style, 
            default_print_type, 
            receipt_style 
          });
          saveBtn.disabled = false;
          saveBtn.innerHTML = '💾 Save Settings';

          if (res.success) {
            H.showToast('Invoice settings saved successfully!');
          } else {
            H.showToast('Could not save settings: ' + res.error, 'error');
          }
        };
      });
    }
  };

  window.POS = window.POS || {};
  window.POS.App = App;

  document.addEventListener('DOMContentLoaded', () => App.init());
})();
