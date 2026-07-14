(function () {
  'use strict';

  const Users = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">🛡️ User Access Control</h2>
            <p class="page-subtitle">Add employees, customize security keys, and set roles (Admin, Manager, Cashier) to restrict page tasks.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary btn-sm" id="btn-add-user">+ Add New User</button>
          </div>
        </div>

        <div class="card fade-in">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>Username</th>
                    <th>Role Privilege</th>
                    <th class="text-center">Permissions Group</th>
                    <th class="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody id="users-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="modal-overlay" id="users-modal-overlay"></div>
      `;

      // Event handlers
      document.getElementById('btn-add-user').onclick = () => this.showAddEditModal(null);

      // Initial update
      await this.updateList();
    },

    async updateList() {
      const S = POS.Store;
      const H = POS.Helpers;
      const list = await S.getAll('users');

      const tbody = document.getElementById('users-tbody');
      tbody.innerHTML = '';

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No user records found in database.</td></tr>`;
        return;
      }

      list.forEach(u => {
        // Display role label styles
        let roleBadge = `<span class="badge badge-secondary">${u.role.toUpperCase()}</span>`;
        let permissionsText = 'Billing Desk Access Only';
        if (u.role === 'admin') {
          roleBadge = `<span class="badge" style="background:#5a5cea; color:#fff;">ADMIN</span>`;
          permissionsText = 'Full System Permissions & Backups';
        } else if (u.role === 'manager') {
          roleBadge = `<span class="badge" style="background:#f59e0b; color:#fff;">MANAGER</span>`;
          permissionsText = 'Manage Inventory, Dashboard, Sales';
        }

        tbody.innerHTML += `
          <tr class="user-row" data-id="${u.id}">
            <td>
              <div style="font-weight:600;">${H.esc(u.name)}</div>
            </td>
            <td style="font-weight:600; color:var(--primary);">${H.esc(u.username)}</td>
            <td>${roleBadge}</td>
            <td class="text-center text-muted text-sm">${permissionsText}</td>
            <td class="text-center">
              <button class="btn btn-secondary btn-sm btn-edit-user">✏️ Edit</button>
              <button class="btn btn-secondary btn-sm btn-delete-user" style="color:var(--danger)">🗑️ Delete</button>
            </td>
          </tr>
        `;
      });

      // Bind actions
      tbody.querySelectorAll('.user-row').forEach(row => {
        const id = row.dataset.id;
        const u = list.find(user => user.id === id);

        row.querySelector('.btn-edit-user').onclick = () => this.showAddEditModal(u);
        row.querySelector('.btn-delete-user').onclick = async () => {
          const activeUser = S.getCurrentUser();
          if (activeUser && activeUser.id === u.id) {
            H.showToast('You cannot delete your own logged-in user profile!', 'error');
            return;
          }

          if (await H.confirm(`Are you sure you want to remove user "${u.name}"?`)) {
            const success = await S.delete('users', u.id);
            if (success) {
              H.showToast('User deleted from system.');
              await this.updateList();
            }
          }
        };
      });
    },

    showAddEditModal(u) {
      const S = POS.Store;
      const H = POS.Helpers;
      const overlay = document.getElementById('users-modal-overlay');

      const isEdit = !!u;
      const title = isEdit ? 'Edit User details' : 'Create New User Account';

      overlay.innerHTML = `
        <div class="modal animate" style="max-width:450px;">
          <div class="modal-header">
            <h3>${title}</h3>
            <button class="modal-close" id="modal-close-users">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Employee Name</label>
              <input type="text" class="form-input" id="u-name" value="${isEdit ? H.esc(u.name) : ''}" placeholder="e.g. John Doe">
            </div>
            <div class="form-group">
              <label class="form-label">Username</label>
              <input type="text" class="form-input" id="u-username" value="${isEdit ? H.esc(u.username) : ''}" placeholder="e.g. johndoe" ${isEdit ? 'disabled' : ''}>
            </div>
            <div class="form-group">
              <label class="form-label">Password Key ${isEdit ? '(leave blank to keep current)' : ''}</label>
              <input type="password" class="form-input" id="u-password" placeholder="Enter key password">
            </div>
            <div class="form-group">
              <label class="form-label">Security Role Group</label>
              <select class="form-select" id="u-role">
                <option value="cashier" ${isEdit && u.role === 'cashier' ? 'selected' : ''}>Cashier (Sales and Returns only)</option>
                <option value="manager" ${isEdit && u.role === 'manager' ? 'selected' : ''}>Manager (Dashboard, Products, Sales, Customers)</option>
                <option value="admin" ${isEdit && u.role === 'admin' ? 'selected' : ''}>Administrator (Full unrestricted access)</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-users-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-users-save">Save Account</button>
          </div>
        </div>
      `;

      overlay.classList.add('active');

      const close = () => overlay.classList.remove('active');
      overlay.querySelector('#modal-close-users').onclick = close;
      overlay.querySelector('#btn-users-cancel').onclick = close;

      overlay.querySelector('#btn-users-save').onclick = async () => {
        const name = document.getElementById('u-name').value.trim();
        const username = document.getElementById('u-username').value.trim();
        const password = document.getElementById('u-password').value;
        const role = document.getElementById('u-role').value;

        if (!name || (!isEdit && !username) || (!isEdit && !password)) {
          H.showToast('Please fill all mandatory fields.', 'error');
          return;
        }

        const data = { name, username, role };
        if (password) {
          data.password = password;
        }

        if (isEdit) {
          const success = await S.update('users', u.id, data);
          if (success) {
            H.showToast('User account parameters updated.');
            close();
            await this.updateList();
          }
        } else {
          data.id = 'u-' + Math.random().toString(36).substr(2, 9);
          const success = await S.add('users', data);
          if (success) {
            H.showToast('New user account added.');
            close();
            await this.updateList();
          }
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.Users = Users;
})();
