/* ============================================================
   LIBRE TECH - Auth Module (auth.js)
   Autenticación con Supabase Auth + Historial de pedidos
   ============================================================ */

const Auth = (() => {
  'use strict';

  let currentUser = null;

  // --- Inicialización ---
  function init() {
    loadUser();
    updateUI();
    bindEvents();
    // Listen to Supabase auth state changes
    SB.onAuthChange(user => {
      if (user) {
        currentUser = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
          email: user.email || '',
          picture: user.user_metadata?.avatar_url || ''
        };
      } else {
        currentUser = null;
      }
      updateUI();
      // Notify other modules (wishlist visibility etc.)
      document.dispatchEvent(new CustomEvent('auth-changed', { detail: { user: currentUser } }));
    });
  }

  // --- Google OAuth via Supabase ---
  function initGoogleSignIn() {
    // Google OAuth is now handled through Supabase — no separate GIS SDK needed
    const btn = document.getElementById('btnGoogleLogin');
    if (btn) {
      btn.addEventListener('click', async () => {
        try {
          const { error } = await SB.client.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + window.location.pathname }
          });
          if (error) throw error;
        } catch (err) {
          showToast('Error al iniciar sesión con Google: ' + err.message, 'error');
        }
      });
    }
  }

  // --- User Management (Supabase Auth) ---
  async function loadUser() {
    try {
      const user = await SB.getUser();
      if (user) {
        currentUser = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
          email: user.email || '',
          picture: user.user_metadata?.avatar_url || ''
        };
      } else {
        currentUser = null;
      }
    } catch {
      currentUser = null;
    }
  }

  function setUser(user) {
    currentUser = user;
    updateUI();
  }

  async function logoutUser() {
    await SB.client.auth.signOut();
    currentUser = null;
    updateUI();
    showToast('Sesión cerrada', 'info');
  }

  function getUser() {
    return currentUser;
  }

  function isLoggedIn() {
    return currentUser !== null;
  }

  // --- UI ---
  function updateUI() {
    const profileBtn = document.getElementById('btnProfile');
    const loginBtn = document.getElementById('btnGoogleLogin');
    const avatar = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    const loginPanel = document.getElementById('loginPanel');
    const loggedPanel = document.getElementById('loggedPanel');

    if (currentUser) {
      // Mostrar panel logueado, ocultar login
      if (loginPanel) loginPanel.style.display = 'none';
      if (loggedPanel) loggedPanel.style.display = 'block';
      // Mostrar avatar en vez de ícono
      if (avatar) {
        if (currentUser.picture) {
          avatar.src = currentUser.picture;
          avatar.alt = currentUser.name || 'Avatar';
          avatar.style.display = 'block';
        } else {
          avatar.style.display = 'none';
        }
      }
      if (profileBtn && currentUser.picture) profileBtn.style.display = 'none';
      else if (profileBtn) profileBtn.style.display = 'flex';
      if (nameEl) nameEl.textContent = currentUser.name || '';
      if (emailEl) emailEl.textContent = currentUser.email || '';
    } else {
      // Mostrar panel login, ocultar logueado
      if (loginPanel) loginPanel.style.display = 'block';
      if (loggedPanel) loggedPanel.style.display = 'none';
      if (profileBtn) profileBtn.style.display = 'flex';
      if (avatar) avatar.style.display = 'none';
    }
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  // --- Historial de pedidos (Supabase) ---
  async function getOrders() {
    if (!currentUser) return [];
    try {
      return await SB.getOrders(currentUser.id);
    } catch {
      return [];
    }
  }

  async function renderOrders() {
    const body = document.getElementById('ordersBody');
    if (!body) return;

    body.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:2rem;">Cargando pedidos…</p>';

    const orders = await getOrders();

    if (orders.length === 0) {
      body.innerHTML = '<p style="text-align:center;color:var(--text-tertiary);padding:2rem;">No tienes pedidos aún.</p>';
      return;
    }

    body.innerHTML = orders.map(order => {
      const date = new Date(order.date).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="order-card">
          <div class="order-card-header">
            <span class="order-date">${date}</span>
            <span class="order-total">${formatPrice(order.total)}</span>
          </div>
          <ul class="order-items-list">
            ${order.items.map(item =>
              `<li>${item.quantity}x ${escapeHTML(item.name)} — ${formatPrice(item.price * item.quantity)}</li>`
            ).join('')}
          </ul>
        </div>
      `;
    }).join('');
  }

  function openOrdersModal() {
    renderOrders(); // async — will populate when ready
    document.getElementById('ordersModal')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeOrdersModal() {
    document.getElementById('ordersModal')?.classList.remove('active');
    document.body.style.overflow = '';
  }

  // --- Eventos ---
  function bindEvents() {
    // Profile button -> toggle dropdown
    document.getElementById('btnProfile')?.addEventListener('click', toggleDropdown);

    // Avatar click -> toggle dropdown
    document.getElementById('userAvatar')?.addEventListener('click', toggleDropdown);

    // Close login panel
    document.getElementById('btnCloseLogin')?.addEventListener('click', () => {
      document.getElementById('userDropdown')?.classList.remove('active');
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', e => {
      const wrapper = document.getElementById('userMenuWrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        document.getElementById('userDropdown')?.classList.remove('active');
      }
    });

    // Login form submit (Supabase Auth)
    document.getElementById('loginForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value?.trim();
      const password = document.getElementById('loginPassword')?.value;
      if (!email || !password) return;

      try {
        const { data, error } = await SB.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const user = data.user;
        setUser({
          id: user.id,
          name: user.user_metadata?.name || email.split('@')[0],
          email: user.email,
          picture: user.user_metadata?.avatar_url || ''
        });
        document.getElementById('userDropdown')?.classList.remove('active');
        showToast(`¡Bienvenido, ${currentUser.name}!`, 'success');
      } catch (err) {
        showToast(err.message === 'Invalid login credentials'
          ? 'Correo o contraseña incorrectos'
          : err.message, 'error');
      }
    });

    // Logout (Supabase)
    document.getElementById('btnLogout')?.addEventListener('click', async e => {
      e.preventDefault();
      await logoutUser();
      document.getElementById('userDropdown')?.classList.remove('active');
    });

    // Historial de pedidos
    document.getElementById('btnOrderHistory')?.addEventListener('click', e => {
      e.preventDefault();
      document.getElementById('userDropdown')?.classList.remove('active');
      openOrdersModal();
    });

    // Cerrar modal de pedidos
    document.getElementById('btnCloseOrders')?.addEventListener('click', closeOrdersModal);
    document.getElementById('ordersModal')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeOrdersModal();
    });

    // Create account link -> show registration
    document.getElementById('btnCreateAccount')?.addEventListener('click', e => {
      e.preventDefault();
      showRegisterPanel();
    });

    // Register form submit (Supabase Auth)
    document.getElementById('registerForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('registerName')?.value?.trim();
      const email = document.getElementById('registerEmail')?.value?.trim();
      const password = document.getElementById('registerPassword')?.value;
      const password2 = document.getElementById('registerPassword2')?.value;
      if (!name || !email || !password) return;
      if (password !== password2) { showToast('Las contraseñas no coinciden', 'error'); return; }
      if (password.length < 6) { showToast('La contraseña debe tener al menos 6 caracteres', 'error'); return; }

      try {
        const { data, error } = await SB.client.auth.signUp({
          email,
          password,
          options: { data: { name } }
        });
        if (error) throw error;
        if (data.user) {
          setUser({ id: data.user.id, name, email, picture: '' });
          document.getElementById('userDropdown')?.classList.remove('active');
          hideRegisterPanel();
          showToast(`¡Cuenta creada! Bienvenido, ${name}`, 'success');
        } else {
          showToast('Revisa tu correo para confirmar tu cuenta', 'info');
          hideRegisterPanel();
        }
      } catch (err) {
        showToast(err.message || 'Error al crear la cuenta', 'error');
      }
    });

    // Back to login from register
    document.getElementById('btnBackToLogin')?.addEventListener('click', e => {
      e.preventDefault();
      hideRegisterPanel();
    });
  }

  function toggleDropdown() {
    const dropdown = document.getElementById('userDropdown');
    dropdown?.classList.toggle('active');
  }

  function openLoginDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown && !dropdown.classList.contains('active')) {
      dropdown.classList.add('active');
    }
    // Ensure login panel is visible (not register)
    hideRegisterPanel();
  }

  // --- Registro (UI helpers) ---
  function showRegisterPanel() {
    const lp = document.getElementById('loginPanel');
    const rp = document.getElementById('registerPanel');
    if (lp) lp.style.display = 'none';
    if (rp) rp.style.display = 'block';
  }
  function hideRegisterPanel() {
    const lp = document.getElementById('loginPanel');
    const rp = document.getElementById('registerPanel');
    if (lp) lp.style.display = 'block';
    if (rp) rp.style.display = 'none';
  }

  // --- Utilidades ---
  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  function showToast(message, type = 'info') {
    // Reutilizar si Cart está disponible
    if (typeof Cart !== 'undefined' && Cart.showToast) {
      Cart.showToast(message, type);
      return;
    }

    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      const onEnd = () => { toast.remove(); };
      toast.addEventListener('animationend', onEnd);
      setTimeout(onEnd, 400);
    }, 3000);
  }

  return { init, getUser, isLoggedIn, openLoginDropdown };
})();
