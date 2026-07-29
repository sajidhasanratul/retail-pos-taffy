(function () {
  'use strict';

  const EditOrder = {
    editOrderId: null,
    activeOrder: null,
    cart: [],
    selectedCustomer: null,
    payments: [],

    async render(orderId) {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      this.editOrderId = orderId;
      this.cart = [];
      this.selectedCustomer = null;
      this.payments = [];

      this.activeOrder = await S.getById('orders', orderId);
      if (!this.activeOrder) {
        H.showToast('Order not found', 'error');
        POS.Router.navigate('/sales-list');
        return;
      }

      const items = await S.query('orderItems', i => i.orderId === orderId);
      const pmts = await S.query('payments', p => p.orderId === orderId);
      const prods = await S.getAll('products');

      this.cart = items.map(i => {
        const p = prods.find(prod => prod.id === i.productId);
        let stock = p ? p.stock : i.qty;
        if (p && i.variationName && p.variations) {
          const v = p.variations.find(varObj => varObj.name === i.variationName);
          if (v) stock = v.stock;
        }
        return {
          productId: i.productId,
          productName: i.productName,
          variationName: i.variationName,
          unitPrice: parseFloat(i.unitPrice) || 0,
          qty: parseInt(i.qty) || 1,
          image: p ? p.image : '',
          stock: stock + i.qty // make original quantity editable by adding back to stock pool
        };
      });

      this.payments = pmts.map(p => ({
        method: p.method,
        amount: parseFloat(p.amount) || 0
      }));

      if (this.payments.length === 0) {
        this.payments = [{ method: 'Cash', amount: 0 }];
      }

      if (this.activeOrder.customerId && this.activeOrder.customerId !== 'walk-in') {
        const cust = await S.getById('customers', this.activeOrder.customerId);
        if (cust) this.selectedCustomer = cust;
      }

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">✏️ Edit Sales Invoice</h2>
            <p class="page-subtitle">Modify the products, pricing, or payment splits for Invoice ${this.activeOrder.invoiceId}.</p>
          </div>
          <div class="page-actions">
            <a href="/sales-list" class="btn btn-secondary btn-sm">Back to Sales List</a>
          </div>
        </div>

        <div class="order-layout fade-in">
          <!-- Left Panel: Form & Cart -->
          <div class="flex flex-col gap-2">
            <!-- Customer & Date -->
            <div class="card">
              <div class="card-body form-row">
                <div class="form-group" style="position:relative;">
                  <label class="form-label">Customer Phone / Name</label>
                  <input type="text" class="form-input" id="search-customer" placeholder="Search phone or name...">
                  <div class="product-results" id="customer-results"></div>
                  <div id="customer-details" class="mt-1" style="display:none;"></div>
                </div>
                <div class="form-group">
                  <label class="form-label">Sales Date</label>
                  <input type="date" class="form-input" id="sales-date" value="${new Date(this.activeOrder.date).toISOString().slice(0, 10)}">
                </div>
              </div>
            </div>

            <!-- Product Search / Scan -->
            <div class="card">
              <div class="card-body">
                <div class="product-search-wrap">
                  <div style="display: flex; gap: 8px;">
                    <div class="search-box" style="flex: 1;">
                      <input type="text" id="search-product" placeholder="Type product name, SKU or scan barcode...">
                    </div>
                    <button class="btn btn-secondary" id="btn-scan" title="Simulate Barcode Scan">📷 Scan</button>
                  </div>
                  <div class="product-results" id="product-results"></div>
                </div>

                <div class="table-wrapper mt-2">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>Product / Variation</th>
                        <th>Price</th>
                        <th style="width:120px;">Qty</th>
                        <th>Total</th>
                        <th style="width:50px;"></th>
                      </tr>
                    </thead>
                    <tbody id="cart-tbody">
                      <tr>
                        <td colspan="5" class="text-center text-muted">Cart is empty. Add products to start.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Discount & Tax -->
            <div class="card">
              <div class="card-header">💸 Discount & Tax Settings</div>
              <div class="card-body form-row" style="grid-template-columns: repeat(4, 1fr);">
                <div class="form-group">
                  <label class="form-label">Discount Type</label>
                  <select class="form-select" id="discount-type">
                    <option value="none" ${this.activeOrder.discountType === 'none' ? 'selected' : ''}>None</option>
                    <option value="percentage" ${this.activeOrder.discountType === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
                    <option value="amount" ${this.activeOrder.discountType === 'amount' ? 'selected' : ''}>Fixed Amount (৳)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Discount Value</label>
                  <input type="number" class="form-input" id="discount-value" value="${this.activeOrder.discountValue}" min="0" ${this.activeOrder.discountType !== 'none' ? '' : 'disabled'}>
                </div>
                <div class="form-group">
                  <label class="form-label">Promo Coupon</label>
                  <div style="display:flex; gap:4px;">
                    <input type="text" class="form-input" id="coupon-code" placeholder="e.g. SAVE10" style="text-transform:uppercase;">
                    <button class="btn btn-secondary" id="btn-apply-coupon" style="padding:0 12px; font-size:12px; font-weight:700;">Apply</button>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Tax (%)</label>
                  <input type="number" class="form-input" id="tax-percent" value="${this.activeOrder.taxPercent}" min="0">
                </div>
              </div>
            </div>

            <!-- Multi Payment Options -->
            <div class="card">
              <div class="card-header flex justify-between items-center">
                <span>💳 Payment Information</span>
                <button class="btn btn-secondary btn-sm" id="btn-add-payment">+ Add Split Payment</button>
              </div>
              <div class="card-body">
                <div id="payment-rows-container"></div>
              </div>
            </div>
          </div>

          <!-- Right Panel: Order Summary & Place Order -->
          <div class="order-summary flex flex-col gap-2">
            <div class="summary-header">📋 Order Summary</div>
            <div class="summary-body">
              <div class="summary-row">
                <span>Sub Total:</span>
                <span class="summary-val" id="summary-subtotal">৳0.00</span>
              </div>
              <div class="summary-row">
                <span>Discount:</span>
                <span class="summary-val text-danger" id="summary-discount">-৳0.00</span>
              </div>
              <div class="summary-row">
                <span>Tax:</span>
                <span class="summary-val" id="summary-tax">৳0.00</span>
              </div>
              <div class="summary-row total">
                <span>Grand Total:</span>
                <span class="summary-val" id="summary-total">৳0.00</span>
              </div>

              <button class="btn btn-success btn-lg btn-block mt-3" id="btn-place-order" style="padding:16px;">
                💾 SAVE CHANGES
              </button>
            </div>
          </div>
        </div>
      `;

      this.initEvents();
      if (this.selectedCustomer) {
        this.selectCustomer(this.selectedCustomer);
      }
      this.renderCart();
      this.renderPayments();
      this.recalculate();
    },

    initEvents() {
      const S = POS.Store;
      const H = POS.Helpers;

      // Auto-close search result dropdowns
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#search-customer')) document.getElementById('customer-results').classList.remove('open');
        if (!e.target.closest('#search-product')) document.getElementById('product-results').classList.remove('open');
      });

      // Customer Search
      const searchCust = document.getElementById('search-customer');
      const custResults = document.getElementById('customer-results');

      searchCust.oninput = H.debounce(async (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 2) {
          custResults.innerHTML = '';
          custResults.classList.remove('open');
          return;
        }

        const list = await S.query('customers', c =>
          c.name.toLowerCase().includes(query) || c.phone.includes(query)
        );

        custResults.innerHTML = '';
        if (list.length === 0) {
          custResults.innerHTML = `<div class="p-2 text-muted text-sm text-center">No customers found. <button class="btn btn-primary btn-sm mt-1" id="btn-quick-add-cust">+ Add Quick</button></div>`;
          const quickBtn = custResults.querySelector('#btn-quick-add-cust');
          if (quickBtn) {
            quickBtn.onclick = () => this.quickAddCustomer(query);
          }
          custResults.classList.add('open');
          return;
        }

        list.forEach(c => {
          const item = document.createElement('div');
          item.className = 'product-result-item';
          item.innerHTML = `
            <div style="font-weight:600;">${H.esc(c.name)}</div>
            <div style="font-size:11px; color:#64748b;">Phone: ${H.esc(c.phone)}</div>
          `;
          item.onclick = () => {
            this.selectCustomer(c);
            searchCust.value = '';
            custResults.innerHTML = '';
            custResults.classList.remove('open');
          };
          custResults.appendChild(item);
        });
        custResults.classList.add('open');
      }, 200);

      // Product Search / Scanner Simulator
      const searchProd = document.getElementById('search-product');
      const prodResults = document.getElementById('product-results');

      searchProd.oninput = H.debounce(async (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (query.length < 2) {
          prodResults.innerHTML = '';
          prodResults.classList.remove('open');
          return;
        }

        const prods = await S.getAll('products');
        const matches = [];

        prods.forEach(p => {
          if (p.deletedAt && p.deletedAt !== '0000-00-00 00:00:00') return;

          const mainMatch = p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query) || (p.barcode && p.barcode.includes(query)) || (p.tag && p.tag.toLowerCase().includes(query));
          if (mainMatch) {
            if (p.variations && p.variations.length > 0) {
              p.variations.forEach(v => {
                matches.push({ product: p, variant: v, name: `${p.name} - ${v.name}`, sku: v.sku, barcode: v.barcode, price: v.price, stock: v.stock });
              });
            } else {
              matches.push({ product: p, variant: null, name: p.name, sku: p.sku, barcode: p.barcode, price: p.sellingPrice, stock: p.stock });
            }
          } else if (p.variations && p.variations.length > 0) {
            p.variations.forEach(v => {
              if (v.name.toLowerCase().includes(query) || v.sku.toLowerCase().includes(query) || (v.barcode && v.barcode.includes(query))) {
                matches.push({ product: p, variant: v, name: `${p.name} - ${v.name}`, sku: v.sku, barcode: v.barcode, price: v.price, stock: v.stock });
              }
            });
          }
        });

        prodResults.innerHTML = '';
        if (matches.length === 0) {
          prodResults.innerHTML = `<div class="p-2 text-muted text-sm text-center">No products matched.</div>`;
          prodResults.classList.add('open');
          return;
        }

        matches.slice(0, 10).forEach(m => {
          const item = document.createElement('div');
          item.className = 'product-result-item';
          item.innerHTML = `
            <div style="font-weight:600;">${H.esc(m.name)}</div>
            <div style="font-size:11px; color:#64748b;">SKU: ${H.esc(m.sku)} | Stock: ${m.stock}</div>
            <div style="font-weight:700; color:var(--primary); font-size:12px;">${H.formatCurrency(m.price)}</div>
          `;
          item.onclick = () => {
            this.addToCart(m);
            searchProd.value = '';
            prodResults.innerHTML = '';
            prodResults.classList.remove('open');
          };
          prodResults.appendChild(item);
        });
        prodResults.classList.add('open');
      }, 200);

      // Barcode Enter keypress lookup & Scan Button setup
      searchProd.onkeydown = async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = searchProd.value.trim();
          if (!query) return;

          const prods = await S.getAll('products');
          let matched = null;

          for (const p of prods) {
            if (p.variations && p.variations.length > 0) {
              const v = p.variations.find(varObj => (varObj.barcode && varObj.barcode.toLowerCase() === query.toLowerCase()) || (varObj.sku && varObj.sku.toLowerCase() === query.toLowerCase()));
              if (v) {
                matched = { product: p, variant: v, name: `${p.name} - ${v.name}`, sku: v.sku, barcode: v.barcode, price: v.price, stock: v.stock };
                break;
              }
            } else {
              if ((p.barcode && p.barcode.toLowerCase() === query.toLowerCase()) || (p.sku && p.sku.toLowerCase() === query.toLowerCase())) {
                matched = { product: p, variant: null, name: p.name, sku: p.sku, barcode: p.barcode, price: p.sellingPrice, stock: p.stock };
                break;
              }
            }
          }

          if (matched) {
            H.debounce(() => {}, 0)();
            this.addToCart(matched);
            searchProd.value = '';
            prodResults.innerHTML = '';
            prodResults.classList.remove('open');
            H.showToast(`Scanned: ${matched.name}`, 'success');
            this.playBeepSound();
          } else {
            // If not exact match, trigger normal filter search immediately
            searchProd.dispatchEvent(new Event('input'));
          }
        }
      };

      document.getElementById('btn-scan').onclick = () => {
        searchProd.value = '';
        searchProd.focus();
        
        searchProd.placeholder = "📷 Scanning... scan barcode now!";
        searchProd.style.borderColor = "var(--primary-color, #3b82f6)";
        searchProd.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.25)";
        
        H.showToast('Scanner ready. Scan the product barcode now.');

        const resetStyle = () => {
          searchProd.placeholder = "Type product name, SKU or scan barcode...";
          searchProd.style.borderColor = "";
          searchProd.style.boxShadow = "";
        };

        searchProd.onblur = resetStyle;
        searchProd.oninput = resetStyle;
      };

      // Discount & Tax recalculations
      const discType = document.getElementById('discount-type');
      const discVal = document.getElementById('discount-value');
      const taxPercent = document.getElementById('tax-percent');

      discType.onchange = () => {
        const type = discType.value;
        if (type === 'none') {
          discVal.value = 0;
          discVal.disabled = true;
        } else {
          discVal.disabled = false;
        }
        this.recalculate();
      };

      discVal.oninput = () => this.recalculate();
      taxPercent.oninput = () => this.recalculate();

      // Apply Coupon
      document.getElementById('btn-apply-coupon').onclick = async () => {
        const codeInput = document.getElementById('coupon-code');
        const code = codeInput.value.trim().toUpperCase();
        if (!code) {
          H.showToast('Please enter a coupon code', 'warning');
          return;
        }

        const coupon = await S.getById('coupons', code);
        if (coupon) {
          discType.value = coupon.discountType;
          discVal.value = coupon.discountValue;
          discVal.disabled = false;
          H.showToast(`Coupon "${coupon.code}" applied successfully!`);
          this.recalculate();
        } else {
          H.showToast('Invalid coupon code', 'error');
        }
      };

      // Add Payment splits
      document.getElementById('btn-add-payment').onclick = () => {
        this.payments.push({ method: 'Cash', amount: 0 });
        this.renderPayments();
        this.recalculate();
      };

      // Place Order trigger
      document.getElementById('btn-place-order').onclick = () => this.saveChanges();
    },

    selectCustomer(c) {
      this.selectedCustomer = c;
      const details = document.getElementById('customer-details');
      details.style.display = 'block';
      details.innerHTML = `
        <div style="background:var(--primary-50); border:1.5px dashed var(--primary); padding:10px 14px; border-radius:var(--radius-sm); position:relative;">
          <div style="font-weight:700; color:var(--primary-dark); font-size:13px;">👥 ${POS.Helpers.esc(c.name)}</div>
          <div style="font-size:11px; color:var(--text-secondary);">Phone: ${POS.Helpers.esc(c.phone)} | Address: ${POS.Helpers.esc(c.address || 'N/A')}</div>
          <button id="btn-remove-cust" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); border:none; background:none; font-size:16px; cursor:pointer; color:var(--danger);" title="Deselect Customer">&times;</button>
        </div>
      `;
      document.getElementById('btn-remove-cust').onclick = () => {
        this.selectedCustomer = null;
        details.style.display = 'none';
        details.innerHTML = '';
      };
    },

    async quickAddCustomer(phone) {
      const H = POS.Helpers;
      const S = POS.Store;
      const name = await H.prompt('Quick register customer. Enter Customer Name:', 'Quick Customer');
      if (!name) return;

      const newCust = {
        id: 'cust_' + Math.random().toString(36).substr(2, 9),
        name,
        phone,
        email: '',
        label: 'General',
        customDiscount: 0,
        address: ''
      };

      const added = await S.add('customers', newCust);
      if (added) {
        this.selectCustomer(added);
        H.showToast('Customer registered and selected successfully.');
      }
    },

    addToCart(item) {
      const existing = this.cart.find(c =>
        c.productId === item.product.id &&
        c.variationName === (item.variant ? item.variant.name : null)
      );

      if (existing) {
        if (existing.qty < existing.stock) {
          existing.qty++;
        } else {
          POS.Helpers.showToast('Max available stock reached!', 'warning');
        }
      } else {
        this.cart.push({
          productId: item.product.id,
          productName: item.product.name,
          variationName: item.variant ? item.variant.name : null,
          unitPrice: parseFloat(item.price),
          qty: 1,
          image: item.product.image || '',
          stock: item.stock
        });
      }

      this.renderCart();
      this.recalculate();
    },

    renderCart() {
      const H = POS.Helpers;
      const tbody = document.getElementById('cart-tbody');
      tbody.innerHTML = '';

      if (this.cart.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center text-muted">Cart is empty. Add products to start.</td>
          </tr>
        `;
        return;
      }

      this.cart.forEach((item, index) => {
        const total = item.unitPrice * item.qty;
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              ${item.image ? `<img src="${item.image}" style="width:36px; height:36px; border-radius:var(--radius-xs); object-fit:cover; border:1px solid var(--border);">` : `<div style="width:36px; height:36px; border-radius:var(--radius-xs); background:var(--primary-50); display:flex; align-items:center; justify-content:center; font-size:16px;">📦</div>`}
              <div>
                <div style="font-weight:600;">${H.esc(item.productName)}</div>
                ${item.variationName ? `<div style="font-size:11px; color:#64748b;">${H.esc(item.variationName)}</div>` : ''}
              </div>
            </div>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:4px; max-width:110px;">
              <span>৳</span>
              <input type="number" class="input-price form-input" value="${item.unitPrice}" min="0.01" step="0.01" style="padding:4px 6px; height:28px; width:100%; font-size:12px; font-weight:600;">
            </div>
          </td>
          <td>
            <div class="qty-control">
              <button class="btn-qty-dec">-</button>
              <input type="number" class="input-qty" value="${item.qty}" min="1">
              <button class="btn-qty-inc">+</button>
            </div>
          </td>
          <td style="font-weight:700; color:var(--text-dark);">${H.formatCurrency(total)}</td>
          <td><button class="btn-qty-remove" title="Remove Item">&times;</button></td>
        `;

        tbody.appendChild(row);

        // Bind items events
        row.querySelector('.btn-qty-dec').onclick = () => {
          if (item.qty > 1) {
            item.qty--;
            this.renderCart();
            this.recalculate();
          }
        };

        row.querySelector('.btn-qty-inc').onclick = () => {
          if (item.qty < item.stock) {
            item.qty++;
            this.renderCart();
            this.recalculate();
          } else {
            H.showToast('Max available stock reached!', 'warning');
          }
        };

        row.querySelector('.input-qty').onchange = (e) => {
          let val = parseInt(e.target.value) || 1;
          if (val < 1) val = 1;
          if (val > item.stock) {
            val = item.stock;
            H.showToast('Adjusted to max available stock', 'warning');
          }
          item.qty = val;
          this.renderCart();
          this.recalculate();
        };

        row.querySelector('.input-price').onchange = (e) => {
          let val = parseFloat(e.target.value) || 0;
          if (val < 0) val = 0;
          item.unitPrice = val;
          this.renderCart();
          this.recalculate();
        };

        row.querySelector('.btn-qty-remove').onclick = () => {
          this.cart.splice(index, 1);
          this.renderCart();
          this.recalculate();
        };
      });
    },

    renderPayments() {
      const H = POS.Helpers;
      const container = document.getElementById('payment-rows-container');
      container.innerHTML = '';

      this.payments.forEach((p, idx) => {
        container.innerHTML += `
          <div class="payment-row" data-index="${idx}">
            <div class="form-group">
              <label class="form-label">Payment Method</label>
              <select class="form-select payment-method-select">
                ${H.paymentMethods.map(m => `<option value="${m}" ${p.method === m ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Amount (৳)</label>
              <input type="number" class="form-input payment-amount-input" value="${p.amount}" min="0">
            </div>
            ${this.payments.length > 1 ? `
              <button class="btn-remove-payment">🗑️</button>
            ` : ''}
          </div>
        `;
      });

      // Bind input events
      container.querySelectorAll('.payment-row').forEach(row => {
        const idx = parseInt(row.dataset.index);

        row.querySelector('.payment-method-select').onchange = (e) => {
          this.payments[idx].method = e.target.value;
        };

        row.querySelector('.payment-amount-input').oninput = (e) => {
          const val = parseFloat(e.target.value) || 0;
          this.payments[idx].amount = val;

          // Auto-balance remaining payment amount across other split row
          if (this.payments.length > 1) {
            const subtotal = this.cart.reduce((s, i) => s + (i.unitPrice * i.qty), 0);
            const discType = document.getElementById('discount-type').value;
            const discVal = parseFloat(document.getElementById('discount-value').value) || 0;
            let discountAmount = 0;
            if (discType === 'percentage') {
              discountAmount = subtotal * (discVal / 100);
            } else if (discType === 'amount') {
              discountAmount = discVal;
            }
            if (discountAmount > subtotal) discountAmount = subtotal;
            const taxPercent = parseFloat(document.getElementById('tax-percent').value) || 0;
            const taxAmount = (subtotal - discountAmount) * (taxPercent / 100);
            const grandTotal = subtotal - discountAmount + taxAmount;

            let balancingIdx = this.payments.length - 1;
            if (idx === balancingIdx) {
              balancingIdx = 0;
            }

            let sumOthers = 0;
            this.payments.forEach((p, pIdx) => {
              if (pIdx !== balancingIdx) {
                sumOthers += p.amount;
              }
            });

            let balancedAmount = grandTotal - sumOthers;
            if (balancedAmount < 0) balancedAmount = 0;
            this.payments[balancingIdx].amount = balancedAmount;

            const balancedInput = container.querySelector(`.payment-row[data-index="${balancingIdx}"] .payment-amount-input`);
            if (balancedInput) {
              balancedInput.value = balancedAmount.toFixed(2);
            }
          }
          this.recalculate();
        };

        const removeBtn = row.querySelector('.btn-remove-payment');
        if (removeBtn) {
          removeBtn.onclick = () => {
            this.payments.splice(idx, 1);
            this.renderPayments();
            this.recalculate();
          };
        }
      });
    },

    recalculate() {
      const H = POS.Helpers;

      // 1. Calculate Subtotal
      let subtotal = 0;
      this.cart.forEach(item => {
        subtotal += (item.unitPrice * item.qty);
      });

      // 2. Calculate Discount
      const discType = document.getElementById('discount-type').value;
      const discVal = parseFloat(document.getElementById('discount-value').value) || 0;
      let discountAmount = 0;

      if (discType === 'percentage') {
        discountAmount = subtotal * (discVal / 100);
      } else if (discType === 'amount') {
        discountAmount = discVal;
      }

      // Keep discount <= subtotal
      if (discountAmount > subtotal) discountAmount = subtotal;

      // 3. Calculate Tax
      const taxPercent = parseFloat(document.getElementById('tax-percent').value) || 0;
      const taxAmount = (subtotal - discountAmount) * (taxPercent / 100);

      // 4. Grand Total
      const grandTotal = subtotal - discountAmount + taxAmount;

      // 5. Default single payment row amount to grandTotal
      if (this.payments.length === 1) {
        this.payments[0].amount = grandTotal;
        const pInput = document.querySelector('.payment-amount-input');
        if (pInput) pInput.value = grandTotal.toFixed(2);
      }

      // Update Summary Fields
      document.getElementById('summary-subtotal').textContent = H.formatCurrency(subtotal);
      document.getElementById('summary-discount').textContent = `-${H.formatCurrency(discountAmount)}`;
      document.getElementById('summary-tax').textContent = H.formatCurrency(taxAmount);
      document.getElementById('summary-total').textContent = H.formatCurrency(grandTotal);
    },

    async saveChanges() {
      const S = POS.Store;
      const H = POS.Helpers;

      if (this.cart.length === 0) {
        H.showToast('Cart is empty. Please add items first.', 'error');
        return;
      }

      const salesDate = document.getElementById('sales-date').value;
      const subtotal = this.cart.reduce((s, i) => s + (i.unitPrice * i.qty), 0);

      const discType = document.getElementById('discount-type').value;
      const discVal = parseFloat(document.getElementById('discount-value').value) || 0;
      let discountAmount = 0;
      if (discType === 'percentage') {
        discountAmount = subtotal * (discVal / 100);
      } else if (discType === 'amount') {
        discountAmount = discVal;
      }

      const taxPercent = parseFloat(document.getElementById('tax-percent').value) || 0;
      const taxAmount = (subtotal - discountAmount) * (taxPercent / 100);
      const grandTotal = subtotal - discountAmount + taxAmount;

      const totalPaid = this.payments.reduce((s, p) => s + p.amount, 0);

      // Combine selected input date with original order's hours/minutes/seconds
      const originalDateObj = new Date(this.activeOrder.date);
      const dateParts = salesDate.split('-'); // [YYYY, MM, DD]
      const finalDate = new Date(
        parseInt(dateParts[0]),
        parseInt(dateParts[1]) - 1,
        parseInt(dateParts[2]),
        originalDateObj.getHours(),
        originalDateObj.getMinutes(),
        originalDateObj.getSeconds()
      );
      const orderId = this.editOrderId;
      const invoiceId = this.activeOrder.invoiceId;

      const order = {
        id: orderId,
        invoiceId,
        customerId: this.selectedCustomer ? this.selectedCustomer.id : 'walk-in',
        customerName: this.selectedCustomer ? this.selectedCustomer.name : 'Walk-in Customer',
        customerPhone: this.selectedCustomer ? this.selectedCustomer.phone : 'N/A',
        date: finalDate.toISOString(),
        subtotal,
        discountType: discType,
        discountValue: discVal,
        discountAmount,
        taxPercent,
        taxAmount,
        grandTotal,
        paidAmount: totalPaid,
        dueAmount: 0,
        returnedAmount: 0,
        status: 'completed'
      };

      const orderItemsList = this.cart.map(item => ({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9) + '_' + item.productId,
        orderId,
        productId: item.productId,
        productName: item.productName,
        variationName: item.variationName,
        qty: item.qty,
        unitPrice: item.unitPrice,
        total: item.unitPrice * item.qty
      }));

      const orderPaymentsList = this.payments.map(p => ({
        id: 'pay_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        orderId,
        method: p.method,
        amount: p.amount
      }));

      const result = await S.updateOrder(this.editOrderId, order, orderItemsList, orderPaymentsList);

      if (result.success) {
        H.showToast(`Order ${invoiceId} updated successfully!`);
        if (await H.confirm('Would you like to print the receipt?')) {
          H.printOrder(order, this.cart);
        }
        POS.Router.navigate('/sales-list');
      } else {
        H.showToast('Failed to update order: ' + result.error, 'error');
      }
    },

    async printInvoice(order, cartItems) {
      const H = POS.Helpers;
      H.printOrder(order, cartItems);
    },

    playBeepSound() {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } catch (err) {
        console.warn('Web Audio API beep failed:', err);
      }
    }
  };

  window.POS = window.POS || {};
  window.POS.EditOrder = EditOrder;
})();
