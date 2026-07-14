(function () {
  'use strict';

  const Products = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      let searchQuery = '';
      let categoryFilter = 'all';

      const categories = await S.getAll('categories');

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">📦 Product Catalog</h2>
            <p class="page-subtitle">Add variations (colors, sizes), track individual costs, barcode identifiers, and adjust inventory.</p>
          </div>
          <div class="page-actions" style="display:flex; gap:8px; align-items:center;">
            <button class="btn btn-secondary btn-sm" id="btn-export-csv">📥 Export CSV</button>
            <label class="btn btn-secondary btn-sm" style="cursor:pointer; margin-bottom:0; display:inline-flex; align-items:center; height:34px; padding:0 12px; font-weight:600; font-size:12px; border-radius:var(--radius-sm);">
              📤 Import CSV
              <input type="file" id="file-import-csv" accept=".csv" style="display:none;">
            </label>
            <button class="btn btn-secondary btn-sm" id="btn-manage-categories">📁 Categories</button>
            <button class="btn btn-primary btn-sm" id="btn-add-product">+ Add Product</button>
          </div>
        </div>

        <div class="filter-bar fade-in">
          <div class="search-box" style="flex:2;">
            <input type="text" id="prod-search" placeholder="Search by name, SKU, or barcode...">
          </div>
          <div class="form-group" style="margin-bottom:0; flex:1; min-width:180px;">
            <label class="form-label">Category</label>
            <select class="form-select" id="prod-cat-filter">
              <option value="all">All Categories</option>
              ${categories.map(c => `<option value="${c.id}">${H.esc(c.name)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="product-grid fade-in" id="products-container"></div>

        <div class="modal-overlay" id="prod-modal-overlay"></div>
      `;

      // Event handlers
      document.getElementById('btn-add-product').onclick = () => this.showAddEditModal(null);
      document.getElementById('btn-manage-categories').onclick = () => this.showManageCategoriesModal();

      document.getElementById('btn-export-csv').onclick = async () => {
        const list = await S.getAll('products');
        const categoriesList = await S.getAll('categories');
        const csvData = [];

        list.forEach(p => {
          const cat = categoriesList.find(c => c.id === p.categoryId);
          const catName = cat ? cat.name : 'Uncategorized';

          // First, export the main product row
          csvData.push({
            'Product Name': p.name,
            'SKU': p.sku,
            'Parent SKU': '',
            'Variation Name': '',
            'Barcode': p.barcode || '',
            'Category Name': catName,
            'Cost Price': p.costPrice,
            'Selling Price': p.sellingPrice,
            'Alert Qty': p.alertQty,
            'Stock': p.stock
          });

          // Second, export its variations if any
          if (p.variations && p.variations.length > 0) {
            p.variations.forEach(v => {
              csvData.push({
                'Product Name': p.name,
                'SKU': v.sku,
                'Parent SKU': p.sku,
                'Variation Name': v.name,
                'Barcode': v.barcode || '',
                'Category Name': catName,
                'Cost Price': v.costPrice,
                'Selling Price': v.price,
                'Alert Qty': p.alertQty,
                'Stock': v.stock
              });
            });
          }
        });

        H.exportCSV(csvData, 'zenpos_products_catalog');
      };

      document.getElementById('file-import-csv').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const csvText = ev.target.result;
            const rows = H.parseCSV(csvText);
            if (rows.length === 0) {
              H.showToast('CSV is empty or invalid', 'error');
              return;
            }

            const productsToImport = rows.map(r => {
              return {
                name: r['Product Name'] || r['name'] || r['Product'] || '',
                sku: r['SKU'] || r['sku'] || '',
                parentSku: r['Parent SKU'] || r['parentSku'] || r['parent_sku'] || '',
                variationName: r['Variation Name'] || r['variationName'] || r['variation'] || '',
                barcode: r['Barcode'] || r['barcode'] || '',
                categoryName: r['Category Name'] || r['category'] || '',
                costPrice: parseFloat(r['Cost Price'] || r['costPrice'] || r['cost'] || 0),
                sellingPrice: parseFloat(r['Selling Price'] || r['sellingPrice'] || r['price'] || 0),
                alertQty: parseInt(r['Alert Qty'] || r['alertQty'] || 0),
                stock: parseFloat(r['Stock'] || r['stock'] || 0)
              };
            }).filter(item => item.name && item.sku);

            if (productsToImport.length === 0) {
              H.showToast('No valid product rows with Name and SKU found', 'error');
              return;
            }

            const res = await fetch(`${window.location.origin}/api/products/bulk`, {
              method: 'POST',
              headers: S.getHeaders(),
              body: JSON.stringify(productsToImport)
            });

            if (res.ok) {
              H.showToast(`Imported ${productsToImport.length} products successfully!`);
              await this.render();
            } else {
              const err = await res.json();
              H.showToast(err.error || 'Import failed', 'error');
            }
          } catch (err) {
            console.error('Import Error:', err);
            H.showToast('Invalid CSV file format', 'error');
          }
        };
        reader.readAsText(file);
      };

      document.getElementById('prod-search').oninput = H.debounce(async (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        await this.updateList(searchQuery, categoryFilter);
      }, 200);

      document.getElementById('prod-cat-filter').onchange = async (e) => {
        categoryFilter = e.target.value;
        await this.updateList(searchQuery, categoryFilter);
      };

      // Initial load
      await this.updateList(searchQuery, categoryFilter);
    },

    async updateList(search, category) {
      const S = POS.Store;
      const H = POS.Helpers;

      const list = await S.query('products', p => {
        if (category !== 'all' && p.categoryId !== category) return false;

        if (search) {
          const nameMatch = p.name.toLowerCase().includes(search);
          const skuMatch = p.sku.toLowerCase().includes(search);
          const barcodeMatch = p.barcode.includes(search);

          let varMatch = false;
          if (p.variations && p.variations.length > 0) {
            varMatch = p.variations.some(v =>
              v.name.toLowerCase().includes(search) ||
              v.sku.toLowerCase().includes(search) ||
              v.barcode.includes(search)
            );
          }

          if (!nameMatch && !skuMatch && !barcodeMatch && !varMatch) return false;
        }

        return true;
      });

      const container = document.getElementById('products-container');
      container.innerHTML = '';

      if (list.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1;" class="card">
            <div class="card-body text-center text-muted">
              ⚠️ No products found matching query.
            </div>
          </div>
        `;
        return;
      }

      const categories = await S.getAll('categories');

      list.forEach(p => {
        const isLowStock = p.stock <= (p.alertQty || 5);
        const stockBadge = isLowStock
          ? `<span class="badge badge-danger">Low Stock: ${p.stock}</span>`
          : `<span class="badge badge-success">Stock: ${p.stock}</span>`;

        let priceHtml = '';
        if (p.variations && p.variations.length > 0) {
          const prices = p.variations.map(v => v.price);
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          if (min === max) {
            priceHtml = H.formatCurrency(min);
          } else {
            priceHtml = `${H.formatCurrency(min)} - ${H.formatCurrency(max)}`;
          }
        } else {
          priceHtml = H.formatCurrency(p.sellingPrice);
        }

        const categoryObj = categories.find(c => c.id === p.categoryId);
        const categoryName = categoryObj ? categoryObj.name : 'Uncategorized';

        let imageHtml = `<div class="product-card-img">📦</div>`;
        if (p.image) {
          imageHtml = `<div class="product-card-img" style="padding:0; background:none;"><img src="${p.image}" style="width:100%; height:100%; object-fit:cover; border-top-left-radius:calc(var(--radius) - 2px); border-top-right-radius:calc(var(--radius) - 2px);"></div>`;
        }

        container.innerHTML += `
          <div class="product-card fade-in" data-id="${p.id}">
            ${imageHtml}
            <div class="product-card-body">
              <div class="product-card-name">${H.esc(p.name)}</div>
              <div class="product-card-sku">SKU: ${H.esc(p.sku)} | ${H.esc(categoryName)}</div>
              <div class="product-card-meta">
                <div class="product-card-price">${priceHtml}</div>
                <div class="product-card-stock">${stockBadge}</div>
              </div>
              ${p.variations && p.variations.length > 0 ? `
                <div class="text-muted text-sm mt-1" style="font-style:italic;">
                  Variations: ${p.variations.map(v => v.name).join(', ')}
                </div>
              ` : ''}
              <div class="product-card-actions" style="display:flex; gap:4px; flex-wrap:wrap;">
                <button class="btn btn-secondary btn-sm btn-edit-prod" style="flex:1; min-width:60px; padding:6px;">✏️ Edit</button>
                <button class="btn btn-secondary btn-sm btn-label-prod" style="flex:1; min-width:60px; padding:6px; color:var(--primary);">🏷️ Label</button>
                <button class="btn btn-secondary btn-sm btn-delete-prod" style="color:var(--danger); padding:6px;">🗑️</button>
              </div>
            </div>
          </div>
        `;
      });

      // Bind buttons
      container.querySelectorAll('.product-card').forEach(card => {
        const id = card.dataset.id;
        const p = list.find(prod => prod.id === id);

        card.querySelector('.btn-edit-prod').onclick = () => this.showAddEditModal(p);
        card.querySelector('.btn-label-prod').onclick = () => this.showLabelPrintModal(p);
        card.querySelector('.btn-delete-prod').onclick = async () => {
          if (await H.confirm(`Are you sure you want to delete product "${p.name}"?`)) {
            await S.delete('products', p.id);
            H.showToast('Product deleted from inventory.');
            await this.updateList(search, category);
          }
        };
      });
    },

    async showAddEditModal(p) {
      const S = POS.Store;
      const H = POS.Helpers;
      const overlay = document.getElementById('prod-modal-overlay');

      const isEdit = !!p;
      const title = isEdit ? 'Edit Product Details' : 'Add New Product';
      const categories = await S.getAll('categories');

      // Internal copy of variations to manipulate
      let currentVariations = isEdit && p.variations ? JSON.parse(JSON.stringify(p.variations)) : [];
      let activeImage = isEdit && p.image ? p.image : '';

      overlay.innerHTML = `
        <div class="modal animate" style="max-width:750px;">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" id="modal-close-prod">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group" style="flex: 2;">
                <label class="form-label">Product Name</label>
                <input type="text" class="form-input" id="p-name" value="${isEdit ? H.esc(p.name) : ''}">
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Category</label>
                <div style="display:flex; gap:8px;">
                  <select class="form-select" id="p-category" style="flex:1;">
                    ${categories.map(c => `<option value="${c.id}" ${isEdit && p.categoryId === c.id ? 'selected' : ''}>${H.esc(c.name)}</option>`).join('')}
                  </select>
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-add-quick-category" style="padding:0 12px; height:38px;" title="Create custom category">+</button>
                </div>
              </div>
            </div>

            <!-- Product Picture Section -->
            <div class="form-row" style="margin-bottom:15px;">
              <div class="form-group" style="width:100%;">
                <label class="form-label">Product Image Reference</label>
                <div style="display:flex; gap:16px; align-items:center; background:#f8fafc; padding:12px; border:1px solid var(--border); border-radius:var(--radius-sm);">
                  <div id="p-img-preview" style="width:75px; height:75px; border:1px solid var(--border); border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; overflow:hidden; font-size:26px; background:#fff;">
                    ${isEdit && p.image ? `<img src="${p.image}" style="width:100%; height:100%; object-fit:cover;">` : '📦'}
                  </div>
                  <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:12px; font-weight:600; color:var(--text-light)">Upload File:</span>
                      <input type="file" id="p-file-input" accept="image/*" style="font-size:12px;">
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-size:12px; font-weight:600; color:var(--text-light)">Or URL:</span>
                      <input type="text" class="form-input" id="p-image-url" placeholder="Paste image link URL..." value="${isEdit && p.image && !p.image.startsWith('data:') ? H.esc(p.image) : ''}" style="height:32px; font-size:12px; flex:1;">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Main SKU Code</label>
                <input type="text" class="form-input" id="p-sku" value="${isEdit ? H.esc(p.sku) : ''}">
              </div>
              <div class="form-group">
                <label class="form-label">Main Barcode</label>
                <input type="text" class="form-input" id="p-barcode" value="${isEdit ? H.esc(p.barcode) : ''}">
              </div>
            </div>

            <!-- Single Product Fields -->
            <div id="single-product-fields" style="border: 1px solid var(--border); padding:16px; border-radius:var(--radius-sm); margin-bottom:16px; background:#F8FAFC;">
              <h4 style="margin-bottom:12px;">💲 Pricing & Inventory (No Variations)</h4>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Cost Price (৳)</label>
                  <input type="number" class="form-input" id="p-cost" value="${isEdit ? p.costPrice : '0'}">
                </div>
                <div class="form-group">
                  <label class="form-label">Selling Price (৳)</label>
                  <input type="number" class="form-input" id="p-price" value="${isEdit ? p.sellingPrice : '0'}">
                </div>
                <div class="form-group">
                  <label class="form-label">Current Stock</label>
                  <input type="number" class="form-input" id="p-stock" value="${isEdit ? p.stock : '0'}">
                </div>
                <div class="form-group">
                  <label class="form-label">Low Stock Alert Qty</label>
                  <input type="number" class="form-input" id="p-alert" value="${isEdit ? p.alertQty : '5'}">
                </div>
              </div>
            </div>

            <!-- Variations Fields -->
            <div style="border: 1px solid var(--border); padding:16px; border-radius:var(--radius-sm); margin-bottom:16px;">
              <div class="flex justify-between items-center" style="margin-bottom:12px;">
                <h4>🎨 Product Variations (e.g. Size, Color)</h4>
                <button class="btn btn-secondary btn-sm" id="btn-add-var-row">+ Add Variation</button>
              </div>
              <div id="variation-rows-container"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-prod-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-prod-save">Save Product</button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = () => overlay.classList.remove('active');
      overlay.querySelector('#modal-close-prod').onclick = close;
      overlay.querySelector('#btn-prod-cancel').onclick = close;

      // Image inputs bindings
      const fileInput = overlay.querySelector('#p-file-input');
      const preview = overlay.querySelector('#p-img-preview');
      const urlInput = overlay.querySelector('#p-image-url');

      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const base64 = ev.target.result;
          preview.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover;">`;
          activeImage = base64;
          urlInput.value = '';
        };
        reader.readAsDataURL(file);
      };

      urlInput.oninput = (e) => {
        const url = e.target.value.trim();
        if (url) {
          preview.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;">`;
          activeImage = url;
        } else {
          preview.innerHTML = '📦';
          activeImage = '';
        }
      };

      overlay.querySelector('#btn-add-quick-category').onclick = async () => {
        const name = prompt('Enter customized category name:');
        if (!name || !name.trim()) return;

        const newCat = {
          id: 'cat_' + Math.random().toString(36).substr(2, 9),
          name: name.trim()
        };

        try {
          await S.add('categories', newCat);
          const select = overlay.querySelector('#p-category');
          const opt = document.createElement('option');
          opt.value = newCat.id;
          opt.textContent = newCat.name;
          opt.selected = true;
          select.appendChild(opt);
          H.showToast('Customized category added successfully');
        } catch (err) {
          H.showToast('Could not save category: ' + err.message, 'error');
        }
      };

      const container = overlay.querySelector('#variation-rows-container');
      const singleFields = overlay.querySelector('#single-product-fields');

      // Helper to render variation builders
      const renderVariationRows = () => {
        container.innerHTML = '';
        if (currentVariations.length === 0) {
          container.innerHTML = `<p class="text-muted text-sm text-center">No variations configured. This product will behave as a standard single entity.</p>`;
          singleFields.style.opacity = '1';
          singleFields.querySelectorAll('input').forEach(i => i.disabled = false);
          return;
        }

        // De-activate standard single pricing outputs to prevent conflicts
        singleFields.style.opacity = '0.5';
        singleFields.querySelectorAll('input').forEach(i => i.disabled = true);

        currentVariations.forEach((v, idx) => {
          container.innerHTML += `
            <div class="variation-row mb-1" data-index="${idx}">
              <div class="form-group">
                <label class="form-label">Variant Name (e.g. M - Red)</label>
                <input type="text" class="form-input var-name" value="${H.esc(v.name)}" placeholder="M - Red">
              </div>
              <div class="form-group">
                <label class="form-label">SKU</label>
                <input type="text" class="form-input var-sku" value="${H.esc(v.sku)}">
              </div>
              <div class="form-group">
                <label class="form-label">Barcode</label>
                <input type="text" class="form-input var-barcode" value="${H.esc(v.barcode)}">
              </div>
              <div class="form-group">
                <label class="form-label">Cost</label>
                <input type="number" class="form-input var-cost" value="${v.costPrice}">
              </div>
              <div class="form-group">
                <label class="form-label">Price</label>
                <input type="number" class="form-input var-price" value="${v.price}">
              </div>
              <div class="form-group">
                <label class="form-label">Stock</label>
                <input type="number" class="form-input var-stock" value="${v.stock}">
              </div>
              <button class="btn btn-danger btn-sm btn-remove-var-row" style="margin-bottom:2px; height: 38px;">🗑️</button>
            </div>
          `;
        });

        // Event hooks
        container.querySelectorAll('.variation-row').forEach(row => {
          const idx = parseInt(row.dataset.index);

          row.querySelector('.var-name').oninput = (e) => { currentVariations[idx].name = e.target.value; };
          row.querySelector('.var-sku').oninput = (e) => { currentVariations[idx].sku = e.target.value; };
          row.querySelector('.var-barcode').oninput = (e) => { currentVariations[idx].barcode = e.target.value; };
          row.querySelector('.var-cost').oninput = (e) => { currentVariations[idx].costPrice = parseFloat(e.target.value) || 0; };
          row.querySelector('.var-price').oninput = (e) => { currentVariations[idx].price = parseFloat(e.target.value) || 0; };
          row.querySelector('.var-stock').oninput = (e) => { currentVariations[idx].stock = parseInt(e.target.value) || 0; };

          row.querySelector('.btn-remove-var-row').onclick = () => {
            currentVariations.splice(idx, 1);
            renderVariationRows();
          };
        });
      };

      // Set up click events
      overlay.querySelector('#btn-add-var-row').onclick = () => {
        const baseSKU = overlay.querySelector('#p-sku').value || 'SKU';
        const num = currentVariations.length + 1;
        currentVariations.push({
          id: 'v_' + Math.random().toString(36).substr(2, 9),
          name: '',
          sku: `${baseSKU}-${num}`,
          barcode: '',
          costPrice: parseFloat(overlay.querySelector('#p-cost').value) || 0,
          price: parseFloat(overlay.querySelector('#p-price').value) || 0,
          stock: 0
        });
        renderVariationRows();
      };

      // Initial run
      renderVariationRows();

      // Save
      overlay.querySelector('#btn-prod-save').onclick = async () => {
        const name = overlay.querySelector('#p-name').value.trim();
        const categoryId = overlay.querySelector('#p-category').value;
        const sku = overlay.querySelector('#p-sku').value.trim();
        const barcode = overlay.querySelector('#p-barcode').value.trim();

        if (!name || !sku) {
          H.showToast('Product Name and SKU are required fields', 'error');
          return;
        }

        // Prepare data package
        const data = {
          name,
          categoryId,
          sku,
          barcode,
          image: activeImage,
          variations: currentVariations
        };

        if (currentVariations.length > 0) {
          // Verify variations are valid
          const invalid = currentVariations.some(v => !v.name);
          if (invalid) {
            H.showToast('Please specify names for all variations', 'error');
            return;
          }

          // Aggregated values
          data.costPrice = 0;
          data.sellingPrice = 0;
          data.stock = currentVariations.reduce((s, v) => s + v.stock, 0);
          data.alertQty = parseInt(overlay.querySelector('#p-alert').value) || 5;
        } else {
          // Standard single product
          data.costPrice = parseFloat(overlay.querySelector('#p-cost').value) || 0;
          data.sellingPrice = parseFloat(overlay.querySelector('#p-price').value) || 0;
          data.stock = parseInt(overlay.querySelector('#p-stock').value) || 0;
          data.alertQty = parseInt(overlay.querySelector('#p-alert').value) || 5;
        }

        if (isEdit) {
          await S.update('products', p.id, data);
          H.showToast('Product profile updated.');
        } else {
          await S.add('products', data);
          H.showToast('New product added to catalog.');
        }

        close();
        await this.render();
      };
    },

    showLabelPrintModal(p) {
      const H = POS.Helpers;
      let overlay = document.getElementById('prod-modal-overlay');
      if (!overlay) return;

      overlay.innerHTML = `
        <div class="modal animate" style="max-width:450px;">
          <div class="modal-header">
            <h3>🏷️ Print Product Label</h3>
            <button class="modal-close" id="modal-close-label-print">&times;</button>
          </div>
          <div class="modal-body">
            <p style="margin-bottom:12px; font-size:13px; color:#64748b">Configure barcode label details below for printing on 50mm x 30mm rolls.</p>
            
            ${p.variations && p.variations.length > 0 ? `
              <div class="form-group mb-2">
                <label class="form-label">Select Variation</label>
                <select class="form-select" id="lbl-variation">
                  <option value="main" data-sku="${H.esc(p.sku)}" data-barcode="${H.esc(p.barcode || p.sku)}" data-price="${p.sellingPrice}">Main Product (${H.esc(p.sku)})</option>
                  ${p.variations.map(v => `<option value="${v.id}" data-sku="${H.esc(v.sku || p.sku)}" data-barcode="${H.esc(v.barcode || v.sku || p.sku)}" data-price="${v.price}">${H.esc(v.name)} (${H.esc(v.sku)})</option>`).join('')}
                </select>
              </div>
            ` : `
              <input type="hidden" id="lbl-variation" value="main" data-sku="${H.esc(p.sku)}" data-barcode="${H.esc(p.barcode || p.sku)}" data-price="${p.sellingPrice}">
            `}
            
            <div class="form-group mb-2">
              <label class="form-label">Quantity to Print</label>
              <input type="number" class="form-input" id="lbl-qty" value="1" min="1" max="100">
            </div>
            
            <div style="border:1px solid var(--border); padding:16px; border-radius:var(--radius-sm); margin-top:16px; background:#f8fafc; display:flex; justify-content:center;">
              <div id="label-live-preview" class="product-label" style="background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.05);"></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-label-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-label-print-confirm">🖨️ Print Labels</button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = () => overlay.classList.remove('active');
      overlay.querySelector('#modal-close-label-print').onclick = close;
      overlay.querySelector('#btn-label-cancel').onclick = close;

      const select = overlay.querySelector('#lbl-variation');
      const qtyInput = overlay.querySelector('#lbl-qty');

      const updatePreview = () => {
        const opt = select.tagName === 'SELECT' 
          ? select.options[select.selectedIndex] 
          : select;
        
        const sku = opt.dataset.sku;
        const barcode = opt.dataset.barcode || sku;
        const price = parseFloat(opt.dataset.price);

        // Sanitize code for barcode39 rendering (uppercase, only supported characters)
        const cleanBarcode = barcode.toUpperCase().replace(/[^A-Z0-9\-\.\s\$\/\+\%]/g, '');
        const barcodeText = `*${cleanBarcode}*`;

        overlay.querySelector('#label-live-preview').innerHTML = `
          <div class="label-title">${H.esc(p.name)}</div>
          <div class="label-barcode">${H.esc(barcodeText)}</div>
          <div class="label-sku">SKU: ${H.esc(sku)}</div>
          <div class="label-price">${H.formatCurrency(price)}</div>
        `;
      };

      if (select.tagName === 'SELECT') {
        select.onchange = updatePreview;
      }
      updatePreview();

      overlay.querySelector('#btn-label-print-confirm').onclick = () => {
        const qty = parseInt(qtyInput.value) || 1;
        const opt = select.tagName === 'SELECT' ? select.options[select.selectedIndex] : select;
        const sku = opt.dataset.sku;
        const barcode = opt.dataset.barcode || sku;
        const price = parseFloat(opt.dataset.price);
        const cleanBarcode = barcode.toUpperCase().replace(/[^A-Z0-9\-\.\s\$\/\+\%]/g, '');
        const barcodeText = `*${cleanBarcode}*`;

        let printContent = '<div style="display:flex; flex-direction:column; gap:8mm; align-items:center; justify-content:center; padding:10px;">';
        for (let i = 0; i < qty; i++) {
          printContent += `
            <div class="product-label" style="page-break-after:always;">
              <div class="label-title">${H.esc(p.name)}</div>
              <div class="label-barcode">${H.esc(barcodeText)}</div>
              <div class="label-sku">SKU: ${H.esc(sku)}</div>
              <div class="label-price">${H.formatCurrency(price)}</div>
            </div>
          `;
        }
        printContent += '</div>';
        H.printHTML(printContent, `Labels ${p.name}`);
        close();
      };
    },

    async showManageCategoriesModal() {
      const S = POS.Store;
      const H = POS.Helpers;
      const overlay = document.getElementById('prod-modal-overlay');
      if (!overlay) return;

      const renderCats = async () => {
        const categories = await S.getAll('categories');
        const listContainer = overlay.querySelector('#cat-list-container');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (categories.length === 0) {
          listContainer.innerHTML = `<p class="text-muted text-sm text-center">No categories configured.</p>`;
          return;
        }

        categories.forEach(c => {
          listContainer.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-light); padding:8px 0; gap:12px;">
              <span style="font-weight:600; flex:1;">${H.esc(c.name)}</span>
              <button class="btn btn-secondary btn-sm btn-delete-cat" data-id="${c.id}" style="color:var(--danger); padding:4px 8px;">Delete</button>
            </div>
          `;
        });

        // Bind delete events
        listContainer.querySelectorAll('.btn-delete-cat').forEach(btn => {
          btn.onclick = async () => {
            const id = btn.dataset.id;
            const name = categories.find(c => c.id === id).name;
            if (await H.confirm(`Are you sure you want to delete category "${name}"? Existing products in this category will become uncategorized.`)) {
              const ok = await S.delete('categories', id);
              if (ok) {
                H.showToast(`Category "${name}" deleted.`);
                await renderCats();
              }
            }
          };
        });
      };

      overlay.innerHTML = `
        <div class="modal animate" style="max-width:450px;">
          <div class="modal-header">
            <h3>📁 Manage Categories</h3>
            <button class="modal-close" id="modal-close-cat-mgmt">&times;</button>
          </div>
          <div class="modal-body" style="display:flex; flex-direction:column; gap:16px;">
            <div style="display:flex; gap:8px; align-items:flex-end;">
              <div class="form-group" style="margin-bottom:0; flex:1;">
                <label class="form-label">New Category Name</label>
                <input type="text" class="form-input" id="new-cat-name" placeholder="Enter category name">
              </div>
              <button class="btn btn-primary" id="btn-add-cat-mgmt" style="height:38px;">Add</button>
            </div>
            
            <hr style="border:none; border-top:1px solid var(--border); margin:4px 0;">
            
            <h4 style="margin-bottom:4px;">Category List</h4>
            <div id="cat-list-container" style="max-height:250px; overflow-y:auto; padding-right:4px;"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-cat-mgmt-close">Close</button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = async () => {
        overlay.classList.remove('active');
        await this.render();
      };
      
      overlay.querySelector('#modal-close-cat-mgmt').onclick = close;
      overlay.querySelector('#btn-cat-mgmt-close').onclick = close;

      overlay.querySelector('#btn-add-cat-mgmt').onclick = async () => {
        const input = overlay.querySelector('#new-cat-name');
        const name = input.value.trim();
        if (!name) return;

        const newCat = {
          id: 'cat_' + Math.random().toString(36).substr(2, 9),
          name
        };

        try {
          await S.add('categories', newCat);
          input.value = '';
          H.showToast(`Category "${name}" added.`);
          await renderCats();
        } catch (err) {
          H.showToast('Could not save category: ' + err.message, 'error');
        }
      };

      await renderCats();
    }
  };

  window.POS = window.POS || {};
  window.POS.Products = Products;
})();
