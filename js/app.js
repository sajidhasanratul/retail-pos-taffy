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
      R.register('/label-printer',    () => POS.LabelPrinter.render());

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
      let path = window.location.pathname;
      if (path === '/' || path === '/index.html' || path === '') {
        path = '/dashboard';
      }
      const link = document.querySelector('.nav-item[href="' + path + '"]');
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
          <div style="display:flex; align-items:center; gap:8px; cursor:pointer;" class="profile-click-trigger" title="Click to view profile details">
            <div style="text-align:right;">
              <div style="font-weight:700; color:var(--text-dark); font-size:13px;">${POS.Helpers.esc(user.name)}</div>
              <div style="font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase;">${roleName}</div>
            </div>
            <div style="width:34px; height:34px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px;">
              ${user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        `;
        el.querySelector('.profile-click-trigger').onclick = () => this.showUserProfileModal();
      } else {
        el.innerHTML = '';
      }
    },

    showUserProfileModal() {
      const S = POS.Store;
      const H = POS.Helpers;
      const user = S.getCurrentUser();
      if (!user) return;

      let modalOverlay = document.getElementById('global-profile-modal-overlay');
      if (!modalOverlay) {
        modalOverlay = document.createElement('div');
        modalOverlay.id = 'global-profile-modal-overlay';
        modalOverlay.className = 'modal-overlay';
        document.body.appendChild(modalOverlay);
      }

      let roleLabel = 'Cashier';
      let roleBg = '#6b7280';
      if (user.role === 'admin') {
        roleLabel = 'System Admin';
        roleBg = '#5a5cea';
      } else if (user.role === 'manager') {
        roleLabel = 'Store Manager';
        roleBg = '#f59e0b';
      }

      modalOverlay.innerHTML = `
        <div class="modal animate" style="max-width:440px;">
          <div class="modal-header">
            <h3>👤 User Account Profile</h3>
            <button class="modal-close" id="modal-close-global-profile">&times;</button>
          </div>
          <div class="modal-body">
            <!-- Profile Info Panel -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:var(--radius-sm); padding:16px; margin-bottom:20px;">
              <div style="display:flex; align-items:center; gap:16px; margin-bottom:14px;">
                <div style="width:48px; height:48px; border-radius:50%; background:var(--primary); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px;">
                  ${user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 style="margin:0; font-size:15px; font-weight:700; color:var(--text-dark);">${H.esc(user.name)}</h4>
                  <span class="badge" style="background:${roleBg}; color:#fff; font-size:10px; font-weight:700; text-transform:uppercase; padding:2px 8px; border-radius:10px; display:inline-block; margin-top:4px;">${roleLabel}</span>
                </div>
              </div>
              
              <div style="display:grid; grid-template-columns: 110px 1fr; row-gap:10px; font-size:13px; line-height:1.4;">
                <span style="font-weight:600; color:#64748b;">Username:</span>
                <span style="font-weight:700; color:var(--text-dark);">${H.esc(user.username)}</span>
                
                <span style="font-weight:600; color:#64748b;">Email Address:</span>
                <span style="font-weight:600; color:var(--text-dark);">${user.email ? H.esc(user.email) : '<span style="color:#ef4444; font-style:italic;">No Email Added</span>'}</span>
              </div>
            </div>

            <!-- Password Update Fields -->
            <h4 style="margin-top:0; margin-bottom:12px; font-size:14px; font-weight:700; color:var(--text-dark); border-bottom: 1px solid var(--border-light); padding-bottom:6px;">🔑 Change Account Password</h4>
            
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
            <button class="btn btn-secondary" id="btn-global-profile-cancel">Close</button>
            <button class="btn btn-primary" id="btn-global-pwd-save">Update Password</button>
          </div>
        </div>
      `;

      modalOverlay.classList.add('active');

      const close = () => modalOverlay.classList.remove('active');
      modalOverlay.querySelector('#modal-close-global-profile').onclick = close;
      modalOverlay.querySelector('#btn-global-profile-cancel').onclick = close;

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
              <h2 class="page-title">⚙️ System & Printing Settings</h2>
              <p class="page-subtitle">Configure printed store receipt templates, paper invoices, and default barcode label designs.</p>
            </div>
          </div>
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; max-width:1150px; align-items:start;" class="fade-in">
            
            <!-- Left Card: Invoice & Receipt Settings -->
            <div class="card">
              <div class="card-header">
                <h3>🧾 Invoice & Receipt Configurations</h3>
              </div>
              <div class="card-body" style="display:flex; flex-direction:column; gap:16px;">
                <div class="form-group">
                  <label class="form-label">Store Logo</label>
                  <div style="display:flex; gap:12px; align-items:center; background:#f8fafc; padding:10px; border:1px solid var(--border); border-radius:var(--radius-sm);">
                    <div id="set-logo-preview" style="width:60px; height:60px; border:1px solid var(--border); border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; overflow:hidden; background:#fff;">
                      <span style="font-size:20px; color:#cbd5e1;">Logo</span>
                    </div>
                    <div style="flex:1; display:flex; flex-direction:column; gap:4px;">
                      <input type="file" id="set-logo-file" accept="image/*" style="font-size:11px;">
                      <input type="text" class="form-input" id="set-logo-url" placeholder="Or paste image URL..." style="height:28px; font-size:11px;">
                    </div>
                  </div>
                </div>
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
                  <label class="form-label">Store Website URL</label>
                  <input type="text" class="form-input" id="set-store-website" placeholder="e.g. www.myshop.com">
                </div>
                <div class="form-group">
                  <label class="form-label">Invoice / Receipt Footer Note</label>
                  <textarea class="form-input" id="set-invoice-note" rows="2" style="resize:vertical;" placeholder="e.g. Thank you for shopping with us!"></textarea>
                </div>
                <div class="form-group" style="display:flex; gap:10px;">
                  <div style="flex:1;">
                    <label class="form-label">Thermal Width (mm)</label>
                    <input type="number" class="form-input" id="set-receipt-width" placeholder="e.g. 80" min="40" max="150">
                  </div>
                  <div style="flex:1;">
                    <label class="form-label">Paper Width (px)</label>
                    <input type="number" class="form-input" id="set-invoice-width" placeholder="e.g. 800" min="300" max="1500">
                  </div>
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
              </div>
            </div>

            <!-- Right Card: Barcode Label Settings -->
            <div class="card">
              <div class="card-header">
                <h3>🏷️ Barcode Label Template Defaults</h3>
              </div>
              <div class="card-body" style="display:flex; flex-direction:column; gap:16px;">
                <div class="form-group">
                  <label class="form-label">Default Design Template</label>
                  <select class="form-select" id="set-label-template">
                    <option value="standard">Standard Retail</option>
                    <option value="clothing">Clothing / Tag Label</option>
                    <option value="barcode_only">Barcode Only Sticker</option>
                    <option value="price_tag">Price Tag Sticker</option>
                    <option value="premium">Premium Brand Tag</option>
                    <option value="shelf">Shelf / Bin Label</option>
                    <option value="sale_discount">Sale / Promo Tag</option>
                    <option value="qr_only">QR Code Sticker</option>
                    <option value="warehouse">Warehouse Label</option>
                    <option value="small_sticker">Small Sticker (Compact)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Default Dimensions Preset</label>
                  <select class="form-select" id="set-label-preset">
                    <option value="40x25">40 × 25 mm</option>
                    <option value="50x30">50 × 30 mm</option>
                    <option value="58x40">58 × 40 mm</option>
                    <option value="70x50">70 × 50 mm</option>
                    <option value="80x50">80 × 50 mm</option>
                    <option value="100x50">100 × 50 mm</option>
                    <option value="custom">Custom Size (mm)</option>
                  </select>
                </div>
                <div class="form-group" id="set-lbl-custom-dims" style="display:none; gap:10px;">
                  <div style="flex:1;">
                    <label class="form-label">Width (mm)</label>
                    <input type="number" class="form-input" id="set-label-width" value="50" min="10" max="250">
                  </div>
                  <div style="flex:1;">
                    <label class="form-label">Height (mm)</label>
                    <input type="number" class="form-input" id="set-label-height" value="30" min="10" max="250">
                  </div>
                </div>

                <div style="border-top:1px solid #edf2f7; padding-top:10px;">
                  <h4 style="margin:0 0 10px 0; font-size:12px; color:var(--text-dark);">Visibility Toggles:</h4>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px;">
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="set-chk-label-show-store" checked> Show Store Name
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="set-chk-label-show-name" checked> Show Product Name
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="set-chk-label-show-barcode" checked> Show Barcode
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="set-chk-label-show-human-readable" checked> Show Barcode Text
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="set-chk-label-show-qr"> Show QR Code
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="set-chk-label-show-sku" checked> Show SKU
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="set-chk-label-show-price" checked> Show Price
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="set-chk-label-show-attribs"> Show Size & Color
                    </label>
                  </div>
                </div>

                <button class="btn btn-primary" id="btn-save-settings" style="padding:14px; font-weight:700; margin-top:10px;" disabled>
                  💾 Save All Configurations
                </button>
              </div>
            </div>

          </div>
        `;

        const settings = await S.getSettings();
        
        let activeLogo = settings.invoice_logo || '';
        const logoPreview = document.getElementById('set-logo-preview');
        const logoUrlInput = document.getElementById('set-logo-url');
        const logoFileInput = document.getElementById('set-logo-file');
        
        const updateLogoPreview = (src) => {
          if (src) {
            logoPreview.innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:contain;">`;
          } else {
            logoPreview.innerHTML = `<span style="font-size:16px; color:#cbd5e1;">Logo</span>`;
          }
        };
        
        updateLogoPreview(activeLogo);
        if (activeLogo && !activeLogo.startsWith('data:')) {
          logoUrlInput.value = activeLogo;
        }

        logoFileInput.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            activeLogo = reader.result;
            updateLogoPreview(activeLogo);
            logoUrlInput.value = '';
          };
          reader.readAsDataURL(file);
        };

        logoUrlInput.oninput = (e) => {
          activeLogo = e.target.value.trim();
          updateLogoPreview(activeLogo);
        };

        document.getElementById('set-store-name').value = settings.store_name || '';
        document.getElementById('set-store-address').value = settings.store_address || '';
        document.getElementById('set-store-phone').value = settings.store_phone || '';
        document.getElementById('set-store-website').value = settings.store_website || '';
        document.getElementById('set-invoice-note').value = settings.invoice_note || '';
        document.getElementById('set-receipt-width').value = settings.receipt_width || '80';
        document.getElementById('set-invoice-width').value = settings.invoice_width || '800';
        document.getElementById('set-print-type').value = settings.default_print_type || 'receipt';
        document.getElementById('set-invoice-style').value = settings.invoice_style || 'theme-modern';
        document.getElementById('set-receipt-style').value = settings.receipt_style || 'style-1';
        
        // Barcode Label settings mapping
        document.getElementById('set-label-template').value = settings.label_template || 'standard';
        document.getElementById('set-label-preset').value = settings.label_preset || '50x30';
        document.getElementById('set-label-width').value = settings.label_width || '50';
        document.getElementById('set-label-height').value = settings.label_height || '30';
        document.getElementById('set-chk-label-show-store').checked = settings.label_show_store !== '0';
        document.getElementById('set-chk-label-show-name').checked = settings.label_show_name !== '0';
        document.getElementById('set-chk-label-show-barcode').checked = settings.label_show_barcode !== '0';
        document.getElementById('set-chk-label-show-human-readable').checked = settings.label_show_human_readable !== '0';
        document.getElementById('set-chk-label-show-qr').checked = settings.label_show_qr === '1';
        document.getElementById('set-chk-label-show-sku').checked = settings.label_show_sku !== '0';
        document.getElementById('set-chk-label-show-price').checked = settings.label_show_price !== '0';
        document.getElementById('set-chk-label-show-attribs').checked = settings.label_show_attribs === '1';

        // Preset dropdown toggle
        const handlePresetChange = () => {
          const val = document.getElementById('set-label-preset').value;
          const customDims = document.getElementById('set-lbl-custom-dims');
          if (val === 'custom') {
            customDims.style.display = 'flex';
          } else {
            customDims.style.display = 'none';
            const [w, h] = val.split('x');
            document.getElementById('set-label-width').value = w;
            document.getElementById('set-label-height').value = h;
          }
        };
        document.getElementById('set-label-preset').onchange = handlePresetChange;
        handlePresetChange();

        const saveBtn = document.getElementById('btn-save-settings');
        saveBtn.disabled = false;

        saveBtn.onclick = async () => {
          const store_name = document.getElementById('set-store-name').value.trim();
          const store_address = document.getElementById('set-store-address').value.trim();
          const store_phone = document.getElementById('set-store-phone').value.trim();
          const store_website = document.getElementById('set-store-website').value.trim();
          const invoice_note = document.getElementById('set-invoice-note').value.trim();
          const receipt_width = document.getElementById('set-receipt-width').value.trim();
          const invoice_width = document.getElementById('set-invoice-width').value.trim();
          const default_print_type = document.getElementById('set-print-type').value;
          const invoice_style = document.getElementById('set-invoice-style').value;
          const receipt_style = document.getElementById('set-receipt-style').value;

          const label_template = document.getElementById('set-label-template').value;
          const label_preset = document.getElementById('set-label-preset').value;
          const label_width = document.getElementById('set-label-width').value;
          const label_height = document.getElementById('set-label-height').value;
          const label_show_store = document.getElementById('set-chk-label-show-store').checked ? '1' : '0';
          const label_show_name = document.getElementById('set-chk-label-show-name').checked ? '1' : '0';
          const label_show_barcode = document.getElementById('set-chk-label-show-barcode').checked ? '1' : '0';
          const label_show_human_readable = document.getElementById('set-chk-label-show-human-readable').checked ? '1' : '0';
          const label_show_qr = document.getElementById('set-chk-label-show-qr').checked ? '1' : '0';
          const label_show_sku = document.getElementById('set-chk-label-show-sku').checked ? '1' : '0';
          const label_show_price = document.getElementById('set-chk-label-show-price').checked ? '1' : '0';
          const label_show_attribs = document.getElementById('set-chk-label-show-attribs').checked ? '1' : '0';

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
            store_website,
            invoice_note,
            invoice_logo: activeLogo,
            receipt_width,
            invoice_width,
            invoice_style, 
            default_print_type, 
            receipt_style,
            label_template,
            label_preset,
            label_width,
            label_height,
            label_show_store,
            label_show_name,
            label_show_barcode,
            label_show_human_readable,
            label_show_qr,
            label_show_sku,
            label_show_price,
            label_show_attribs
          });
          saveBtn.disabled = false;
          saveBtn.innerHTML = '💾 Save All Configurations';

          if (res.success) {
            H.showToast('All configurations saved successfully!');
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
