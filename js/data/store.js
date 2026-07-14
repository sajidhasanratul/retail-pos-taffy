(function () {
  'use strict';

  const API_BASE = window.location.origin;

  const Store = {
    init() {
      // Server-side DB handles init/seed automatic during app start
    },

    // Session helpers
    getCurrentUser() {
      const userStr = localStorage.getItem('pos_user');
      if (!userStr) return null;
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    },

    getHeaders() {
      const user = this.getCurrentUser();
      const headers = { 'Content-Type': 'application/json' };
      if (user) {
        headers['x-user-role'] = user.role;
        headers['x-user-name'] = user.name;
        headers['x-user-id'] = user.id;
      }
      return headers;
    },

    async changePassword(oldPassword, newPassword) {
      try {
        const res = await fetch(`${API_BASE}/api/auth/change-password`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({ oldPassword, newPassword })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Password update failed');
        }
        return { success: true };
      } catch (err) {
        console.error('Password change error:', err);
        return { success: false, error: err.message };
      }
    },

    async login(username, password) {
      try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Invalid credentials');
        }
        const data = await res.json();
        if (data.success && data.user) {
          localStorage.setItem('pos_user', JSON.stringify(data.user));
          return { success: true, user: data.user };
        }
        return { success: false, error: 'Login failed' };
      } catch (err) {
        console.error('Login error:', err);
        return { success: false, error: err.message };
      }
    },

    logout() {
      localStorage.removeItem('pos_user');
      window.location.href = 'login.html';
    },

    /* ── API Client CRUD ────────────────────────────── */
    async getAll(collection) {
      try {
        const res = await fetch(`${API_BASE}/api/${collection}`, {
          headers: this.getHeaders()
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
      } catch (err) {
        console.error(`Error fetching ${collection}:`, err);
        return [];
      }
    },

    async getById(collection, id) {
      const list = await this.getAll(collection);
      return list.find(item => item.id === id || item.code === id) || null;
    },

    async add(collection, item) {
      try {
        // Handle special entities that have specific endpoints or simple ones
        if (collection === 'orders' || collection === 'returns') {
          // These should use transaction actions (placeOrder / processReturn)
          console.warn(`Redirecting add for ${collection} to transactional handler.`);
          return item;
        }

        if (!item.id) {
          item.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        }

        const res = await fetch(`${API_BASE}/api/${collection}`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(item)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }
        return item;
      } catch (err) {
        console.error(`Error adding to ${collection}:`, err);
        POS.Helpers.showToast(err.message, 'error');
        return null;
      }
    },

    async update(collection, id, updates) {
      try {
        const res = await fetch(`${API_BASE}/api/${collection}/${id}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(updates)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }
        return updates;
      } catch (err) {
        console.error(`Error updating ${collection}:`, err);
        POS.Helpers.showToast(err.message, 'error');
        return null;
      }
    },

    async delete(collection, id) {
      try {
        const res = await fetch(`${API_BASE}/api/${collection}/${id}`, {
          method: 'DELETE',
          headers: this.getHeaders()
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }
        return res.ok;
      } catch (err) {
        console.error(`Error deleting from ${collection}:`, err);
        POS.Helpers.showToast(err.message, 'error');
        return false;
      }
    },

    async query(collection, filterFn) {
      const list = await this.getAll(collection);
      return list.filter(filterFn);
    },

    /* ── Transaction Helpers ────────────────────────── */
    async getNextId(prefix) {
      try {
        const res = await fetch(`${API_BASE}/api/counters/next/${prefix}`, {
          headers: this.getHeaders()
        });
        const data = await res.json();
        return data.nextId;
      } catch (err) {
        console.error('Error getting next ID:', err);
        return prefix + '9999';
      }
    },

    async placeOrder(order, items, payments) {
      try {
        const res = await fetch(`${API_BASE}/api/orders`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ order, items, payments })
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
      } catch (err) {
        console.error('Error placing order:', err);
        return { success: false, error: err.message };
      }
    },

    async processReturn(returnRecord, items) {
      try {
        const res = await fetch(`${API_BASE}/api/returns`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({ returnRecord, items })
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
      } catch (err) {
        console.error('Error processing return:', err);
        return { success: false, error: err.message };
      }
    },

    async updateOrder(orderId, order, items, payments) {
      try {
        const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify({ order, items, payments })
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
      } catch (err) {
        console.error('Error updating order:', err);
        return { success: false, error: err.message };
      }
    },

    async getSettings() {
      try {
        const res = await fetch(`${API_BASE}/api/settings`, {
          headers: this.getHeaders()
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
      } catch (err) {
        console.error('Error fetching settings:', err);
        return { store_name: 'ZenPos Store', store_address: '123 Market Street, Dhaka', store_phone: '01700000000' };
      }
    },

    async updateSettings(settings) {
      try {
        const res = await fetch(`${API_BASE}/api/settings`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(settings)
        });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return await res.json();
      } catch (err) {
        console.error('Error saving settings:', err);
        return { success: false, error: err.message };
      }
    },

    /* ── Backup / Import ────────────────────────────── */
    async exportData() {
      try {
        const res = await fetch(`${API_BASE}/api/backup/export`, {
          headers: this.getHeaders()
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }
        return await res.json();
      } catch (err) {
        console.error('Error exporting data:', err);
        POS.Helpers.showToast(err.message, 'error');
        return {};
      }
    },

    async importData(data) {
      try {
        const res = await fetch(`${API_BASE}/api/backup/import`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(data)
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }
        return res.ok;
      } catch (err) {
        console.error('Error importing data:', err);
        POS.Helpers.showToast(err.message, 'error');
        return false;
      }
    },

    async clearAll() {
      // Replaced by backup import payload empty list resets
    }
  };

  window.POS = window.POS || {};
  window.POS.Store = Store;
})();
