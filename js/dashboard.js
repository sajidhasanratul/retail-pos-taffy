(function () {
  'use strict';

  const Dashboard = {
    async render() {
      const mc = document.getElementById('main-content');
      const H = POS.Helpers;
      const today = H.today();

      // Get initial date range filters
      let fromDate = localStorage.getItem('dash_from') || today;
      let toDate = localStorage.getItem('dash_to') || today;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">📊 POS Dashboard</h2>
            <p class="page-subtitle">Welcome to your retail sales overview and real-time report.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-secondary btn-sm" id="btn-today">Today</button>
            <button class="btn btn-secondary btn-sm" id="btn-this-month">This Month</button>
          </div>
        </div>

        <div class="filter-bar fade-in">
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 150px;">
            <label class="form-label">From Date</label>
            <input type="date" class="form-input" id="dash-from" value="${fromDate}">
          </div>
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 150px;">
            <label class="form-label">To Date</label>
            <input type="date" class="form-input" id="dash-to" value="${toDate}">
          </div>
          <button class="btn btn-primary" id="btn-filter" style="margin-top: 18px;">Apply Filter</button>
        </div>

        <div class="stats-grid fade-in" id="dashboard-stats">
          <div style="grid-column: 1/-1; text-align: center; padding: 20px;"><div class="spinner" style="margin: 0 auto 10px;"></div>Loading Stats...</div>
        </div>

        <div class="grid-2 fade-in">
          <div class="card">
            <div class="card-header">📊 Sales Trend</div>
            <div class="card-body">
              <div class="chart-container">
                <canvas id="salesTrendChart"></canvas>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header">💳 Payment Method Distribution</div>
            <div class="card-body">
              <div class="chart-container">
                <canvas id="paymentMethodChart"></canvas>
              </div>
            </div>
          </div>
        </div>

        <div class="card mt-3 fade-in">
          <div class="card-header">⏰ 24-Hour Sales Distribution (Hourly Peaks)</div>
          <div class="card-body">
            <div class="chart-container" style="height: 250px; position: relative;">
              <canvas id="hourlySalesChart"></canvas>
            </div>
          </div>
        </div>

        <div class="card mt-3 fade-in">
          <div class="card-header">🏆 Top Selling Products</div>
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Sold Qty</th>
                    <th>Subtotal Amount</th>
                  </tr>
                </thead>
                <tbody id="top-selling-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      // Set up event listeners
      document.getElementById('btn-filter').onclick = async () => {
        fromDate = document.getElementById('dash-from').value;
        toDate = document.getElementById('dash-to').value;
        localStorage.setItem('dash_from', fromDate);
        localStorage.setItem('dash_to', toDate);
        await this.updateStats(fromDate, toDate);
      };

      document.getElementById('btn-today').onclick = () => {
        const t = H.today();
        document.getElementById('dash-from').value = t;
        document.getElementById('dash-to').value = t;
        document.getElementById('btn-filter').click();
      };

      document.getElementById('btn-this-month').onclick = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        document.getElementById('dash-from').value = `${y}-${m}-01`;
        document.getElementById('dash-to').value = H.today();
        document.getElementById('btn-filter').click();
      };

      // Initial stats load
      await this.updateStats(fromDate, toDate);
    },

    async updateStats(from, to) {
      const S = POS.Store;
      const H = POS.Helpers;

      const orders = await S.query('orders', o => H.isDateInRange(o.date, from, to));
      const orderItems = await S.getAll('orderItems');
      const payments = await S.getAll('payments');
      const products = await S.getAll('products');

      let totalSales = 0;
      let totalDue = 0;
      let cashSales = 0;
      let cardSales = 0;
      const paymentBreakdown = {};

      H.paymentMethods.forEach(method => {
        paymentBreakdown[method] = 0;
      });

      orders.forEach(order => {
        totalSales += parseFloat(order.grandTotal) || 0;
        totalDue += parseFloat(order.dueAmount) || 0;

        // Sum payment methods for this order
        const ordPayments = payments.filter(p => p.orderId === order.id);
        ordPayments.forEach(p => {
          const amt = parseFloat(p.amount) || 0;
          if (paymentBreakdown[p.method] !== undefined) {
            paymentBreakdown[p.method] += amt;
          } else {
            paymentBreakdown[p.method] = amt;
          }
          if (p.method === 'Cash') cashSales += amt;
          if (p.method === 'Card') cardSales += amt;
        });
      });

      // Calculate profit: Sell Price - Cost Price
      // We need to look up cost price for items sold in the date range
      let totalProfit = 0;
      orders.forEach(order => {
        const items = orderItems.filter(i => i.orderId === order.id);
        let orderCost = 0;
        items.forEach(item => {
          // Look up base product to find costPrice
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
          orderCost += (cost * item.qty);
        });

        // Profit = grandTotal - discountAmount - totalCost
        const discountAllocated = order.discountAmount || 0;
        const profitForOrder = order.subtotal - orderCost - discountAllocated;
        totalProfit += profitForOrder;
      });

      // Render Summary Cards
      const statsGrid = document.getElementById('dashboard-stats');
      statsGrid.innerHTML = `
        <div class="stat-card purple">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-label">Total Sale</div>
            <div class="stat-value" style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
              <span>${H.formatCurrency(totalSales)}</span>
              <span style="font-size: 13px; font-weight: 600; color: #ddd; background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 4px;">${orders.length} Sales</span>
            </div>
            <div class="stat-sub">Invoiced Collections</div>
          </div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">📈</div>
          <div class="stat-info">
            <div class="stat-label">Total Profit</div>
            <div class="stat-value">${H.formatCurrency(totalProfit)}</div>
            <div class="stat-sub">Estimated Gross</div>
          </div>
        </div>
        <div class="stat-card orange">
          <div class="stat-icon">💳</div>
          <div class="stat-info">
            <div class="stat-label">Card Sales</div>
            <div class="stat-value">${H.formatCurrency(cardSales)}</div>
            <div class="stat-sub">All cards</div>
          </div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon">💵</div>
          <div class="stat-info">
            <div class="stat-label">Cash In Hand</div>
            <div class="stat-value">${H.formatCurrency(cashSales)}</div>
            <div class="stat-sub">Physical cash</div>
          </div>
        </div>
      `;

      // Render payment methods stats breakdown at bottom/popup or dashboard
      // Let's make a grid for payment breakdowns inside the stats grid
      let pbHtml = '';
      Object.entries(paymentBreakdown).forEach(([method, amount]) => {
        if (amount > 0 && method !== 'Cash' && method !== 'Card') {
          pbHtml += `
            <div class="stat-card teal">
              <div class="stat-icon">📱</div>
              <div class="stat-info">
                <div class="stat-label">${method}</div>
                <div class="stat-value">${H.formatCurrency(amount)}</div>
                <div class="stat-sub">Mobile/Other Pay</div>
              </div>
            </div>
          `;
        }
      });
      statsGrid.insertAdjacentHTML('beforeend', pbHtml);

      // ── Charts & Top Selling ─────────────────────────
      this.renderCharts(orders, paymentBreakdown, from, to);
      this.renderTopSelling(orders, orderItems);
    },

    renderCharts(orders, paymentBreakdown, from, to) {
      const H = POS.Helpers;

      // Calculate diffDays inclusive
      const diffTime = Math.abs(new Date(to) - new Date(from));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // 1. Sales Trend (by day)
      const dailySales = {};
      orders.forEach(o => {
        const day = H.formatDate(o.date);
        dailySales[day] = (dailySales[day] || 0) + o.grandTotal;
      });

      const trendLabels = Object.keys(dailySales).reverse();
      const trendData = Object.values(dailySales).reverse();

      const ctxTrend = document.getElementById('salesTrendChart').getContext('2d');
      if (window.trendChart) window.trendChart.destroy();
      window.trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
          labels: trendLabels.length ? trendLabels : ['No Data'],
          datasets: [{
            label: 'Sales Amount',
            data: trendData.length ? trendData : [0],
            borderColor: '#7C3AED',
            backgroundColor: 'rgba(124, 58, 237, 0.1)',
            fill: true,
            tension: 0.3,
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });

      // 2. Payment Method Distribution
      const payLabels = Object.keys(paymentBreakdown).filter(k => paymentBreakdown[k] > 0);
      const payData = payLabels.map(k => paymentBreakdown[k]);

      const ctxPay = document.getElementById('paymentMethodChart').getContext('2d');
      if (window.payChart) window.payChart.destroy();
      window.payChart = new Chart(ctxPay, {
        type: 'doughnut',
        data: {
          labels: payLabels.length ? payLabels : ['No Sales'],
          datasets: [{
            data: payData.length ? payData : [1],
            backgroundColor: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6', '#64748B']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });

      // 3. 24-Hour Distribution (Hourly peaks)
      const hourlyCounts = Array(24).fill(0);
      orders.forEach(o => {
        const hr = new Date(o.date).getHours();
        if (hr >= 0 && hr < 24) {
          hourlyCounts[hr]++;
        }
      });

      const hourlyData = diffDays > 2 
        ? hourlyCounts.map(c => parseFloat((c / diffDays).toFixed(2))) 
        : hourlyCounts;

      const hourLabels = Array.from({ length: 24 }, (_, i) => {
        const h = i % 12 || 12;
        const ampm = i < 12 ? 'AM' : 'PM';
        return `${h} ${ampm}`;
      });

      const ctxHour = document.getElementById('hourlySalesChart').getContext('2d');
      if (window.hourChart) window.hourChart.destroy();
      window.hourChart = new Chart(ctxHour, {
        type: 'bar',
        data: {
          labels: hourLabels,
          datasets: [{
            label: diffDays > 2 ? 'Average Sales (Qty)' : 'Total Sales (Qty)',
            data: hourlyData,
            backgroundColor: 'rgba(59, 130, 246, 0.7)',
            borderColor: '#3B82F6',
            borderWidth: 1.5,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `Sales: ${context.raw} invoice(s)`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    },

    renderTopSelling(orders, orderItems) {
      const H = POS.Helpers;
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

      const sorted = Object.entries(totals)
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 5);

      const tbody = document.getElementById('top-selling-tbody');
      tbody.innerHTML = '';

      if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center">No sales data in range.</td></tr>`;
        return;
      }

      sorted.forEach(([name, data]) => {
        tbody.innerHTML += `
          <tr>
            <td style="font-weight:600;">${name}</td>
            <td>${data.qty}</td>
            <td style="font-weight:700;" class="text-success">${H.formatCurrency(data.amount)}</td>
          </tr>
        `;
      });
    }
  };

  window.POS = window.POS || {};
  window.POS.Dashboard = Dashboard;
})();
