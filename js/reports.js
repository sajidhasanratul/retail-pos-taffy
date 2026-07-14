(function () {
  'use strict';

  const Reports = {
    async render(type) {
      const mc = document.getElementById('main-content');
      const H = POS.Helpers;

      const titleMap = {
        'daily-sale': 'Daily Sale Report',
        'product-profit': 'Product Profit Report',
        'top-selling': 'Top Selling Products Report',
        'slow-selling': 'Slow Selling Products Report',
        'payment-method': 'Payment Method Report',
        'stock-value': 'Stock Value Report',
        'sales-summary': 'Sales Summary Report',
        'overall-profit': 'Overall Profit Report'
      };

      const title = titleMap[type] || 'Reports Overview';

      let fromDate = localStorage.getItem('rep_from') || H.today();
      let toDate = localStorage.getItem('rep_to') || H.today();

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">📈 ${title}</h2>
            <p class="page-subtitle">Analyze business performance, check cashflows and output CSV logs.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-success btn-sm" id="btn-export-rep">📥 Export CSV</button>
          </div>
        </div>

        <div class="filter-bar fade-in">
          <div class="form-group" style="margin-bottom:0; flex:1; min-width:150px;">
            <label class="form-label">From Date</label>
            <input type="date" class="form-input" id="rep-from" value="${fromDate}">
          </div>
          <div class="form-group" style="margin-bottom:0; flex:1; min-width:150px;">
            <label class="form-label">To Date</label>
            <input type="date" class="form-input" id="rep-to" value="${toDate}">
          </div>
          <button class="btn btn-primary" id="btn-apply-rep-filter" style="margin-top:18px;">Apply Filter</button>
        </div>

        <div id="report-output-container" class="fade-in"></div>
      `;

      // Filter events
      document.getElementById('btn-apply-rep-filter').onclick = async () => {
        fromDate = document.getElementById('rep-from').value;
        toDate = document.getElementById('rep-to').value;
        localStorage.setItem('rep_from', fromDate);
        localStorage.setItem('rep_to', toDate);
        await this.generateReport(type, fromDate, toDate);
      };

      document.getElementById('btn-export-rep').onclick = async () => {
        await this.exportReportCSV(type, fromDate, toDate);
      };

      // Generate initial state
      await this.generateReport(type, fromDate, toDate);
    },

    async generateReport(type, from, to) {
      const container = document.getElementById('report-output-container');
      const S = POS.Store;
      const H = POS.Helpers;

      const orders = await S.query('orders', o => H.isDateInRange(o.date, from, to));
      const orderItems = await S.getAll('orderItems');
      const products = await S.getAll('products');
      const payments = await S.getAll('payments');

      switch (type) {
        case 'daily-sale':
          this.dailySaleReport(container, orders, H);
          break;
        case 'product-profit':
          this.productProfitReport(container, orders, orderItems, products, H);
          break;
        case 'top-selling':
          this.rankProductsReport(container, orders, orderItems, true, H);
          break;
        case 'slow-selling':
          this.rankProductsReport(container, orders, orderItems, false, H);
          break;
        case 'payment-method':
          this.paymentMethodReport(container, orders, payments, H);
          break;
        case 'stock-value':
          await this.stockValueReport(container, products, S, H);
          break;
        case 'sales-summary':
          this.salesSummaryReport(container, orders, H);
          break;
        case 'overall-profit':
          await this.overallProfitReport(container, orders, orderItems, products, S, H, from, to);
          break;
        default:
          container.innerHTML = `<div class="card"><div class="card-body">Please select a valid report option from the sidebar menu.</div></div>`;
      }
    },

    dailySaleReport(container, orders, H) {
      const salesByDay = {};

      orders.forEach(o => {
        const day = H.formatDate(o.date);
        if (!salesByDay[day]) {
          salesByDay[day] = { count: 0, subtotal: 0, discount: 0, tax: 0, total: 0 };
        }
        salesByDay[day].count++;
        salesByDay[day].subtotal += o.subtotal;
        salesByDay[day].discount += o.discountAmount;
        salesByDay[day].tax += o.taxAmount;
        salesByDay[day].total += o.grandTotal;
      });

      let tbodyRows = '';
      let sumCount = 0, sumSub = 0, sumDisc = 0, sumTax = 0, sumTotal = 0;

      Object.entries(salesByDay).forEach(([day, d]) => {
        sumCount += d.count;
        sumSub += d.subtotal;
        sumDisc += d.discount;
        sumTax += d.tax;
        sumTotal += d.total;

        tbodyRows += `
          <tr>
            <td style="font-weight:600;">${day}</td>
            <td class="text-center">${d.count}</td>
            <td class="text-right">${H.formatCurrency(d.subtotal)}</td>
            <td class="text-right text-danger">-${H.formatCurrency(d.discount)}</td>
            <td class="text-right">${H.formatCurrency(d.tax)}</td>
            <td class="text-right" style="font-weight:700; color:var(--primary);">${H.formatCurrency(d.total)}</td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th class="text-center">Invoices Issued</th>
                    <th class="text-right">Subtotal</th>
                    <th class="text-right">Discount</th>
                    <th class="text-right">Tax</th>
                    <th class="text-right">Total sales</th>
                  </tr>
                </thead>
                <tbody>
                  ${tbodyRows || '<tr><td colspan="6" class="text-center text-muted">No sales orders found in this date range.</td></tr>'}
                  ${tbodyRows ? `
                    <tr class="total-row">
                      <td>Total Summary</td>
                      <td class="text-center">${sumCount}</td>
                      <td class="text-right">${H.formatCurrency(sumSub)}</td>
                      <td class="text-right text-danger">-${H.formatCurrency(sumDisc)}</td>
                      <td class="text-right">${H.formatCurrency(sumTax)}</td>
                      <td class="text-right" style="color:var(--primary);">${H.formatCurrency(sumTotal)}</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    productProfitReport(container, orders, orderItems, products, H) {
      const orderIds = orders.map(o => o.id);
      const items = orderItems.filter(i => orderIds.includes(i.orderId));

      const profitByProduct = {};

      items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        let costPrice = 0;
        if (prod) {
          if (prod.variations && prod.variations.length > 0) {
            const v = prod.variations.find(v => v.name === item.variationName || (prod.name + ' ' + v.name) === item.productName);
            costPrice = v ? v.costPrice : prod.costPrice;
          } else {
            costPrice = prod.costPrice;
          }
        }

        const key = item.productId + '_' + (item.variationName || '');
        if (!profitByProduct[key]) {
          profitByProduct[key] = {
            name: item.productName + (item.variationName ? ` (${item.variationName})` : ''),
            qtySold: 0,
            revenue: 0,
            cost: 0
          };
        }

        profitByProduct[key].qtySold += item.qty;
        profitByProduct[key].revenue += item.total;
        profitByProduct[key].cost += (costPrice * item.qty);
      });

      let tbodyRows = '';
      let grandQty = 0, grandRevenue = 0, grandCost = 0, grandProfit = 0;

      Object.values(profitByProduct).forEach(d => {
        const profit = d.revenue - d.cost;
        const margin = d.revenue > 0 ? (profit / d.revenue) * 100 : 0;

        grandQty += d.qtySold;
        grandRevenue += d.revenue;
        grandCost += d.cost;
        grandProfit += profit;

        tbodyRows += `
          <tr>
            <td style="font-weight:600;">${H.esc(d.name)}</td>
            <td class="text-center">${d.qtySold}</td>
            <td class="text-right">${H.formatCurrency(d.cost)}</td>
            <td class="text-right">${H.formatCurrency(d.revenue)}</td>
            <td class="text-right text-success" style="font-weight:700;">${H.formatCurrency(profit)}</td>
            <td class="text-center" style="font-weight:600;">${margin.toFixed(1)}%</td>
          </tr>
        `;
      });

      const avgMargin = grandRevenue > 0 ? (grandProfit / grandRevenue) * 100 : 0;

      container.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Product / Variant</th>
                    <th class="text-center" style="width: 100px;">Qty Sold</th>
                    <th class="text-right" style="width: 130px;">Total Cost</th>
                    <th class="text-right" style="width: 130px;">Total Sales</th>
                    <th class="text-right" style="width: 130px;">Profit</th>
                    <th class="text-center" style="width: 120px;">Profit Margin</th>
                  </tr>
                </thead>
                <tbody>
                  ${tbodyRows || '<tr><td colspan="6" class="text-center text-muted">No sales items recorded in date range.</td></tr>'}
                  ${tbodyRows ? `
                    <tr class="total-row">
                      <td>Grand Totals</td>
                      <td class="text-center">${grandQty}</td>
                      <td class="text-right">${H.formatCurrency(grandCost)}</td>
                      <td class="text-right">${H.formatCurrency(grandRevenue)}</td>
                      <td class="text-right text-success">${H.formatCurrency(grandProfit)}</td>
                      <td class="text-center">${avgMargin.toFixed(1)}%</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    rankProductsReport(container, orders, orderItems, isTopSelling, H) {
      const orderIds = orders.map(o => o.id);
      const items = orderItems.filter(i => orderIds.includes(i.orderId));

      const totals = {};
      items.forEach(i => {
        const key = i.productName + (i.variationName ? ` (${i.variationName})` : '');
        if (!totals[key]) {
          totals[key] = { qty: 0, amount: 0 };
        }
        totals[key].qty += i.qty;
        totals[key].amount += i.total;
      });

      // Sort logic
      const sorted = Object.entries(totals).sort((a, b) =>
        isTopSelling ? b[1].qty - a[1].qty : a[1].qty - b[1].qty
      );

      let rows = '';
      sorted.forEach(([name, data], idx) => {
        rows += `
          <tr>
            <td class="text-center" style="font-weight:700;">#${idx + 1}</td>
            <td style="font-weight:600;">${H.esc(name)}</td>
            <td class="text-center" style="font-weight:600;">${data.qty}</td>
            <td class="text-right text-success" style="font-weight:700;">${H.formatCurrency(data.amount)}</td>
          </tr>
        `;
      });

      container.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="text-center" style="width: 80px;">Rank</th>
                    <th>Product / Variant</th>
                    <th class="text-center" style="width: 120px;">Qty Sold</th>
                    <th class="text-right" style="width: 140px;">Gross Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows || '<tr><td colspan="4" class="text-center text-muted">No sales items recorded in date range.</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    paymentMethodReport(container, orders, payments, H) {
      const methods = {};
      H.paymentMethods.forEach(m => {
        methods[m] = { txn: 0, amount: 0 };
      });

      const orderIds = orders.map(o => o.id);
      const matchedPayments = payments.filter(p => orderIds.includes(p.orderId));

      matchedPayments.forEach(p => {
        if (!methods[p.method]) {
          methods[p.method] = { txn: 0, amount: 0 };
        }
        methods[p.method].txn++;
        methods[p.method].amount += p.amount;
      });

      let rows = '';
      let grandTxn = 0, grandAmount = 0;
      Object.entries(methods).forEach(([method, d]) => {
        if (d.amount > 0) {
          grandTxn += d.txn;
          grandAmount += d.amount;

          rows += `
            <tr>
              <td style="font-weight:600;">${method}</td>
              <td class="text-center">${d.txn}</td>
              <td class="text-right text-success" style="font-weight:700;">${H.formatCurrency(d.amount)}</td>
            </tr>
          `;
        }
      });

      container.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Payment Method</th>
                    <th class="text-center" style="width:150px;">Transactions</th>
                    <th class="text-right" style="width:200px;">Settled Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows || '<tr><td colspan="3" class="text-center text-muted">No transaction logs recorded in date range.</td></tr>'}
                  ${rows ? `
                    <tr class="total-row">
                      <td>Sum Summary</td>
                      <td class="text-center">${grandTxn}</td>
                      <td class="text-right text-success">${H.formatCurrency(grandAmount)}</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    stockValueReport(container, products, Store, H) {
      let tbodyRows = '';
      let totalQty = 0, totalValCost = 0, totalValRetail = 0, totalProfitPotential = 0;

      products.forEach(p => {
        const cat = Store.getById('categories', p.categoryId);
        const catName = cat ? cat.name : 'N/A';

        if (p.variations && p.variations.length > 0) {
          p.variations.forEach(v => {
            const valCost = v.costPrice * v.stock;
            const valRetail = v.price * v.stock;
            const potentialProfit = valRetail - valCost;

            totalQty += v.stock;
            totalValCost += valCost;
            totalValRetail += valRetail;
            totalProfitPotential += potentialProfit;

            tbodyRows += `
              <tr>
                <td style="font-weight:600;">${H.esc(p.name)} <span class="text-muted text-sm">(${H.esc(v.name)})</span></td>
                <td>SKU: ${H.esc(v.sku)}</td>
                <td>${H.esc(catName)}</td>
                <td class="text-center">${v.stock}</td>
                <td class="text-right">${H.formatCurrency(v.costPrice)}</td>
                <td class="text-right">${H.formatCurrency(v.price)}</td>
                <td class="text-right">${H.formatCurrency(valCost)}</td>
                <td class="text-right text-success" style="font-weight:600;">${H.formatCurrency(valRetail)}</td>
              </tr>
            `;
          });
        } else {
          const valCost = p.costPrice * p.stock;
          const valRetail = p.sellingPrice * p.stock;
          const potentialProfit = valRetail - valCost;

          totalQty += p.stock;
          totalValCost += valCost;
          totalValRetail += valRetail;
          totalProfitPotential += potentialProfit;

          tbodyRows += `
            <tr>
              <td style="font-weight:600;">${H.esc(p.name)}</td>
              <td>SKU: ${H.esc(p.sku)}</td>
              <td>${H.esc(catName)}</td>
              <td class="text-center">${p.stock}</td>
              <td class="text-right">${H.formatCurrency(p.costPrice)}</td>
              <td class="text-right">${H.formatCurrency(p.sellingPrice)}</td>
              <td class="text-right">${H.formatCurrency(valCost)}</td>
              <td class="text-right text-success" style="font-weight:600;">${H.formatCurrency(valRetail)}</td>
            </tr>
          `;
        }
      });

      container.innerHTML = `
        <div class="stats-grid fade-in mb-2" style="grid-template-columns: repeat(3, 1fr);">
          <div class="stat-card blue" style="padding: 15px;">
            <div class="stat-icon">📦</div>
            <div class="stat-info">
              <div class="stat-label">Total Stock Quantity</div>
              <div class="stat-value">${totalQty} Unit(s)</div>
            </div>
          </div>
          <div class="stat-card orange" style="padding: 15px;">
            <div class="stat-icon">🪙</div>
            <div class="stat-info">
              <div class="stat-label">Stock Value (Cost)</div>
              <div class="stat-value">${H.formatCurrency(totalValCost)}</div>
            </div>
          </div>
          <div class="stat-card green" style="padding: 15px;">
            <div class="stat-icon">🏷️</div>
            <div class="stat-info">
              <div class="stat-label">Stock Value (Retail)</div>
              <div class="stat-value">${H.formatCurrency(totalValRetail)}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Product / Variation</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th class="text-center">Stock</th>
                    <th class="text-right">Cost Price</th>
                    <th class="text-right">Retail Price</th>
                    <th class="text-right">Value (Cost)</th>
                    <th class="text-right">Value (Retail)</th>
                  </tr>
                </thead>
                <tbody>
                  ${tbodyRows || '<tr><td colspan="8" class="text-center text-muted">No stock available.</td></tr>'}
                  ${tbodyRows ? `
                    <tr class="total-row">
                      <td colspan="3">Stock Summary Valuations</td>
                      <td class="text-center">${totalQty}</td>
                      <td colspan="2"></td>
                      <td class="text-right">${H.formatCurrency(totalValCost)}</td>
                      <td class="text-right text-success">${H.formatCurrency(totalValRetail)}</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    },

    salesSummaryReport(container, orders, H) {
      let count = orders.length;
      let totalSales = orders.reduce((s, o) => s + o.grandTotal, 0);
      let totalTax = orders.reduce((s, o) => s + o.taxAmount, 0);
      let totalDiscount = orders.reduce((s, o) => s + o.discountAmount, 0);
      let totalPaid = orders.reduce((s, o) => s + o.paidAmount, 0);
      let totalDue = orders.reduce((s, o) => s + o.dueAmount, 0);
      let totalReturned = orders.reduce((s, o) => s + o.returnedAmount, 0);

      container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto;">
          <div class="card-header">📊 Comprehensive Sales Summary</div>
          <div class="card-body" style="display:flex; flex-direction:column; gap:12px;">
            <div class="flex justify-between" style="border-bottom:1px solid var(--border-light); padding-bottom:8px;">
              <span class="text-muted">Total Invoices Issued:</span>
              <span style="font-weight:700;">${count}</span>
            </div>
            <div class="flex justify-between" style="border-bottom:1px solid var(--border-light); padding-bottom:8px;">
              <span class="text-muted">Sub Total Gross:</span>
              <span style="font-weight:700;">${H.formatCurrency(totalSales - totalTax + totalDiscount)}</span>
            </div>
            <div class="flex justify-between style="border-bottom:1px solid var(--border-light); padding-bottom:8px;">
              <span class="text-muted">Total Discounts Allowed:</span>
              <span style="font-weight:700; color:var(--danger)">-${H.formatCurrency(totalDiscount)}</span>
            </div>
            <div class="flex justify-between" style="border-bottom:1px solid var(--border-light); padding-bottom:8px;">
              <span class="text-muted">Tax Amount Collected:</span>
              <span style="font-weight:700;">${H.formatCurrency(totalTax)}</span>
            </div>
            <div class="flex justify-between" style="border-bottom:2px solid var(--border); padding-bottom:8px; margin-bottom:8px;">
              <span style="font-weight:700;">Grand Total Sales Value:</span>
              <span style="font-weight:800; color:var(--primary); font-size:16px;">${H.formatCurrency(totalSales)}</span>
            </div>
            <div class="flex justify-between text-success" style="padding-bottom:4px;">
              <span>Total Received (Cleared):</span>
              <span style="font-weight:700;">${H.formatCurrency(totalPaid)}</span>
            </div>
          </div>
        </div>
      `;
    },

    async overallProfitReport(container, orders, orderItems, products, Store, H, from, to) {
      const totalSales = orders.reduce((s, o) => s + (parseFloat(o.grandTotal) || 0), 0);
      let totalCostOfGoods = 0;
      orders.forEach(order => {
        const items = orderItems.filter(i => i.orderId === order.id);
        items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          let cost = 0;
          if (product) {
            if (product.variations && product.variations.length > 0) {
              const variant = product.variations.find(v => v.name === item.variationName || (product.name + ' ' + v.name) === item.productName);
              cost = variant ? variant.costPrice : product.costPrice;
            } else {
              cost = product.costPrice;
            }
          }
          totalCostOfGoods += (parseFloat(cost) || 0) * (parseInt(item.qty) || 0);
        });
      });

      const totalSubtotal = orders.reduce((s, o) => s + (parseFloat(o.subtotal) || 0), 0);
      const totalDiscount = orders.reduce((s, o) => s + (parseFloat(o.discountAmount) || 0), 0);
      const productProfit = totalSubtotal - totalCostOfGoods - totalDiscount;

      const expenses = await Store.query('expenses', e => H.isDateInRange(e.date, from, to));
      const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
      const overallNetProfit = productProfit - totalExpenses;

      const netProfitColor = overallNetProfit >= 0 ? 'text-success' : 'text-danger';

      container.innerHTML = `
        <div class="stats-grid fade-in mb-2" style="grid-template-columns: repeat(4, 1fr);">
          <div class="stat-card purple" style="padding: 15px;">
            <div class="stat-icon">💰</div>
            <div class="stat-info">
              <div class="stat-label">Total Sales</div>
              <div class="stat-value" style="font-size:16px;">${H.formatCurrency(totalSales)}</div>
              <div class="stat-sub">${orders.length} Invoice(s)</div>
            </div>
          </div>
          <div class="stat-card green" style="padding: 15px;">
            <div class="stat-icon">📈</div>
            <div class="stat-info">
              <div class="stat-label">Product Profit</div>
              <div class="stat-value" style="font-size:16px;">${H.formatCurrency(productProfit)}</div>
              <div class="stat-sub">From Catalog Sales</div>
            </div>
          </div>
          <div class="stat-card orange" style="padding: 15px;">
            <div class="stat-icon">💸</div>
            <div class="stat-info">
              <div class="stat-label">Total Expenses</div>
              <div class="stat-value" style="font-size:16px;">${H.formatCurrency(totalExpenses)}</div>
              <div class="stat-sub">${expenses.length} Expense logs</div>
            </div>
          </div>
          <div class="stat-card blue" style="padding: 15px;">
            <div class="stat-icon">⚖️</div>
            <div class="stat-info">
              <div class="stat-label">Overall Net Profit</div>
              <div class="stat-value ${netProfitColor}" style="font-size:16px; font-weight:800;">${H.formatCurrency(overallNetProfit)}</div>
              <div class="stat-sub">Profit minus Expenses</div>
            </div>
          </div>
        </div>

        <div class="grid-2 fade-in mt-3">
          <div class="card">
            <div class="card-header">💸 Shop Expenses Breakdown</div>
            <div class="card-body">
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Expense Name</th>
                      <th class="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${expenses.map(e => `
                      <tr>
                        <td>${H.formatDateTime(e.date)}</td>
                        <td>${H.esc(e.name)}</td>
                        <td class="text-right text-danger">${H.formatCurrency(e.amount)}</td>
                      </tr>
                    `).join('') || '<tr><td colspan="3" class="text-center text-muted">No expenses in this period.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">📋 Invoiced Sales Summary</div>
            <div class="card-body">
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Customer</th>
                      <th class="text-right">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${orders.map(o => `
                      <tr>
                        <td style="font-weight:700;">${o.invoiceId}</td>
                        <td>${H.esc(o.customerName)}</td>
                        <td class="text-right text-success" style="font-weight:700;">${H.formatCurrency(o.grandTotal)}</td>
                      </tr>
                    `).join('') || '<tr><td colspan="3" class="text-center text-muted">No sales orders in this period.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    async exportReportCSV(type, from, to) {
      const S = POS.Store;
      const H = POS.Helpers;
      const orders = await S.query('orders', o => H.isDateInRange(o.date, from, to));
      const orderItems = await S.getAll('orderItems');
      const products = await S.getAll('products');
      const payments = await S.getAll('payments');
      const categories = await S.getAll('categories');

      let csvData = [];
      let filename = `report_${type}`;

      if (type === 'daily-sale') {
        const salesByDay = {};
        orders.forEach(o => {
          const day = H.formatDate(o.date);
          if (!salesByDay[day]) {
            salesByDay[day] = { Date: day, Invoices: 0, Subtotal: 0, Discount: 0, Tax: 0, Total: 0 };
          }
          salesByDay[day].Invoices++;
          salesByDay[day].Subtotal += o.subtotal;
          salesByDay[day].Discount += o.discountAmount;
          salesByDay[day].Tax += o.taxAmount;
          salesByDay[day].Total += o.grandTotal;
        });
        csvData = Object.values(salesByDay);
      } else if (type === 'product-profit') {
        const orderIds = orders.map(o => o.id);
        const items = orderItems.filter(i => orderIds.includes(i.orderId));
        const profitByProduct = {};
        items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          let cost = 0;
          if (product) {
            if (product.variations && product.variations.length > 0) {
              const variant = product.variations.find(v => v.name === item.variationName || (product.name + ' ' + v.name) === item.productName);
              cost = variant ? variant.costPrice : product.costPrice;
            } else {
              cost = product.costPrice;
            }
          }
          const totalCost = cost * item.qty;
          const revenue = item.total;
          const key = item.productName + (item.variationName ? ` (${item.variationName})` : '');
          if (!profitByProduct[key]) {
            profitByProduct[key] = { Product: key, Sold: 0, Cost: 0, Sales: 0, Profit: 0 };
          }
          profitByProduct[key].Sold += item.qty;
          profitByProduct[key].Cost += totalCost;
          profitByProduct[key].Sales += revenue;
          profitByProduct[key].Profit += (revenue - totalCost);
        });
        csvData = Object.values(profitByProduct);
      } else if (type === 'top-selling' || type === 'slow-selling') {
        const orderIds = orders.map(o => o.id);
        const items = orderItems.filter(i => orderIds.includes(i.orderId));
        const totals = {};
        items.forEach(i => {
          const key = i.productName + (i.variationName ? ` (${i.variationName})` : '');
          if (!totals[key]) {
            totals[key] = { Product: key, Sold: 0, Revenue: 0 };
          }
          totals[key].Sold += i.qty;
          totals[key].Revenue += i.total;
        });
        csvData = Object.values(totals).sort((a, b) => type === 'top-selling' ? b.Sold - a.Sold : a.Sold - b.Sold);
      } else if (type === 'payment-method') {
        const methods = {};
        H.paymentMethods.forEach(m => { methods[m] = { Method: m, Txns: 0, Amount: 0 }; });
        const orderIds = orders.map(o => o.id);
        const matchedPayments = payments.filter(p => orderIds.includes(p.orderId));
        matchedPayments.forEach(p => {
          if (!methods[p.method]) {
            methods[p.method] = { Method: p.method, Txns: 0, Amount: 0 };
          }
          methods[p.method].Txns++;
          methods[p.method].Amount += p.amount;
        });
        csvData = Object.values(methods).filter(m => m.Amount > 0);
      } else if (type === 'stock-value') {
        products.forEach(p => {
          const cat = categories.find(c => c.id === p.categoryId);
          const catName = cat ? cat.name : 'Uncategorized';
          if (p.variations && p.variations.length > 0) {
            p.variations.forEach(v => {
              csvData.push({
                Product: p.name,
                SKU: v.sku,
                Category: catName,
                Stock: v.stock,
                Cost: v.costPrice,
                Price: v.price,
                'Total Cost Val': v.costPrice * v.stock,
                'Total Retail Val': v.price * v.stock
              });
            });
          } else {
            csvData.push({
              Product: p.name,
              SKU: p.sku,
              Category: catName,
              Stock: p.stock,
              Cost: p.costPrice,
              Price: p.sellingPrice,
              'Total Cost Val': p.costPrice * p.stock,
              'Total Retail Val': p.sellingPrice * p.stock
            });
          }
        });
      } else if (type === 'sales-summary') {
        let totalSales = orders.reduce((s, o) => s + o.grandTotal, 0);
        let totalTax = orders.reduce((s, o) => s + o.taxAmount, 0);
        let totalDiscount = orders.reduce((s, o) => s + o.discountAmount, 0);
        let totalPaid = orders.reduce((s, o) => s + o.paidAmount, 0);
        let totalDue = orders.reduce((s, o) => s + o.dueAmount, 0);
        let totalReturned = orders.reduce((s, o) => s + o.returnedAmount, 0);
        csvData = [{
          'Total Invoices': orders.length,
          'Gross Revenue': totalSales - totalTax + totalDiscount,
          'Discounts Allowed': totalDiscount,
          'Taxes Collected': totalTax,
          'Net Sales (Grand Total)': totalSales,
          'Total Settled': totalPaid,
          'Total Due': totalDue,
          'Total Refunded': totalReturned
        }];
      } else if (type === 'overall-profit') {
        const totalSales = orders.reduce((s, o) => s + (parseFloat(o.grandTotal) || 0), 0);
        let totalCostOfGoods = 0;
        orders.forEach(order => {
          const items = orderItems.filter(i => i.orderId === order.id);
          items.forEach(item => {
            const product = products.find(p => p.id === item.productId);
            let cost = 0;
            if (product) {
              if (product.variations && product.variations.length > 0) {
                const variant = product.variations.find(v => v.name === item.variationName || (product.name + ' ' + v.name) === item.productName);
                cost = variant ? variant.costPrice : product.costPrice;
              } else {
                cost = product.costPrice;
              }
            }
            totalCostOfGoods += (parseFloat(cost) || 0) * (parseInt(item.qty) || 0);
          });
        });
        const totalSubtotal = orders.reduce((s, o) => s + (parseFloat(o.subtotal) || 0), 0);
        const totalDiscount = orders.reduce((s, o) => s + (parseFloat(o.discountAmount) || 0), 0);
        const productProfit = totalSubtotal - totalCostOfGoods - totalDiscount;

        const expenses = await S.query('expenses', e => H.isDateInRange(e.date, from, to));
        const totalExpenses = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
        const overallNetProfit = productProfit - totalExpenses;

        csvData = [{
          'Total Sales': totalSales,
          'Product Profit': productProfit,
          'Total Expenses': totalExpenses,
          'Overall Net Profit': overallNetProfit,
          'Sales Invoices Qty': orders.length,
          'Expense Items Qty': expenses.length
        }];
      }

      if (csvData.length === 0) {
        H.showToast('No data to export', 'error');
        return;
      }
      H.exportCSV(csvData, filename);
    }
  };

  window.POS = window.POS || {};
  window.POS.Reports = Reports;
})();
