(function () {
  'use strict';

  const Products = {
    currentTab: 'all',
    perPage: 10,
    currentPage: 1,
    searchQuery: '',
    categoryFilter: 'all',
    selectedProductIds: [],

    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      const categories = await S.getAll('categories');

      mc.innerHTML = `
        <style>
          /* Redesigned Product Catalog styling */
          .tab-container { display: flex; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid #edf2f7; padding-bottom: 10px; }
          .tab-btn { background: none; border: none; padding: 8px 16px; font-size: 13px; font-weight: 600; color: #718096; cursor: pointer; display: flex; align-items: center; gap: 6px; border-radius: 20px; transition: all 0.2s; }
          .tab-btn.active { background: #eff6ff; color: #2563eb; }
          .tab-count { font-size: 11px; background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 10px; font-weight: 700; }
          .tab-btn.active .tab-count { background: #3b82f6; color: #fff; }
          
          .catalog-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; margin-top: 10px; }
          .catalog-table th { font-size: 11px; font-weight: 700; color: #4a5568; text-transform: uppercase; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: left; letter-spacing: 0.5px; }
          .catalog-table tr.table-row { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04); border-radius: 8px; transition: transform 0.2s, box-shadow 0.2s; }
          .catalog-table tr.table-row:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); }
          .catalog-table td { padding: 16px; font-size: 13px; vertical-align: middle; color: #2d3748; border-top: 1px solid #f7fafc; border-bottom: 1px solid #edf2f7; }
          .catalog-table td:first-child { border-left: 1px solid #edf2f7; border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
          .catalog-table td:last-child { border-right: 1px solid #edf2f7; border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
          
          .prod-meta-wrap { display: flex; flex-direction: column; gap: 4px; }
          .prod-meta-name { font-weight: 700; font-size: 14px; color: #1a202c; text-decoration: none; display: block; }
          .prod-meta-name:hover { color: #2563eb; }
          .badge-status { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; width: fit-content; text-transform: uppercase; }
          .badge-status.publish { background: #d1fae5; color: #065f46; }
          .badge-status.draft { background: #f3f4f6; color: #374151; }
          .badge-priority { font-size: 10px; color: #718096; display: inline-flex; align-items: center; gap: 4px; margin-left: 8px; font-weight: 500; }
          
          .stock-box, .price-box { display: flex; flex-direction: column; gap: 6px; width: 100%; min-width: 180px; }
          .variant-item { display: flex; justify-content: space-between; gap: 12px; background: #f8fafc; padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; font-size: 11px; }
          .variant-item-lbl { color: #475569; font-weight: 500; }
          .variant-item-val { font-weight: 700; color: #0f172a; }
          .stock-green { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
          .stock-green .variant-item-val { color: #047857; }
          
          .btn-more-variants { background: none; border: none; color: #2563eb; font-size: 11px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 2px 4px; margin-top: 2px; }
          
          .actions-cell-wrap { position: relative; display: flex; justify-content: center; }
          .action-btn-trigger { background: none; border: none; padding: 8px; border-radius: 50%; color: #718096; cursor: pointer; transition: background 0.2s; }
          .action-btn-trigger:hover { background: #edf2f7; color: #2d3748; }
          
          .action-popup { position: absolute; right: 0; top: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: var(--radius-sm); box-shadow: var(--shadow-md); z-index: 100; min-width: 150px; display: none; flex-direction: column; padding: 4px 0; }
          .action-popup.open { display: flex; }
          .action-popup-item { background: none; border: none; padding: 8px 16px; font-size: 12px; text-align: left; color: #4a5568; cursor: pointer; width: 100%; transition: background 0.2s; display: flex; align-items: center; gap: 8px; }
          .action-popup-item:hover { background: #f7fafc; color: #2d3748; }
          .action-popup-item.danger:hover { background: #fff5f5; color: #c53030; }

          .scanner-guide-btn { display: inline-flex; align-items: center; gap: 6px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; cursor: pointer; height: 38px; }
          .scanner-guide-btn:hover { background: #dbeafe; }
          
          .pagination-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding: 12px 16px; background: #fff; border-radius: 8px; border: 1px solid #edf2f7; }
        </style>

        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">📦 Product Catalog</h2>
            <p class="page-subtitle">Add variations (colors, sizes), track individual costs, barcode identifiers, and adjust inventory.</p>
          </div>
          <div class="page-actions" style="display:flex; gap:8px; align-items:center;">
            <button class="btn btn-secondary btn-sm" id="btn-export-csv">📥 Export CSV</button>
            <label class="btn btn-secondary btn-sm" style="cursor:pointer; margin-bottom:0; display:inline-flex; align-items:center; height:34px; padding:0 12px; font-weight:600; font-size:12px; border-radius:var(--radius-sm);">
              📤 Import CSV / Excel
              <input type="file" id="file-import-csv" accept=".csv,.xlsx,.xls" style="display:none;">
            </label>
            <button class="btn btn-secondary btn-sm" id="btn-manage-categories">📁 Categories</button>
            <button class="btn btn-primary btn-sm" id="btn-add-product">+ Add Product</button>
          </div>
        </div>

        <div class="tab-container fade-in">
          <button class="tab-btn active" id="tab-all" data-tab="all">
            All Data <span class="tab-count" id="count-all">0</span>
          </button>
          <button class="tab-btn" id="tab-publish" data-tab="Publish">
            Publish <span class="tab-count" id="count-publish">0</span>
          </button>
          <button class="tab-btn" id="tab-draft" data-tab="Draft">
            Draft <span class="tab-count" id="count-draft">0</span>
          </button>
          <button class="tab-btn" id="tab-trash" data-tab="Trash" style="color: #ef4444;">
            🗑️ Trash <span class="tab-count" id="count-trash" style="background:#fee2e2; color:#b91c1c;">0</span>
          </button>
        </div>

        <div class="filter-bar fade-in" style="display:flex; justify-content:space-between; align-items:center; gap:16px;">
          <div class="search-box" style="flex:2;">
            <input type="text" id="prod-search" placeholder="Search by name, SKU, or barcode...">
          </div>
          <div class="form-group" style="margin-bottom:0; flex:1; min-width:180px;">
            <select class="form-select" id="prod-cat-filter">
              <option value="all">All Categories</option>
              ${categories.map(c => `<option value="${c.id}">${H.esc(c.name)}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <select class="form-select" id="prod-per-page" style="width:120px; height:38px; font-size:12px; margin-bottom:0;">
              <option value="10">10 Per Page</option>
              <option value="20">20 Per Page</option>
              <option value="50">50 Per Page</option>
              <option value="100">100 Per Page</option>
            </select>
            <select class="form-select" id="prod-bulk-actions" style="width:140px; height:38px; font-size:12px; margin-bottom:0;">
              <option value="">Bulk Actions</option>
              <option value="publish">Publish Selected</option>
              <option value="draft">Draft Selected</option>
              <option value="delete">Trash Selected</option>
              <option value="restore">Restore Selected</option>
              <option value="delete_perm">Delete Permanently</option>
            </select>
          </div>
        </div>

        <div class="table-container fade-in" style="overflow-x:auto;">
          <table class="catalog-table">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;"><input type="checkbox" id="chk-select-all"></th>
                <th style="width:60px;">SL</th>
                <th style="width:85px;">Image</th>
                <th>Name</th>
                <th>Category</th>
                <th style="width:230px;">Stock</th>
                <th style="width:230px;">Purchase Price</th>
                <th style="width:100px; text-align:center;">Actions</th>
              </tr>
            </thead>
            <tbody id="products-table-body">
              <!-- Rendered via updateList -->
            </tbody>
          </table>
        </div>

        <div class="pagination-bar fade-in" id="catalog-pagination">
          <!-- Rendered via updateList -->
        </div>

        <div class="modal-overlay" id="prod-modal-overlay"></div>
      `;

      // Event handlers
      document.getElementById('btn-add-product').onclick = () => this.showAddEditModal(null);
      document.getElementById('btn-manage-categories').onclick = () => this.showManageCategoriesModal();

      document.getElementById('btn-export-csv').onclick = async () => {
        const res = await fetch(`${window.location.origin}/api/products?includeTrashed=true`, {
          headers: S.getHeaders()
        });
        const list = await res.json();
        const categoriesList = await S.getAll('categories');
        const csvData = [];

        list.forEach(p => {
          const cat = categoriesList.find(c => c.id === p.categoryId);
          const catName = cat ? cat.name : 'Uncategorized';
          const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const tags = p.tag || '';

          if (p.variations && p.variations.length > 0) {
            p.variations.forEach(v => {
              let varName = 'Size';
              let varValue = v.name;
              if (v.name.includes(':')) {
                const parts = v.name.split(':');
                varName = parts[0].trim();
                varValue = parts.slice(1).join(':').trim();
              }

              csvData.push({
                'name': p.name,
                'slug': slug,
                'category': catName,
                'tags': tags,
                'sku': p.sku,
                'salePrice': p.sellingPrice,
                'regular_price': p.sellingPrice,
                'costPrice': p.costPrice,
                'quantity': 0,
                'variation_name': varName,
                'variation_value': varValue,
                'variation_sku': v.sku,
                'variation_cost_price': v.costPrice,
                'variation_sales_price': v.price,
                'variation_regular_price': v.price,
                'variation_quantity': v.stock
              });
            });
          } else {
            csvData.push({
              'name': p.name,
              'slug': slug,
              'category': catName,
              'tags': tags,
              'sku': p.sku,
              'salePrice': p.sellingPrice,
              'regular_price': p.sellingPrice,
              'costPrice': p.costPrice,
              'quantity': 0,
              'variation_name': '',
              'variation_value': '',
              'variation_sku': '',
              'variation_cost_price': '',
              'variation_sales_price': '',
              'variation_regular_price': '',
              'variation_quantity': ''
            });
          }
        });

        H.exportCSV(csvData, 'products_export');
      };

      document.getElementById('file-import-csv').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        const reader = new FileReader();

        reader.onload = async (ev) => {
          try {
            let rows = [];
            if (isExcel) {
              const data = new Uint8Array(ev.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            } else {
              const csvText = ev.target.result;
              rows = H.parseCSV(csvText);
            }

            if (rows.length === 0) {
              H.showToast('Import file is empty or invalid', 'error');
              return;
            }

            const productsMap = {};

            rows.forEach(r => {
              const skuRaw = (r['sku'] || r['SKU'] || '').toString().trim();
              if (!skuRaw) return;

              const name = (r['name'] || r['Product Name'] || r['Product'] || '').toString().trim();
              const category = (r['category'] || r['Category Name'] || r['categoryName'] || '').toString().trim();
              const tags = (r['tags'] || r['Tags'] || r['tag'] || r['Tag'] || '').toString().trim();
              
              const salePrice = parseFloat(r['salePrice'] || r['sale_price'] || r['regular_price'] || r['regularPrice'] || r['Selling Price'] || r['price'] || r['sales_price'] || 0);
              const costPrice = parseFloat(r['costPrice'] || r['cost_price'] || r['Cost Price'] || r['cost'] || 0);
              const quantity = parseInt(r['quantity'] || r['Quantity'] || r['stock'] || r['Stock'] || 0);
              const barcode = (r['barcode'] || r['Barcode'] || '').toString().trim();

              if (!productsMap[skuRaw]) {
                productsMap[skuRaw] = {
                  name: name || `Product ${skuRaw}`,
                  sku: skuRaw,
                  barcode: barcode || null,
                  categoryName: category || 'Uncategorized',
                  tag: tags || null,
                  costPrice: costPrice,
                  sellingPrice: salePrice,
                  stock: quantity,
                  alertQty: 5,
                  variations: []
                };
              }

              const varName = (r['variation_name'] || r['variationName'] || r['Variation Name'] || '').toString().trim();
              const varValue = (r['variation_value'] || r['variationValue'] || r['Variation Value'] || '').toString().trim();

              if (varName || varValue) {
                productsMap[skuRaw].stock = 0;

                const varSkuRaw = (r['variation_sku'] || r['variationSku'] || r['Variation SKU'] || '').toString().trim();
                let varSku = varSkuRaw;
                if (!varSku || varSku === skuRaw) {
                  varSku = `${skuRaw}-${varValue}`;
                }

                const varCost = parseFloat(r['variation_cost_price'] || r['variationCostPrice'] || costPrice);
                const varPrice = parseFloat(r['variation_sales_price'] || r['variationSalesPrice'] || r['variation_regular_price'] || salePrice);
                const varQty = parseInt(r['variation_quantity'] || r['variationQuantity'] || 0);

                const combinedVarName = varName && varValue ? `${varName}: ${varValue}` : (varValue || varName);

                productsMap[skuRaw].variations.push({
                  name: combinedVarName,
                  sku: varSku,
                  barcode: null,
                  price: varPrice,
                  costPrice: varCost,
                  stock: varQty
                });
              }
            });

            const productsToImport = Object.values(productsMap);

            if (productsToImport.length === 0) {
              H.showToast('No valid product rows with SKU found', 'error');
              return;
            }

            const res = await fetch(`${window.location.origin}/api/products/bulk`, {
              method: 'POST',
              headers: S.getHeaders(),
              body: JSON.stringify(productsToImport)
            });

            if (res.ok) {
              H.showToast(`Imported/Updated ${productsToImport.length} products successfully!`);
              await this.render();
            } else {
              const err = await res.json();
              H.showToast(err.error || 'Import failed', 'error');
            }
          } catch (err) {
            console.error('Import Error:', err);
            H.showToast('Invalid file format or sheet structure', 'error');
          }
        };

        if (isExcel) {
          reader.readAsArrayBuffer(file);
        } else {
          reader.readAsText(file);
        }
      };

      document.getElementById('prod-search').oninput = H.debounce(async (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.currentPage = 1;
        await this.updateList();
      }, 200);

      document.getElementById('prod-cat-filter').onchange = async (e) => {
        this.categoryFilter = e.target.value;
        this.currentPage = 1;
        await this.updateList();
      };

      document.getElementById('prod-per-page').onchange = async (e) => {
        this.perPage = parseInt(e.target.value) || 10;
        this.currentPage = 1;
        await this.updateList();
      };

      // Tab handlers
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = async () => {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentTab = btn.dataset.tab;
          this.currentPage = 1;
          this.selectedProductIds = [];
          document.getElementById('chk-select-all').checked = false;
          await this.updateList();
        };
      });



      // Bulk Actions handler
      document.getElementById('prod-bulk-actions').onchange = async (e) => {
        const action = e.target.value;
        if (!action) return;

        if (this.selectedProductIds.length === 0) {
          H.showToast('No products selected!', 'error');
          e.target.value = '';
          return;
        }

        let confirmMsg = `Are you sure you want to run this bulk action on ${this.selectedProductIds.length} items?`;
        if (action === 'delete_perm') {
          confirmMsg = `⚠️ WARNING: This will permanently delete ${this.selectedProductIds.length} items. This cannot be undone!`;
        }

        if (await H.confirm(confirmMsg)) {
          H.showToast('Processing bulk action...');
          for (const pid of this.selectedProductIds) {
            try {
              if (action === 'publish' || action === 'draft') {
                const pRes = await fetch(`${window.location.origin}/api/products?includeTrashed=true`, { headers: S.getHeaders() });
                const list = await pRes.json();
                const product = list.find(prod => prod.id === pid);
                if (product) {
                  product.status = action === 'publish' ? 'Publish' : 'Draft';
                  await fetch(`${window.location.origin}/api/products/${pid}`, {
                    method: 'PUT',
                    headers: S.getHeaders(),
                    body: JSON.stringify(product)
                  });
                }
              } else if (action === 'delete') {
                await fetch(`${window.location.origin}/api/products/${pid}`, { method: 'DELETE', headers: S.getHeaders() });
              } else if (action === 'delete_perm') {
                await fetch(`${window.location.origin}/api/products/${pid}?permanent=true`, { method: 'DELETE', headers: S.getHeaders() });
              } else if (action === 'restore') {
                await fetch(`${window.location.origin}/api/products/${pid}/restore`, { method: 'POST', headers: S.getHeaders() });
              }
            } catch (err) {
              console.error('Bulk error:', err);
            }
          }
          H.showToast('Bulk action completed.');
          this.selectedProductIds = [];
          document.getElementById('chk-select-all').checked = false;
          await this.render();
        }
        e.target.value = '';
      };

      // Select All checkbox
      document.getElementById('chk-select-all').onclick = (e) => {
        const checkboxes = document.querySelectorAll('.chk-prod-item');
        this.selectedProductIds = [];
        checkboxes.forEach(chk => {
          chk.checked = e.target.checked;
          if (chk.checked) {
            this.selectedProductIds.push(chk.dataset.id);
          }
        });
      };

      // Close popups when clicking anywhere else
      document.addEventListener('click', (ev) => {
        if (!ev.target.closest('.actions-cell-wrap')) {
          document.querySelectorAll('.action-popup').forEach(pop => pop.classList.remove('open'));
        }
      });

      // Initial load
      await this.updateList();
    },

    async updateList() {
      const S = POS.Store;
      const H = POS.Helpers;

      const res = await fetch(`${window.location.origin}/api/products?includeTrashed=true`, {
        headers: S.getHeaders()
      });
      const allProducts = await res.json();
      const categories = await S.getAll('categories');

      // Calculate count metrics for tabs
      const totalAll = allProducts.filter(p => !p.deletedAt || p.deletedAt === '0000-00-00 00:00:00').length;
      const totalPublish = allProducts.filter(p => (!p.deletedAt || p.deletedAt === '0000-00-00 00:00:00') && p.status === 'Publish').length;
      const totalDraft = allProducts.filter(p => (!p.deletedAt || p.deletedAt === '0000-00-00 00:00:00') && p.status === 'Draft').length;
      const totalTrash = allProducts.filter(p => p.deletedAt && p.deletedAt !== '0000-00-00 00:00:00').length;

      document.getElementById('count-all').innerText = totalAll;
      document.getElementById('count-publish').innerText = totalPublish;
      document.getElementById('count-draft').innerText = totalDraft;
      document.getElementById('count-trash').innerText = totalTrash;

      let filtered = allProducts;
      if (this.currentTab === 'all') {
        filtered = allProducts.filter(p => !p.deletedAt || p.deletedAt === '0000-00-00 00:00:00');
      } else if (this.currentTab === 'Publish') {
        filtered = allProducts.filter(p => (!p.deletedAt || p.deletedAt === '0000-00-00 00:00:00') && p.status === 'Publish');
      } else if (this.currentTab === 'Draft') {
        filtered = allProducts.filter(p => (!p.deletedAt || p.deletedAt === '0000-00-00 00:00:00') && p.status === 'Draft');
      } else if (this.currentTab === 'Trash') {
        filtered = allProducts.filter(p => p.deletedAt && p.deletedAt !== '0000-00-00 00:00:00');
      }

      if (this.categoryFilter !== 'all') {
        filtered = filtered.filter(p => p.categoryId === this.categoryFilter);
      }

      if (this.searchQuery) {
        filtered = filtered.filter(p => {
          const nameMatch = p.name.toLowerCase().includes(this.searchQuery);
          const skuMatch = p.sku.toLowerCase().includes(this.searchQuery);
          const barcodeMatch = p.barcode ? p.barcode.includes(this.searchQuery) : false;
          const tagMatch = p.tag ? p.tag.toLowerCase().includes(this.searchQuery) : false;

          let varMatch = false;
          if (p.variations && p.variations.length > 0) {
            varMatch = p.variations.some(v =>
              v.name.toLowerCase().includes(this.searchQuery) ||
              v.sku.toLowerCase().includes(this.searchQuery)
            );
          }
          return nameMatch || skuMatch || barcodeMatch || tagMatch || varMatch;
        });
      }

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / this.perPage) || 1;

      if (this.currentPage > totalPages) this.currentPage = totalPages;
      if (this.currentPage < 1) this.currentPage = 1;

      const startIndex = (this.currentPage - 1) * this.perPage;
      const pageItems = filtered.slice(startIndex, startIndex + this.perPage);

      const tableBody = document.getElementById('products-table-body');
      tableBody.innerHTML = '';

      if (pageItems.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="text-muted text-center" style="padding: 30px;">
              ⚠️ No products found in this category or search selection.
            </td>
          </tr>
        `;
        document.getElementById('catalog-pagination').innerHTML = '';
        return;
      }

      pageItems.forEach((p, idx) => {
        const serialNo = startIndex + idx + 1;
        const categoryObj = categories.find(c => c.id === p.categoryId);
        const categoryName = categoryObj ? categoryObj.name : 'Uncategorized';

        const statusClass = p.status === 'Publish' ? 'publish' : 'draft';
        const statusBadge = `<span class="badge-status ${statusClass}">${p.status || 'Publish'}</span>`;
        const priorityBadge = p.priority > 0 ? `<span class="badge-priority">⭐ Priority: ${p.priority}</span>` : '';

        let imgHtml = `<span style="font-size: 24px;">📦</span>`;
        if (p.image) {
          imgHtml = `<img src="${p.image}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 6px; border: 1px solid #edf2f7;">`;
        }

        let stockHtml = '';
        if (p.variations && p.variations.length > 0) {
          const varList = p.variations;
          const displayLimit = 2;
          const showMore = varList.length > displayLimit;

          stockHtml += `<div class="stock-box">`;
          varList.forEach((v, vIdx) => {
            const cls = vIdx >= displayLimit ? 'variant-item stock-green extra-var-stock' : 'variant-item stock-green';
            const style = vIdx >= displayLimit ? 'style="display:none;"' : '';
            stockHtml += `
              <div class="${cls}" ${style}>
                <span class="variant-item-lbl">${H.esc(v.name)}</span>
                <span class="variant-item-val">${v.stock}</span>
              </div>
            `;
          });
          if (showMore) {
            stockHtml += `
              <button class="btn-more-variants btn-toggle-stock" data-expanded="false">
                +${varList.length - displayLimit} more ▾
              </button>
            `;
          }
          stockHtml += `</div>`;
        } else {
          const isLowStock = p.stock <= (p.alertQty || 5);
          const stockClass = isLowStock ? 'style="background:#fef2f2; border-color:#fecaca; color:#991b1b;"' : '';
          stockHtml = `
            <div class="variant-item" ${stockClass}>
              <span class="variant-item-lbl">Standard</span>
              <span class="variant-item-val">${p.stock}</span>
            </div>
          `;
        }

        let priceHtml = '';
        if (p.variations && p.variations.length > 0) {
          const varList = p.variations;
          const displayLimit = 2;
          const showMore = varList.length > displayLimit;

          priceHtml += `<div class="price-box">`;
          varList.forEach((v, vIdx) => {
            const cls = vIdx >= displayLimit ? 'variant-item extra-var-price' : 'variant-item';
            const style = vIdx >= displayLimit ? 'style="display:none;"' : '';
            priceHtml += `
              <div class="${cls}" ${style}>
                <span class="variant-item-lbl">${H.esc(v.name)}</span>
                <span class="variant-item-val">৳ ${v.price}</span>
              </div>
            `;
          });
          if (showMore) {
            priceHtml += `
              <button class="btn-more-variants btn-toggle-price" data-expanded="false">
                +${varList.length - displayLimit} more ▾
              </button>
            `;
          }
          priceHtml += `</div>`;
        } else {
          priceHtml = `
            <div class="variant-item">
              <span class="variant-item-lbl">Standard</span>
              <span class="variant-item-val">৳ ${p.sellingPrice}</span>
            </div>
          `;
        }

        const isSelected = this.selectedProductIds.includes(p.id) ? 'checked' : '';
        tableBody.innerHTML += `
          <tr class="table-row">
            <td style="text-align:center;"><input type="checkbox" class="chk-prod-item" data-id="${p.id}" ${isSelected}></td>
            <td style="font-weight:700; color:#718096;">${serialNo}</td>
            <td>${imgHtml}</td>
            <td>
              <div class="prod-meta-wrap">
                <a href="javascript:void(0)" class="prod-meta-name" data-id="${p.id}">${H.esc(p.name)}</a>
                <div style="display:flex; align-items:center;">
                  ${statusBadge}
                  ${priorityBadge}
                </div>
              </div>
            </td>
            <td style="font-weight:600; color:#4a5568;">${H.esc(categoryName)}</td>
            <td>${stockHtml}</td>
            <td>${priceHtml}</td>
            <td>
              <div class="actions-cell-wrap">
                <button class="action-btn-trigger">⋮</button>
                <div class="action-popup">
                  ${(!p.deletedAt || p.deletedAt === '0000-00-00 00:00:00') ? `
                    <button class="action-popup-item btn-edit-opt" data-id="${p.id}">✏️ Edit Details</button>
                    <button class="action-popup-item btn-label-opt" data-id="${p.id}">🏷️ Print Label</button>
                    <button class="action-popup-item danger btn-delete-opt" data-id="${p.id}">🗑️ Move to Trash</button>
                  ` : `
                    <button class="action-popup-item btn-restore-opt" data-id="${p.id}">↩️ Restore Product</button>
                    <button class="action-popup-item danger btn-delete-perm-opt" data-id="${p.id}">❌ Delete Permanently</button>
                  `}
                </div>
              </div>
            </td>
          </tr>
        `;
      });

      // Bind triggers
      document.querySelectorAll('.action-btn-trigger').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const popup = btn.nextElementSibling;
          const open = popup.classList.contains('open');
          document.querySelectorAll('.action-popup').forEach(pop => pop.classList.remove('open'));
          if (!open) popup.classList.add('open');
        };
      });

      document.querySelectorAll('.chk-prod-item').forEach(chk => {
        chk.onclick = () => {
          const pid = chk.dataset.id;
          if (chk.checked) {
            if (!this.selectedProductIds.includes(pid)) this.selectedProductIds.push(pid);
          } else {
            this.selectedProductIds = this.selectedProductIds.filter(id => id !== pid);
          }
        };
      });

      document.querySelectorAll('.prod-meta-name').forEach(link => {
        link.onclick = () => {
          const p = allProducts.find(prod => prod.id === link.dataset.id);
          this.showAddEditModal(p);
        };
      });

      document.querySelectorAll('.btn-edit-opt').forEach(btn => {
        btn.onclick = () => {
          const p = allProducts.find(prod => prod.id === btn.dataset.id);
          this.showAddEditModal(p);
        };
      });

      document.querySelectorAll('.btn-label-opt').forEach(btn => {
        btn.onclick = () => {
          const p = allProducts.find(prod => prod.id === btn.dataset.id);
          POS.LabelPrinter.selectedProducts = [];
          POS.LabelPrinter.addProduct(p, false);
          POS.Router.navigate('/label-printer');
        };
      });

      document.querySelectorAll('.btn-delete-opt').forEach(btn => {
        btn.onclick = async () => {
          const p = allProducts.find(prod => prod.id === btn.dataset.id);
          if (await H.confirm(`Are you sure you want to move "${p.name}" to Trash? It will stay in Trash for 30 days.`)) {
            await fetch(`${window.location.origin}/api/products/${p.id}`, {
              method: 'DELETE',
              headers: S.getHeaders()
            });
            H.showToast(`"${p.name}" moved to Trash.`);
            await this.render();
          }
        };
      });

      document.querySelectorAll('.btn-restore-opt').forEach(btn => {
        btn.onclick = async () => {
          const p = allProducts.find(prod => prod.id === btn.dataset.id);
          await fetch(`${window.location.origin}/api/products/${p.id}/restore`, {
            method: 'POST',
            headers: S.getHeaders()
          });
          H.showToast(`"${p.name}" restored to inventory.`);
          await this.render();
        };
      });

      document.querySelectorAll('.btn-delete-perm-opt').forEach(btn => {
        btn.onclick = async () => {
          const p = allProducts.find(prod => prod.id === btn.dataset.id);
          if (await H.confirm(`⚠️ WARNING: Are you sure you want to permanently delete "${p.name}"? This action CANNOT be undone.`)) {
            await fetch(`${window.location.origin}/api/products/${p.id}?permanent=true`, {
              method: 'DELETE',
              headers: S.getHeaders()
            });
            H.showToast(`"${p.name}" deleted permanently.`);
            await this.render();
          }
        };
      });

      document.querySelectorAll('.btn-toggle-stock').forEach(btn => {
        btn.onclick = () => {
          const parent = btn.parentElement;
          const extra = parent.querySelectorAll('.extra-var-stock');
          const isExpanded = btn.dataset.expanded === 'true';

          if (isExpanded) {
            extra.forEach(el => el.style.display = 'none');
            btn.innerHTML = `+${extra.length} more ▾`;
            btn.dataset.expanded = 'false';
          } else {
            extra.forEach(el => el.style.display = 'flex');
            btn.innerHTML = `Show less ▴`;
            btn.dataset.expanded = 'true';
          }
        };
      });

      document.querySelectorAll('.btn-toggle-price').forEach(btn => {
        btn.onclick = () => {
          const parent = btn.parentElement;
          const extra = parent.querySelectorAll('.extra-var-price');
          const isExpanded = btn.dataset.expanded === 'true';

          if (isExpanded) {
            extra.forEach(el => el.style.display = 'none');
            btn.innerHTML = `+${extra.length} more ▾`;
            btn.dataset.expanded = 'false';
          } else {
            extra.forEach(el => el.style.display = 'flex');
            btn.innerHTML = `Show less ▴`;
            btn.dataset.expanded = 'true';
          }
        };
      });

      const pagination = document.getElementById('catalog-pagination');
      if (totalPages > 1) {
        let pagHtml = `
          <div style="font-size:12px; color:#718096; font-weight:600;">
            Showing ${startIndex + 1} - ${Math.min(startIndex + this.perPage, totalItems)} of ${totalItems} products
          </div>
          <div style="display:flex; gap:6px;">
        `;
        if (this.currentPage > 1) {
          pagHtml += `<button class="btn btn-secondary btn-sm" id="btn-pag-prev" style="padding:4px 10px;">◀ Prev</button>`;
        }
        pagHtml += `<span style="font-size:13px; font-weight:700; color:#4a5568; align-self:center; margin:0 8px;">Page ${this.currentPage} of ${totalPages}</span>`;
        if (this.currentPage < totalPages) {
          pagHtml += `<button class="btn btn-secondary btn-sm" id="btn-pag-next" style="padding:4px 10px;">Next ▶</button>`;
        }
        pagHtml += `</div>`;
        pagination.innerHTML = pagHtml;

        const prevBtn = document.getElementById('btn-pag-prev');
        if (prevBtn) {
          prevBtn.onclick = async () => {
            this.currentPage--;
            await this.updateList();
          };
        }
        const nextBtn = document.getElementById('btn-pag-next');
        if (nextBtn) {
          nextBtn.onclick = async () => {
            this.currentPage++;
            await this.updateList();
          };
        }
      } else {
        pagination.innerHTML = `
          <div style="font-size:12px; color:#718096; font-weight:600;">
            Showing all ${totalItems} products
          </div>
        `;
      }
    },

    async showAddEditModal(p) {
      const S = POS.Store;
      const H = POS.Helpers;
      const overlay = document.getElementById('prod-modal-overlay');

      const isEdit = !!p;
      const title = isEdit ? 'Edit Product Details' : 'Add New Product';
      const categories = await S.getAll('categories');

      let currentVariations = isEdit && p.variations ? JSON.parse(JSON.stringify(p.variations)) : [];
      let activeImage = isEdit && p.image ? p.image : '';

      overlay.innerHTML = `
        <div class="modal animate" style="max-width:750px;">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" id="modal-close-prod">&times;</button>
          </div>
          <div class="modal-body" style="max-height: 480px; overflow-y: auto;">
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
              <div class="form-group">
                <label class="form-label">Tag Name (Optional)</label>
                <input type="text" class="form-input" id="p-tag" value="${isEdit ? H.esc(p.tag || '') : ''}" placeholder="e.g. summer, offer, promo">
              </div>
            </div>

            <div class="form-row">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Publish Status</label>
                <select class="form-select" id="p-status">
                  <option value="Publish" ${isEdit && p.status === 'Publish' ? 'selected' : ''}>Publish</option>
                  <option value="Draft" ${isEdit && p.status === 'Draft' ? 'selected' : ''}>Draft</option>
                </select>
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Priority (Default: 0)</label>
                <input type="number" class="form-input" id="p-priority" value="${isEdit ? parseInt(p.priority) || 0 : 0}" min="0">
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
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h4>🎨 Product Variations (e.g. Size, Color)</h4>
                <button class="btn btn-secondary btn-sm" id="btn-add-var-row" type="button">+ Add Variation</button>
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
        const name = await H.prompt('Enter new category name:');
        if (!name) return;
        const newCat = {
          id: 'cat_' + Math.random().toString(36).substr(2, 9),
          name
        };
        try {
          await S.add('categories', newCat);
          const sel = overlay.querySelector('#p-category');
          sel.innerHTML += `<option value="${newCat.id}" selected>${H.esc(newCat.name)}</option>`;
          H.showToast(`Category "${newCat.name}" created.`);
        } catch (err) {
          H.showToast('Could not save category', 'error');
        }
      };

      const renderVariations = () => {
        const container = overlay.querySelector('#variation-rows-container');
        container.innerHTML = '';
        if (currentVariations.length === 0) {
          container.innerHTML = `<p class="text-muted text-sm text-center py-2">No variations defined.</p>`;
          overlay.querySelector('#single-product-fields').style.display = 'block';
          return;
        }

        overlay.querySelector('#single-product-fields').style.display = 'none';

        currentVariations.forEach((v, index) => {
          container.innerHTML += `
            <div class="var-row" data-id="${v.id || ''}" style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
              <input type="text" class="form-input var-name-input" placeholder="Name (e.g. Size: M)" value="${H.esc(v.name)}" style="flex:2;">
              <input type="text" class="form-input var-sku-input" placeholder="SKU" value="${H.esc(v.sku)}" style="flex:2;">
              <input type="number" class="form-input var-cost-input" placeholder="Cost" value="${v.costPrice}" style="flex:1;">
              <input type="number" class="form-input var-price-input" placeholder="Price" value="${v.price}" style="flex:1;">
              <input type="number" class="form-input var-stock-input" placeholder="Stock" value="${v.stock}" style="flex:1;">
              <button type="button" class="btn btn-secondary btn-sm btn-remove-var" data-index="${index}" style="color:var(--danger); padding:0 8px; height:38px;">&times;</button>
            </div>
          `;
        });

        container.querySelectorAll('.btn-remove-var').forEach(btn => {
          btn.onclick = () => {
            const idx = parseInt(btn.dataset.index);
            saveCurrentVariationInputs();
            currentVariations.splice(idx, 1);
            renderVariations();
          };
        });
      };

      const saveCurrentVariationInputs = () => {
        const rows = overlay.querySelectorAll('.var-row');
        rows.forEach((row, index) => {
          if (currentVariations[index]) {
            currentVariations[index].name = row.querySelector('.var-name-input').value.trim();
            currentVariations[index].sku = row.querySelector('.var-sku-input').value.trim();
            currentVariations[index].costPrice = parseFloat(row.querySelector('.var-cost-input').value) || 0;
            currentVariations[index].price = parseFloat(row.querySelector('.var-price-input').value) || 0;
            currentVariations[index].stock = parseInt(row.querySelector('.var-stock-input').value) || 0;
          }
        });
      };

      overlay.querySelector('#btn-add-var-row').onclick = () => {
        saveCurrentVariationInputs();
        currentVariations.push({
          id: 'var_' + Math.random().toString(36).substr(2, 9),
          name: '',
          sku: '',
          costPrice: parseFloat(overlay.querySelector('#p-cost').value) || 0,
          price: parseFloat(overlay.querySelector('#p-price').value) || 0,
          stock: 0
        });
        renderVariations();
      };

      overlay.querySelector('#btn-prod-save').onclick = async () => {
        const name = overlay.querySelector('#p-name').value.trim();
        const categoryId = overlay.querySelector('#p-category').value;
        const sku = overlay.querySelector('#p-sku').value.trim();
        const barcode = overlay.querySelector('#p-barcode').value.trim() || null;
        const tag = overlay.querySelector('#p-tag').value.trim() || null;
        const status = overlay.querySelector('#p-status').value;
        const priority = parseInt(overlay.querySelector('#p-priority').value) || 0;

        const costPrice = parseFloat(overlay.querySelector('#p-cost').value) || 0;
        const sellingPrice = parseFloat(overlay.querySelector('#p-price').value) || 0;
        const stock = parseInt(overlay.querySelector('#p-stock').value) || 0;
        const alertQty = parseInt(overlay.querySelector('#p-alert').value) || 5;

        if (!name || !sku) {
          H.showToast('Product Name and SKU Code are required!', 'error');
          return;
        }

        saveCurrentVariationInputs();
        const varRows = overlay.querySelectorAll('.var-row');
        const variations = [];
        varRows.forEach(row => {
          const vId = row.dataset.id || ('var_' + Math.random().toString(36).substr(2, 9));
          const vName = row.querySelector('.var-name-input').value.trim();
          const vSku = row.querySelector('.var-sku-input').value.trim();
          const vCost = parseFloat(row.querySelector('.var-cost-input').value) || 0;
          const vPrice = parseFloat(row.querySelector('.var-price-input').value) || 0;
          const vStock = parseInt(row.querySelector('.var-stock-input').value) || 0;
          if (vName && vSku) {
            variations.push({ id: vId, name: vName, sku: vSku, costPrice: vCost, price: vPrice, stock: vStock });
          }
        });

        const productData = {
          id: isEdit ? p.id : ('prod_' + Math.random().toString(36).substr(2, 9)),
          name,
          sku,
          barcode,
          categoryId,
          costPrice,
          sellingPrice,
          stock: variations.length > 0 ? variations.reduce((sum, v) => sum + v.stock, 0) : stock,
          alertQty,
          image: activeImage,
          tag,
          status,
          priority,
          variations
        };

        try {
          const method = isEdit ? 'PUT' : 'POST';
          const url = isEdit ? `${window.location.origin}/api/products/${p.id}` : `${window.location.origin}/api/products`;
          const res = await fetch(url, {
            method,
            headers: S.getHeaders(),
            body: JSON.stringify(productData)
          });
          if (res.ok) {
            H.showToast(isEdit ? 'Product updated successfully!' : 'Product added successfully!');
            close();
            await this.render();
          } else {
            const err = await res.json();
            H.showToast(err.error || 'Failed to save product', 'error');
          }
        } catch (err) {
          H.showToast('Save Error: ' + err.message, 'error');
        }
      };

      renderVariations();
    },

    async showManageCategoriesModal() {
      const S = POS.Store;
      const H = POS.Helpers;
      const overlay = document.getElementById('prod-modal-overlay');

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
