(function () {
  'use strict';

  const LabelPrinter = {
    selectedProducts: [], // array of { product, variation, qty }
    settings: {},

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      // Fetch global settings
      this.settings = await S.getSettings();
      // Inject label printing presets if missing
      this._applyDefaultLabelSettings();

      const categories = await S.getAll('categories');
      const products = await S.getAll('products');

      mc.innerHTML = `
        <style>
          /* Live Preview Label styles */
          .label-live-preview-box * { box-sizing: border-box; }
          .label-live-preview-box .lbl-title { font-weight: 700; font-size: 10px; line-height: 1.2; word-break: break-word; overflow: hidden; max-height: 24px; text-transform: uppercase; }
          .label-live-preview-box .lbl-store { font-weight: 800; font-size: 8px; color: #4a5568; letter-spacing: 0.5px; margin-bottom: 1px; text-transform: uppercase; }
          .label-live-preview-box .lbl-price-large { font-weight: 800; font-size: 15px; color: #000; margin: 1px 0; }
          .label-live-preview-box .lbl-price-strike { text-decoration: line-through; font-size: 9px; color: #718096; margin-right: 4px; }
          .label-live-preview-box .lbl-price-sale { font-weight: 800; font-size: 14px; color: #e53e3e; }
          .label-live-preview-box .lbl-sku { font-size: 8px; color: #2d3748; font-weight: 500; }
          .label-live-preview-box .lbl-attrs { font-size: 8px; color: #4a5568; margin-top: 1px; }
          .label-live-preview-box .barcode-wrapper { display: flex; justify-content: center; align-items: center; margin: 1px auto; width: 100%; height: auto; overflow: hidden; }
          .label-live-preview-box .barcode-wrapper svg { max-width: 100%; height: auto; display: block; }
          .label-live-preview-box .badge-sale { background: #000; color: #fff; font-size: 7px; font-weight: 800; padding: 1px 4px; border-radius: 2px; text-transform: uppercase; display: inline-block; }
          .label-live-preview-box .badge-price-yellow { border: 1.5px solid #000; color: #000; padding: 2.5px 6px; border-radius: 4px; font-weight: 800; font-size: 13px; }
        </style>

        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">🏷️ Barcode & Label Printer</h2>
            <p class="page-subtitle">Configure label designs, select multiple products, customize layouts, and print labels dynamically.</p>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1.2fr; gap:20px; align-items:start;" class="fade-in">
          
          <!-- Left Column: Product Selection & Configuration -->
          <div style="display:flex; flex-direction:column; gap:20px;">
            
            <!-- Product Selection Box -->
            <div class="card">
              <div class="card-header">
                <h3>📦 Step 1: Select Products to Print</h3>
              </div>
              <div class="card-body" style="display:flex; flex-direction:column; gap:12px;">
                <div style="display:flex; gap:10px;">
                  <div class="search-box" style="flex:2; margin-bottom:0;">
                    <input type="text" id="label-prod-search" placeholder="Type name, SKU, or barcode to add product..." autocomplete="off">
                    <div id="label-search-results" class="search-results-dropdown" style="display:none; position:absolute; z-index:100; width:100%; background:#fff; border:1px solid #cbd5e1; border-radius:var(--radius-sm); box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); max-height:220px; overflow-y:auto;"></div>
                  </div>
                  <div class="form-group" style="flex:1; margin-bottom:0;">
                    <select class="form-select" id="label-cat-select" style="height:38px;">
                      <option value="">-- Add Entire Category --</option>
                      ${categories.map(c => `<option value="${c.id}">${H.esc(c.name)}</option>`).join('')}
                    </select>
                  </div>
                </div>

                <!-- Selected Products Table -->
                <div style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border-light); border-radius: var(--radius-sm);">
                  <table class="table" style="margin:0; font-size:12px;">
                    <thead>
                      <tr style="background:#f8fafc;">
                        <th>Product Details</th>
                        <th style="width:100px; text-align:center;">Print Qty</th>
                        <th style="width:50px; text-align:center;">Action</th>
                      </tr>
                    </thead>
                    <tbody id="selected-prods-body">
                      <tr>
                        <td colspan="3" class="text-center text-muted" style="padding:20px;">
                          No products selected. Search above or select a category to add products.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <button class="btn btn-secondary btn-sm" id="btn-clear-selected" style="color:var(--danger);">Clear Table</button>
                  <span style="font-weight:600; font-size:12px; color:#64748b;" id="lbl-total-count">Total Labels: 0</span>
                </div>
              </div>
            </div>

            <!-- Print Customization Overrides -->
            <div class="card">
              <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3>🎨 Step 2: Customize Label Design</h3>
                <span class="badge" style="background:#f1f5f9; color:#64748b; font-size:10px;">Overrides saved values</span>
              </div>
              <div class="card-body" style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div class="form-group">
                  <label class="form-label">Label Template</label>
                  <select class="form-select" id="lbl-override-template">
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
                  <label class="form-label">Dimensions Preset</label>
                  <select class="form-select" id="lbl-override-preset">
                    <option value="40x25">40 × 25 mm (Small)</option>
                    <option value="50x30">50 × 30 mm (Standard)</option>
                    <option value="58x40">58 × 40 mm (Medium)</option>
                    <option value="70x50">70 × 50 mm (Large)</option>
                    <option value="80x50">80 × 50 mm (Wide)</option>
                    <option value="100x50">100 × 50 mm (Shipping Size)</option>
                    <option value="custom">Custom Size (mm)</option>
                  </select>
                </div>

                <div class="form-group" id="lbl-custom-dims" style="display:none; grid-column:1/-1; gap:10px; margin-bottom:0;">
                  <div style="flex:1;">
                    <label class="form-label">Custom Width (mm)</label>
                    <input type="number" class="form-input" id="lbl-override-width" min="10" max="250" value="50">
                  </div>
                  <div style="flex:1;">
                    <label class="form-label">Custom Height (mm)</label>
                    <input type="number" class="form-input" id="lbl-override-height" min="10" max="250" value="30">
                  </div>
                </div>

                <div style="grid-column:1/-1; border-top:1px solid #edf2f7; padding-top:10px;">
                  <h4 style="margin:0 0 10px 0; font-size:12px; color:var(--text-dark);">Visibility Toggles:</h4>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px;">
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="chk-lbl-store" checked> Show Store Name
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="chk-lbl-name" checked> Show Product Name
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="chk-lbl-barcode" checked> Show Barcode
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="chk-lbl-human" checked> Show Barcode Text
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="chk-lbl-qr"> Show QR Code
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="chk-lbl-sku" checked> Show SKU
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="chk-lbl-price" checked> Show Price
                    </label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" id="chk-lbl-attribs"> Show Size & Color
                    </label>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Right Column: Sheet Live Preview & Print -->
          <div style="position:sticky; top:20px; display:flex; flex-direction:column; gap:20px;">
            <div class="card" style="flex:1;">
              <div class="card-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3>👁️ Step 3: Print Sheet Live Preview</h3>
                <div style="display:flex; gap:8px;">
                  <button class="btn btn-secondary btn-sm" id="btn-preview-refresh">🔄 Refresh</button>
                  <button class="btn btn-primary btn-sm" id="btn-label-print-execute" style="padding:6px 16px;">🖨️ Print Labels</button>
                </div>
              </div>
              <div class="card-body" style="background:#e2e8f0; min-height:450px; max-height:600px; overflow-y:auto; display:flex; flex-wrap:wrap; gap:10px; justify-content:center; align-content:start; padding:20px; border-radius:var(--radius-sm);">
                <div id="labels-preview-canvas" style="display:flex; flex-wrap:wrap; gap:15px; justify-content:center; width:100%;">
                  <div class="text-muted text-center" style="margin-top:100px;">
                    Select products on the left to generate print previews.
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      `;

      // Apply initial override configurations from global settings
      this._loadOverrideDefaults();

      // Bind Product Search & Autocomplete
      const searchInput = document.getElementById('label-prod-search');
      const resultsDiv = document.getElementById('label-search-results');

      searchInput.oninput = H.debounce(() => {
        const q = searchInput.value.toLowerCase().trim();
        if (!q) {
          resultsDiv.style.display = 'none';
          return;
        }

        const matches = products.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.sku.toLowerCase().includes(q) || 
          (p.barcode && p.barcode.includes(q))
        );

        if (matches.length === 0) {
          resultsDiv.innerHTML = `<div style="padding:10px; color:#64748b; font-size:12px; font-style:italic;">No products match query.</div>`;
        } else {
          resultsDiv.innerHTML = matches.map(p => {
            let label = `${H.esc(p.name)} <span style="color:#64748b;">(SKU: ${H.esc(p.sku)})</span>`;
            return `<div class="search-result-item" data-id="${p.id}" style="padding:8px 12px; border-bottom:1px solid #f1f5f9; cursor:pointer; font-size:12px;">${label}</div>`;
          }).join('');

          resultsDiv.querySelectorAll('.search-result-item').forEach(item => {
            item.onclick = () => {
              const matchedProd = products.find(p => p.id === item.dataset.id);
              this.addProduct(matchedProd);
              searchInput.value = '';
              resultsDiv.style.display = 'none';
            };
          });
        }
        resultsDiv.style.display = 'block';
      }, 150);

      // Hide dropdown if clicked outside
      document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== resultsDiv) {
          resultsDiv.style.display = 'none';
        }
      });

      // Category selector trigger
      const catSelect = document.getElementById('label-cat-select');
      catSelect.onchange = async () => {
        const catId = catSelect.value;
        if (!catId) return;

        const catProds = products.filter(p => p.categoryId === catId);
        if (catProds.length === 0) {
          H.showToast('No products in this category.', 'warning');
        } else {
          catProds.forEach(p => this.addProduct(p, false));
          this.updateSelectedTable();
          H.showToast(`Added ${catProds.length} products to print queue.`);
        }
        catSelect.value = '';
      };

      // Configuration override change bindings
      const overrides = [
        'lbl-override-template', 'lbl-override-preset', 'lbl-override-width', 'lbl-override-height',
        'chk-lbl-store', 'chk-lbl-name', 'chk-lbl-barcode', 'chk-lbl-human', 'chk-lbl-qr', 
        'chk-lbl-sku', 'chk-lbl-price', 'chk-lbl-attribs'
      ];

      overrides.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.onchange = () => this.updateLivePreview();
      });

      document.getElementById('lbl-override-preset').onchange = (e) => {
        const preset = e.target.value;
        const dims = document.getElementById('lbl-custom-dims');
        if (preset === 'custom') {
          dims.style.display = 'flex';
        } else {
          dims.style.display = 'none';
          const [w, h] = preset.split('x').map(Number);
          document.getElementById('lbl-override-width').value = w;
          document.getElementById('lbl-override-height').value = h;
        }
        this.updateLivePreview();
      };

      // Button binders
      document.getElementById('btn-clear-selected').onclick = () => {
        this.selectedProducts = [];
        this.updateSelectedTable();
      };

      document.getElementById('btn-preview-refresh').onclick = () => this.updateLivePreview();

      document.getElementById('btn-label-print-execute').onclick = () => this.printLabels();
    },

    addProduct(p, redraw = true) {
      const H = POS.Helpers;
      
      // If product has variations, add individual rows for variations
      if (p.variations && p.variations.length > 0) {
        p.variations.forEach(v => {
          const key = `${p.id}-${v.id}`;
          const existing = this.selectedProducts.find(x => x.key === key);
          if (existing) {
            existing.qty++;
          } else {
            this.selectedProducts.push({
              key,
              product: p,
              variation: v,
              qty: 1
            });
          }
        });
      } else {
        const key = `${p.id}-main`;
        const existing = this.selectedProducts.find(x => x.key === key);
        if (existing) {
          existing.qty++;
        } else {
          this.selectedProducts.push({
            key,
            product: p,
            variation: null,
            qty: 1
          });
        }
      }

      if (redraw) {
        this.updateSelectedTable();
      }
    },

    updateSelectedTable() {
      const H = POS.Helpers;
      const body = document.getElementById('selected-prods-body');
      
      if (this.selectedProducts.length === 0) {
        body.innerHTML = `
          <tr>
            <td colspan="3" class="text-center text-muted" style="padding:20px;">
              No products selected. Search above or select a category to add products.
            </td>
          </tr>
        `;
        document.getElementById('lbl-total-count').innerText = `Total Labels: 0`;
        this.updateLivePreview();
        return;
      }

      body.innerHTML = this.selectedProducts.map((row, idx) => {
        const p = row.product;
        const v = row.variation;
        
        let details = `<strong>${H.esc(p.name)}</strong>`;
        if (v) {
          details += ` <span style="background:var(--primary-light); color:var(--primary); font-weight:700; padding:1px 6px; border-radius:4px; font-size:10px;">${H.esc(v.name)}</span>`;
        }
        details += `<div style="font-size:10px; color:#64748b; margin-top:2px;">SKU: ${H.esc(row.variation ? v.sku : p.sku)} | Barcode: ${H.esc(row.variation ? (v.barcode || v.sku) : (p.barcode || p.sku))}</div>`;

        return `
          <tr style="vertical-align:middle;">
            <td>${details}</td>
            <td style="text-align:center;">
              <input type="number" class="form-input qty-edit-input" data-index="${idx}" value="${row.qty}" min="1" max="500" style="width:75px; text-align:center; padding:4px; height:28px; font-size:12px; margin:0 auto;">
            </td>
            <td style="text-align:center;">
              <button class="btn btn-secondary btn-sm remove-row-btn" data-index="${idx}" style="color:var(--danger); padding:4px 8px; font-size:12px;">🗑️</button>
            </td>
          </tr>
        `;
      }).join('');

      // Add table listeners
      body.querySelectorAll('.qty-edit-input').forEach(input => {
        input.onchange = (e) => {
          const idx = parseInt(e.target.dataset.index);
          const val = Math.max(1, parseInt(e.target.value) || 1);
          this.selectedProducts[idx].qty = val;
          e.target.value = val;
          this.updateLivePreview();
        };
      });

      body.querySelectorAll('.remove-row-btn').forEach(btn => {
        btn.onclick = (e) => {
          const idx = parseInt(btn.dataset.index);
          this.selectedProducts.splice(idx, 1);
          this.updateSelectedTable();
        };
      });

      // Total count recalculation
      const total = this.selectedProducts.reduce((sum, x) => sum + x.qty, 0);
      document.getElementById('lbl-total-count').innerText = `Total Labels: ${total}`;

      this.updateLivePreview();
    },

    updateLivePreview() {
      const H = POS.Helpers;
      const canvas = document.getElementById('labels-preview-canvas');

      if (this.selectedProducts.length === 0) {
        canvas.innerHTML = `
          <div class="text-muted text-center" style="margin-top:100px;">
            Select products on the left to generate print previews.
          </div>
        `;
        return;
      }

      // Gather current configuration choices
      const config = this._getCurrentConfig();

      // Check if libraries are loaded
      if (config.showBarcode && typeof JsBarcode === 'undefined') {
        canvas.innerHTML = `
          <div style="background:#fee2e2; border:1px solid #fca5a5; color:#991b1b; padding:16px; border-radius:var(--radius-sm); text-align:center; width:100%; font-size:13px; font-weight:600; margin-top:20px;">
            ⚠️ JsBarcode library is not loaded in the browser! <br>
            Please ensure you have pushed index.html updates and refreshed the page using <strong>Ctrl+F5 (Hard Refresh)</strong> to bypass cache.
          </div>
        `;
        return;
      }
      if (config.showQR && typeof QRCode === 'undefined') {
        canvas.innerHTML = `
          <div style="background:#fee2e2; border:1px solid #fca5a5; color:#991b1b; padding:16px; border-radius:var(--radius-sm); text-align:center; width:100%; font-size:13px; font-weight:600; margin-top:20px;">
            ⚠️ QRCode library is not loaded in the browser! <br>
            Please ensure you have pushed index.html updates and refreshed the page using <strong>Ctrl+F5 (Hard Refresh)</strong> to bypass cache.
          </div>
        `;
        return;
      }

      canvas.innerHTML = '';

      let labelIdx = 0;
      this.selectedProducts.forEach((row) => {
        const p = row.product;
        const v = row.variation;

        const name = p.name;
        const sku = v ? v.sku : p.sku;
        const barcode = v ? (v.barcode || v.sku) : (p.barcode || p.sku);
        const price = v ? v.price : p.sellingPrice;
        const size = v ? (v.size || '') : '';
        const color = v ? (v.color || '') : '';

        for (let i = 0; i < row.qty; i++) {
          const labelId = `lbl-preview-${labelIdx}`;
          const labelEl = document.createElement('div');
          labelEl.className = 'label-live-preview-box';
          labelEl.style.width = `${config.width}mm`;
          labelEl.style.height = `${config.height}mm`;
          labelEl.style.background = '#fff';
          labelEl.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
          labelEl.style.border = '1px dashed #cbd5e1';
          labelEl.style.padding = '3mm';
          labelEl.style.display = 'flex';
          labelEl.style.flexDirection = 'column';
          labelEl.style.justifyContent = 'space-between';
          labelEl.style.textAlign = 'center';
          labelEl.style.color = '#000';
          labelEl.style.position = 'relative';
          labelEl.style.overflow = 'hidden';

          // Build content depending on the template design chosen
          labelEl.innerHTML = this._generateLabelHTML(name, sku, barcode, price, size, color, config, labelId);
          canvas.appendChild(labelEl);

          // Generate barcode svg content
          if (config.showBarcode && barcode) {
            const svg = labelEl.querySelector('.barcode-svg');
            if (svg) {
              try {
                JsBarcode(svg, barcode, {
                  format: 'CODE128',
                  width: config.width < 50 ? 1.0 : 1.4,
                  height: config.height < 30 ? 16 : 28,
                  displayValue: config.showHumanReadable,
                  fontSize: 9,
                  margin: 2
                });
              } catch (err) {
                console.warn('JsBarcode error:', err.message);
                svg.outerHTML = `<div style="font-size:7.5px; color:#ef4444; font-weight:600; line-height:1.1; padding:2px; text-transform:none;">⚠️ Barcode Error</div>`;
              }
            }
          }

          // Generate QR code content
          if (config.showQR && barcode) {
            const qrContainer = labelEl.querySelector('.qrcode-container');
            if (qrContainer) {
              try {
                new QRCode(qrContainer, {
                  text: barcode,
                  width: config.height < 30 ? 32 : 48,
                  height: config.height < 30 ? 32 : 48,
                  colorDark: '#000000',
                  colorLight: '#ffffff',
                  correctLevel: QRCode.CorrectLevel.M
                });
              } catch (err) {
                console.warn('QRCode error:', err.message);
              }
            }
          }

          labelIdx++;
        }
      });
    },

    printLabels() {
      const H = POS.Helpers;
      if (this.selectedProducts.length === 0) {
        H.showToast('Please add at least one product to print.', 'error');
        return;
      }

      const config = this._getCurrentConfig();
      
      // Start generating print frame content
      let printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Labels Print Job</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&family=Libre+Barcode+39&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #fff; margin: 0; }
            
            /* Professional CSS Print layout rules */
            @page {
              size: ${config.width}mm ${config.height}mm;
              margin: 0mm;
            }
            @media print {
              html, body {
                width: ${config.width}mm;
                height: ${config.height}mm;
                background: #fff;
              }
              .print-label-item {
                page-break-inside: avoid;
                page-break-after: always;
                border: none !important;
              }
            }

            .print-label-item {
              width: ${config.width}mm;
              height: ${config.height}mm;
              padding: 2.5mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              text-align: center;
              font-family: 'Inter', sans-serif;
              color: #000;
              overflow: hidden;
              position: relative;
              background: #fff;
            }

            /* Layout styling helpers */
            .lbl-title { font-weight: 700; font-size: 10px; line-height: 1.2; word-break: break-word; overflow: hidden; max-height: 24px; text-transform: uppercase; }
            .lbl-store { font-weight: 800; font-size: 8px; color: #4a5568; letter-spacing: 0.5px; margin-bottom: 1px; text-transform: uppercase; }
            .lbl-price-large { font-weight: 800; font-size: 15px; color: #000; margin: 1px 0; }
            .lbl-price-strike { text-decoration: line-through; font-size: 9px; color: #718096; margin-right: 4px; }
            .lbl-price-sale { font-weight: 800; font-size: 14px; color: #e53e3e; }
            .lbl-sku { font-size: 8px; color: #2d3748; font-weight: 500; }
            .lbl-attrs { font-size: 8px; color: #4a5568; margin-top: 1px; }
            .barcode-wrapper { display: flex; justify-content: center; align-items: center; margin: 1px auto; width: 100%; }
            .barcode-wrapper svg { max-width: 100%; height: auto; display: block; }
            
            /* Specific Template Layouts Styles */
            .layout-vertical { display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
            .layout-horizontal { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: center; height: 100%; }
            .badge-sale { background: #000; color: #fff; font-size: 7px; font-weight: 800; padding: 1px 4px; border-radius: 2px; text-transform: uppercase; display: inline-block; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .badge-price-yellow { border: 1.5px solid #000; color: #000; padding: 2.5px 6px; border-radius: 4px; font-weight: 800; font-size: 13px; }
          </style>
        </head>
        <body>
      `;

      let labelIdx = 0;
      this.selectedProducts.forEach((row) => {
        const p = row.product;
        const v = row.variation;

        const name = p.name;
        const sku = v ? v.sku : p.sku;
        const barcode = v ? (v.barcode || v.sku) : (p.barcode || p.sku);
        const price = v ? v.price : p.sellingPrice;
        const size = v ? (v.size || '') : '';
        const color = v ? (v.color || '') : '';

        for (let i = 0; i < row.qty; i++) {
          const printId = `lbl-print-${labelIdx}`;
          
          printContent += `
            <div class="print-label-item">
              ${this._generateLabelHTML(name, sku, barcode, price, size, color, config, printId)}
            </div>
          `;
          labelIdx++;
        }
      });

      printContent += `
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
          <script>
            // Generate all barcodes/qrcodes inside the print window context
            window.onload = function() {
              const config = ${JSON.stringify(config)};
              
              // Barcode Generation
              if (config.showBarcode) {
                document.querySelectorAll('.barcode-svg').forEach(function(svg) {
                  const val = svg.getAttribute('data-value');
                  if (val) {
                    try {
                      JsBarcode(svg, val, {
                        format: 'CODE128',
                        width: config.width < 50 ? 0.9 : 1.3,
                        height: config.height < 30 ? 16 : 28,
                        displayValue: config.showHumanReadable,
                        fontSize: 8,
                        margin: 1
                      });
                    } catch(err) {
                      console.warn(err);
                    }
                  }
                });
              }

              // QR Code Generation
              if (config.showQR) {
                document.querySelectorAll('.qrcode-container').forEach(function(div) {
                  const val = div.getAttribute('data-text');
                  if (val) {
                    try {
                      new QRCode(div, {
                        text: val,
                        width: config.height < 30 ? 28 : 42,
                        height: config.height < 30 ? 28 : 42,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.M
                      });
                    } catch(err) {
                      console.warn(err);
                    }
                  }
                });
              }

              // Automatically launch native print window
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
        </html>
      `;

      // Open blank frame and print
      const w = window.open('', '_blank', 'width=800,height=600');
      w.document.open();
      w.document.write(printContent);
      w.document.close();
    },

    /* ── Internal Code Renderers ─────────────────────── */
    _generateLabelHTML(name, sku, barcode, price, size, color, config, uniqueId) {
      const H = POS.Helpers;
      const storeName = this.settings.store_name || 'ZenPos Store';

      const showStore = config.showStore ? `<div class="lbl-store" style="font-size:${config.height < 30 ? '7px' : '9px'}">${H.esc(storeName)}</div>` : '';
            const showName = config.showName ? `<div class="lbl-title" style="font-size:${config.height < 30 ? '9px' : '11px'}">${H.esc(name)}</div>` : '';
      const showSku = config.showSKU ? `<div class="lbl-sku">SKU: ${H.esc(sku)}</div>` : '';
      
      let attributes = '';
      if (config.showAttribs && (size || color)) {
        attributes = `<div class="lbl-attrs">${size ? `Sz: ${H.esc(size)}` : ''} ${color ? `Cl: ${H.esc(color)}` : ''}</div>`;
      }

      // Render barcode, QR, or both stacked depending on checkboxes
      let barcodeOrQrEl = '';
      const barcodeHtml = config.showBarcode && barcode
        ? `<div class="barcode-wrapper" style="height:${config.height < 30 ? 18 : 32}px; display:flex; justify-content:center; align-items:center; width:100%;"><svg class="barcode-svg" data-value="${H.esc(barcode)}" style="height:${config.height < 30 ? 16 : 28}px; width:100%; display:block;"></svg></div>`
        : '';
      const qrHtml = config.showQR && barcode
        ? `<div class="qrcode-container" id="${uniqueId}-qr" data-text="${H.esc(barcode)}" style="width:${config.height < 30 ? 32 : 48}px; height:${config.height < 30 ? 32 : 48}px; margin:0 auto; display:flex; justify-content:center; align-items:center;"></div>`
        : '';

      if (barcodeHtml && qrHtml) {
        barcodeOrQrEl = `<div style="display:flex; flex-direction:column; gap:4px; align-items:center; width:100%;">${barcodeHtml}${qrHtml}</div>`;
      } else {
        barcodeOrQrEl = barcodeHtml || qrHtml;
      }

      // Main layouts depending on template style
      switch (config.template) {
        
        case 'barcode_only':
          // Maximized Barcode Sticker
          return `
            <div class="layout-vertical" style="justify-content:center; gap:2px;">
              ${barcodeOrQrEl}
              ${showSku}
            </div>
          `;

        case 'price_tag':
          // Price focused sticker
          return `
            <div class="layout-vertical" style="justify-content:space-between;">
              ${showStore}
              ${showName}
              ${attributes}
              ${config.showPrice ? `<div class="lbl-price-large" style="font-size: 18px; margin: 4px 0;">${H.formatCurrency(price)}</div>` : ''}
              ${showSku}
            </div>
          `;

        case 'clothing':
          // Clothing tag style (Vertical, centered, border badge)
          return `
            <div class="layout-vertical" style="border:1px solid #000; border-radius:4px; padding:2px; justify-content:space-between; height:100%;">
              <div>
                ${showStore}
                <hr style="border:none; border-top:1px solid #000; margin:2px 0;">
                ${showName}
                ${attributes}
                ${showSku}
              </div>
              <div>
                ${barcodeOrQrEl}
              </div>
              ${config.showPrice ? `
                <div style="border:1.5px solid #000; color:#000; font-weight:800; padding:2px; font-size:12px; margin-top:2px; text-align:center; border-radius:3px;">
                  PRICE: ${H.formatCurrency(price)}
                </div>
              ` : ''}
            </div>
          `;

        case 'premium':
          // Elegant high contrast layout
          return `
            <div class="layout-vertical" style="font-family:'Georgia', serif; justify-content:space-between;">
              <div style="font-size:8px; font-style:italic; border-bottom:1px double #000; padding-bottom:2px; letter-spacing:1px;">
                ✦ ${showStore ? H.esc(storeName).toUpperCase() : ''} ✦
              </div>
              <div style="font-weight:700; font-size:10px; margin-top:4px;">${showName}</div>
              ${attributes}
              ${showSku}
              ${barcodeOrQrEl}
              ${config.showPrice ? `
                <div style="font-weight:800; font-size:14px; margin-top:2px;">
                  ${H.formatCurrency(price)}
                </div>
              ` : ''}
            </div>
          `;

        case 'shelf':
          // Left-aligned name/sku, huge right-aligned price
          return `
            <div class="layout-vertical" style="justify-content:space-between; text-align:left;">
              <div style="display:flex; justify-content:space-between; align-items:start; gap:4px;">
                <div style="flex:1;">
                  ${showStore}
                  ${showName}
                  ${attributes}
                  ${showSku}
                </div>
                ${config.showPrice ? `
                  <div class="badge-price-yellow">
                    ${H.formatCurrency(price)}
                  </div>
                ` : ''}
              </div>
              <div style="width:100%; border-top:1px dashed #ccc; padding-top:2px;">
                ${barcodeOrQrEl}
              </div>
            </div>
          `;

        case 'sale_discount':
          // Highlight discount/strike regular price
          const originalPrice = price * 1.25; // Dummy original price for visual promo impact
          return `
            <div class="layout-vertical" style="justify-content:space-between;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                ${showStore}
                <span class="badge-sale">PROMO</span>
              </div>
              ${showName}
              ${attributes}
              ${showSku}
              ${config.showPrice ? `
                <div style="margin:2px 0; display:flex; align-items:center; justify-content:center;">
                  <span class="lbl-price-strike">${H.formatCurrency(originalPrice)}</span>
                  <span class="lbl-price-sale">${H.formatCurrency(price)}</span>
                </div>
              ` : ''}
              ${barcodeOrQrEl}
            </div>
          `;

        case 'qr_only':
          // QR Code focused sticker
          return `
            <div class="layout-vertical" style="justify-content:space-between; align-items:center;">
              ${showStore}
              ${showName}
              ${attributes}
              <div style="margin:4px 0;">
                ${barcodeOrQrEl}
              </div>
              <div style="display:flex; justify-content:space-between; width:100%; font-size:8px;">
                <span>${showSku ? sku : ''}</span>
                ${config.showPrice ? `<strong>${H.formatCurrency(price)}</strong>` : ''}
              </div>
            </div>
          `;

        case 'warehouse':
          // Huge Barcode & SKU for long distance scan
          return `
            <div class="layout-vertical" style="text-align:left; justify-content:space-between;">
              <div style="display:flex; justify-content:space-between; font-size:8px; font-weight:700;">
                <span>${showStore ? H.esc(storeName) : 'WAREHOUSE STK'}</span>
                <span>LOC: WH-B1</span>
              </div>
              ${config.showSKU ? `<div style="font-weight:800; font-size:12px; border-bottom:1px solid #000; padding-bottom:1px;">SKU: ${sku}</div>` : ''}
              ${barcodeOrQrEl}
              ${config.showName ? `<div style="font-size:8px; color:#555;">Desc: ${H.esc(name)}</div>` : ''}
            </div>
          `;

        case 'small_sticker':
          // Very tight compact layout
          return `
            <div style="display:flex; flex-direction:column; gap:2px; height:100%; justify-content:center; align-items:center;">
              ${showStore ? `<div style="font-size:7px; font-weight:800; text-transform:uppercase;">${H.esc(storeName)}</div>` : ''}
              <div style="font-size:8px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;">${showName}</div>
              ${attributes ? `<div style="font-size:7px; color:#555; transform:scale(0.85);">${attributes}</div>` : ''}
              <div style="margin:-2px 0; width:100%; transform:scale(0.9);">${barcodeOrQrEl}</div>
              ${config.showPrice ? `<div style="font-size:9px; font-weight:800;">${H.formatCurrency(price)}</div>` : ''}
            </div>
          `;

        case 'standard':
        default:
          // Standard Retail label
          return `
            <div class="layout-vertical">
              <div>
                ${showStore}
                ${showName}
                ${attributes}
              </div>
              ${barcodeOrQrEl}
              <div style="display:flex; justify-content:space-between; align-items:end; margin-top:2px;">
                ${showSku}
                ${config.showPrice ? `<div class="lbl-price-large">${H.formatCurrency(price)}</div>` : ''}
              </div>
            </div>
          `;
      }
    },

    _getCurrentConfig() {
      const template = document.getElementById('lbl-override-template').value;
      const preset = document.getElementById('lbl-override-preset').value;
      
      let width = parseFloat(document.getElementById('lbl-override-width').value) || 50;
      let height = parseFloat(document.getElementById('lbl-override-height').value) || 30;

      return {
        template,
        preset,
        width,
        height,
        showStore: document.getElementById('chk-lbl-store').checked,
        showName: document.getElementById('chk-lbl-name').checked,
        showBarcode: document.getElementById('chk-lbl-barcode').checked,
        showHumanReadable: document.getElementById('chk-lbl-human').checked,
        showQR: document.getElementById('chk-lbl-qr').checked,
        showSKU: document.getElementById('chk-lbl-sku').checked,
        showPrice: document.getElementById('chk-lbl-price').checked,
        showAttribs: document.getElementById('chk-lbl-attribs').checked
      };
    },

    _loadOverrideDefaults() {
      // Load saved configurations from store settings into inputs
      const s = this.settings;

      const map = {
        'lbl-override-template': s.label_template || 'standard',
        'lbl-override-preset': s.label_preset || '50x30',
        'lbl-override-width': s.label_width || '50',
        'lbl-override-height': s.label_height || '30',
        'chk-lbl-store': s.label_show_store !== '0',
        'chk-lbl-name': s.label_show_name !== '0',
        'chk-lbl-barcode': s.label_show_barcode !== '0',
        'chk-lbl-human': s.label_show_human_readable !== '0',
        'chk-lbl-qr': s.label_show_qr === '1',
        'chk-lbl-sku': s.label_show_sku !== '0',
        'chk-lbl-price': s.label_show_price !== '0',
        'chk-lbl-attribs': s.label_show_attribs === '1'
      };

      for (const [id, val] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) {
          if (el.type === 'checkbox') {
            el.checked = val;
          } else {
            el.value = val;
          }
        }
      }

      // Handle custom dims section
      const dims = document.getElementById('lbl-custom-dims');
      if (s.label_preset === 'custom') {
        dims.style.display = 'flex';
      }
    },

    _applyDefaultLabelSettings() {
      // Seed default key name value pairs inside settings object in case they aren't loaded
      const defaults = {
        label_template: 'standard',
        label_preset: '50x30',
        label_width: '50',
        label_height: '30',
        label_show_store: '1',
        label_show_name: '1',
        label_show_barcode: '1',
        label_show_human_readable: '1',
        label_show_qr: '0',
        label_show_sku: '1',
        label_show_price: '1',
        label_show_attribs: '0'
      };

      for (const [key, val] of Object.entries(defaults)) {
        if (this.settings[key] === undefined) {
          this.settings[key] = val;
        }
      }
    }
  };

  window.POS = window.POS || {};
  window.POS.LabelPrinter = LabelPrinter;
})();
