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
    initGoogleSignIn();
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
        if (error) {
          const msg = error.message || '';
          if (msg === 'Invalid login credentials') {
            showToast('Correo o contraseña incorrectos. Verifica tus datos.', 'error');
          } else if (msg.includes('Email not confirmed')) {
            showToast('Tu correo aún no ha sido verificado. Revisa tu bandeja de entrada y confirma tu cuenta.', 'error');
          } else if (msg.includes('Invalid email')) {
            showToast('El correo ingresado no es válido.', 'error');
          } else {
            showToast(msg, 'error');
          }
          return;
        }
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
        showToast('Error al iniciar sesión. Intenta de nuevo.', 'error');
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
          options: {
            data: { name },
            emailRedirectTo: window.location.origin + '/index.html'
          }
        });
        if (error) {
          if (error.message.includes('already registered') || error.message.includes('already been registered')) {
            showToast('Este correo ya está registrado. Intenta iniciar sesión.', 'error');
          } else {
            showToast(error.message || 'Error al crear la cuenta', 'error');
          }
          return;
        }
        // Supabase with email confirmation: user exists but identities might be empty
        // if the email is already taken, or email_confirmed_at is null if confirmation needed
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          // Email already registered
          showToast('Este correo ya está registrado. Intenta iniciar sesión.', 'error');
          return;
        }
        // Always show verification message — Supabase requires email confirmation
        hideRegisterPanel();
        document.getElementById('registerForm')?.reset();
        showToast('✅ ¡Cuenta creada! Revisa tu correo electrónico y haz clic en el enlace de verificación para activar tu cuenta.', 'success', 8000);
      } catch (err) {
        showToast(err.message || 'Error al crear la cuenta', 'error');
      }
    });

    // Back to login from register
    document.getElementById('btnBackToLogin')?.addEventListener('click', e => {
      e.preventDefault();
      hideRegisterPanel();
    });

    // Back to login from register (second link)
    document.getElementById('btnBackToLogin2')?.addEventListener('click', e => {
      e.preventDefault();
      hideRegisterPanel();
    });

    // Forgot password
    document.getElementById('btnForgotPassword')?.addEventListener('click', async e => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value?.trim();
      if (!email) {
        showToast('Escribe tu correo electrónico arriba y luego haz clic en "¿Olvidaste tu contraseña?"', 'info', 5000);
        document.getElementById('loginEmail')?.focus();
        return;
      }
      try {
        const { error } = await SB.client.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/index.html#reset-password'
        });
        if (error) throw error;
        showToast('📧 Te enviamos un enlace para restablecer tu contraseña. Revisa tu correo.', 'success', 6000);
      } catch (err) {
        showToast(err.message || 'Error al enviar el correo de recuperación', 'error');
      }
    });

    // Password visibility toggles
    document.querySelectorAll('.password-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const wrapper = btn.closest('.password-wrapper');
        const input = wrapper?.querySelector('input');
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.querySelector('.eye-open').style.display = show ? 'none' : '';
        btn.querySelector('.eye-closed').style.display = show ? '' : 'none';
      });
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

  function showToast(message, type = 'info', duration) {
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
    }, duration || 3000);
  }

  return { init, getUser, isLoggedIn, openLoginDropdown };
})();
