(function () {
  'use strict';

  const Router = {
    routes: {},
    current: null,

    register(path, handler) {
      this.routes[path] = handler;
    },

    navigate(path) {
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      window.history.pushState(null, '', path);
      this._resolve();
    },

    init() {
      window.addEventListener('popstate', () => this._resolve());

      // Intercept relative internal link clicks to perform SPA transitions
      document.addEventListener('click', (e) => {
        const anchor = e.target.closest('a');
        if (anchor) {
          const href = anchor.getAttribute('href');
          // Intercept paths starting with '/' but not API paths
          if (href && href.startsWith('/') && !href.startsWith('/api')) {
            e.preventDefault();
            this.navigate(href);
          }
        }
      });

      const user = POS.Store.getCurrentUser();
      if (!user) {
        window.location.href = '/login.html';
        return;
      }

      let path = window.location.pathname;
      if (path === '/' || path === '/index.html' || path === '') {
        path = user.role === 'cashier' ? '/new-order' : '/dashboard';
        window.history.replaceState(null, '', path);
      }

      this._resolve();
    },

    _resolve() {
      let path = window.location.pathname;
      if (path === '/' || path === '/index.html' || path === '') {
        path = '/dashboard';
      }

      const S = POS.Store;
      const H = POS.Helpers;
      const currentUser = S.getCurrentUser();

      // Check session
      if (!currentUser) {
        window.location.href = '/login.html';
        return;
      }

      // Route authorizations guard
      if (currentUser) {
        const role = currentUser.role;
        let allowed = true;

        if (role === 'cashier') {
          const permitted = ['/new-order', '/sales-list', '/sales-return', '/return-list'];
          if (!permitted.includes(path)) {
            allowed = false;
          }
        } else if (role === 'manager') {
          const forbidden = ['/reports', '/users'];
          const isReport = path.startsWith('/reports');
          const isUser = path.startsWith('/users');
          if (isReport || isUser) {
            allowed = false;
          }
        }

        if (!allowed) {
          H.showToast('Access Denied for your Role privilege.', 'error');
          path = role === 'cashier' ? '/new-order' : '/dashboard';
          window.history.replaceState(null, '', path);
        }
      }

      let handler = this.routes[path];
      let params = {};

      if (!handler) {
        for (const [route, h] of Object.entries(this.routes)) {
          const rp = route.split('/');
          const pp = path.split('/');
          if (rp.length !== pp.length) continue;
          let match = true;
          const p = {};
          for (let i = 0; i < rp.length; i++) {
            if (rp[i].startsWith(':')) { p[rp[i].slice(1)] = pp[i]; }
            else if (rp[i] !== pp[i]) { match = false; break; }
          }
          if (match) { handler = h; params = p; break; }
        }
      }

      if (handler) {
        this.current = path;
        const mainContent = document.getElementById('main-content');
        if (mainContent) mainContent.scrollTop = 0;
        handler(params);
        this._updateNav(path);
        this._updateBreadcrumb(path);
      }
    },

    _updateNav(path) {
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      const link = document.querySelector('.nav-item[href="' + path + '"]');
      if (link) {
        link.classList.add('active');
        const groupItems = link.closest('.nav-group-items');
        if (groupItems) {
          groupItems.classList.add('open');
          const header = groupItems.previousElementSibling;
          if (header) header.classList.add('open');
        }
      }
    },

    _updateBreadcrumb(path) {
      const el = document.getElementById('breadcrumb');
      if (!el) return;
      const parts = path.split('/').filter(Boolean);
      const labels = parts.map(p =>
        p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      );
      el.innerHTML = labels.map((name, i) =>
        i < labels.length - 1
          ? '<span class="bc-item">' + name + '</span><span class="bc-sep">›</span>'
          : '<span class="bc-item bc-active">' + name + '</span>'
      ).join('');
    }
  };

  window.POS = window.POS || {};
  window.POS.Router = Router;
})();
