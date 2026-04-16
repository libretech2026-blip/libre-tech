/* ============================================================
   LIBRE TECH - Auth Module (auth.js)
   Login con Google Identity Services + Historial de pedidos
   ============================================================ */

const Auth = (() => {
  'use strict';

  const USER_KEY = 'libretech_user';
  const USERS_KEY = 'libretech_users';
  const ORDERS_KEY = 'libretech_orders';

  // IMPORTANTE: Reemplaza con tu Client ID de Google Cloud Console
  // Para obtenerlo:
  // 1. Ve a https://console.cloud.google.com/
  // 2. Crea un proyecto (o usa uno existente)
  // 3. Habilita "Google Identity Services"
  // 4. En Credenciales > Crear credencial > ID de cliente OAuth 2.0
  // 5. Tipo: Aplicación web
  // 6. Añade tu dominio en "Orígenes autorizados"
  // 7. Copia el Client ID aquí
  const GOOGLE_CLIENT_ID = 'TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

  let currentUser = null;

  // --- Inicialización ---
  function init() {
    loadUser();
    updateUI();
    initGoogleSignIn();
    bindEvents();
  }

  // --- Google Sign-In ---
  function initGoogleSignIn() {
    // Si no hay Client ID configurado, mantener el botón como placeholder
    if (GOOGLE_CLIENT_ID.includes('TU_GOOGLE_CLIENT_ID')) {
      console.info('[Auth] Google Client ID no configurado. El login con Google está deshabilitado.');
      // Cambiar el botón para indicar que no está configurado
      const btn = document.getElementById('btnGoogleLogin');
      if (btn) {
        btn.addEventListener('click', () => {
          showToast('Login con Google no configurado aún. Configura GOOGLE_CLIENT_ID en auth.js', 'info');
        });
      }
      return;
    }

    // Esperar a que el script de Google se cargue
    if (typeof google === 'undefined' || !google.accounts) {
      window.addEventListener('load', () => {
        setTimeout(() => setupGoogleSignIn(), 500);
      });
    } else {
      setupGoogleSignIn();
    }
  }

  function setupGoogleSignIn() {
    if (typeof google === 'undefined' || !google.accounts) {
      console.warn('[Auth] Google Identity Services no disponible');
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Vincular el botón de login
      const btn = document.getElementById('btnGoogleLogin');
      if (btn) {
        btn.addEventListener('click', () => {
          google.accounts.id.prompt();
        });
      }
    } catch (err) {
      console.error('[Auth] Error inicializando Google Sign-In:', err);
    }
  }

  function handleGoogleResponse(response) {
    if (!response.credential) return;

    // Decodificar el JWT token (payload está en la segunda parte)
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));

      const user = {
        id: payload.sub,
        name: payload.name || 'Usuario',
        email: payload.email || '',
        picture: payload.picture || ''
      };

      setUser(user);
      showToast(`¡Bienvenido, ${user.name}!`, 'success');
    } catch (err) {
      console.error('[Auth] Error procesando token de Google:', err);
      showToast('Error al iniciar sesión', 'error');
    }
  }

  // --- User Management ---
  function loadUser() {
    try {
      const data = localStorage.getItem(USER_KEY);
      currentUser = data ? JSON.parse(data) : null;
    } catch {
      currentUser = null;
    }
  }

  function setUser(user) {
    currentUser = user;
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* noop */ }
    updateUI();
  }

  function logoutUser() {
    currentUser = null;
    try {
      localStorage.removeItem(USER_KEY);
    } catch { /* noop */ }

    // Revocar sesión de Google
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.disableAutoSelect();
    }

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

  // --- Historial de pedidos ---
  function getOrders() {
    try {
      return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function renderOrders() {
    const body = document.getElementById('ordersBody');
    if (!body) return;

    const orders = getOrders();

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
    renderOrders();
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

    // Login form submit
    document.getElementById('loginForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value?.trim();
      const password = document.getElementById('loginPassword')?.value;
      if (!email || !password) return;

      const users = getRegisteredUsers();
      const found = users.find(u => u.email === email);
      if (!found) {
        showToast('No existe una cuenta con ese correo', 'error');
        return;
      }
      if (found.password !== password) {
        showToast('Contraseña incorrecta', 'error');
        return;
      }
      const user = { id: found.id, name: found.name, email: found.email, picture: '' };
      setUser(user);
      document.getElementById('userDropdown')?.classList.remove('active');
      showToast(`¡Bienvenido, ${user.name}!`, 'success');
    });

    // Logout
    document.getElementById('btnLogout')?.addEventListener('click', e => {
      e.preventDefault();
      logoutUser();
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

    // Register form submit
    document.getElementById('registerForm')?.addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('registerName')?.value?.trim();
      const email = document.getElementById('registerEmail')?.value?.trim();
      const password = document.getElementById('registerPassword')?.value;
      const password2 = document.getElementById('registerPassword2')?.value;
      if (!name || !email || !password) return;
      if (password !== password2) { showToast('Las contraseñas no coinciden', 'error'); return; }
      if (password.length < 6) { showToast('La contraseña debe tener al menos 6 caracteres', 'error'); return; }
      const users = getRegisteredUsers();
      if (users.find(u => u.email === email)) { showToast('Ya existe una cuenta con ese correo', 'error'); return; }
      const newUser = { id: 'user-' + Date.now(), name, email, password };
      users.push(newUser);
      saveRegisteredUsers(users);
      setUser({ id: newUser.id, name, email, picture: '' });
      document.getElementById('userDropdown')?.classList.remove('active');
      hideRegisterPanel();
      showToast(`¡Cuenta creada! Bienvenido, ${name}`, 'success');
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

  // --- Registro ---
  function getRegisteredUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
  }
  function saveRegisteredUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
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

  return { init, getUser, isLoggedIn };
})();

document.addEventListener('DOMContentLoaded', () => Auth.init());
