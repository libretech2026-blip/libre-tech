/* ============================================================
   LIBRE TECH - Cart Module (cart.js)
   Manejo del carrito con persistencia en localStorage
   ============================================================ */

const Cart = (() => {
  'use strict';

  const STORAGE_KEY_BASE = 'libretech_cart';
  const ORDERS_KEY = 'libretech_orders';
  const WHATSAPP_NUMBER = (window.LIBRETECH && window.LIBRETECH.whatsapp) || '573176134822';

  let items = [];
  let appliedCoupon = null; // { id, code, type, value, discount }
  let orderFormOverrideItems = null;
  // Envio calculado desde el carrito; se reutiliza en el resumen del pedido
  let shippingEstimate = null; // { city, department, quote }

  /**
   * Clave única del carrito para el dispositivo.
   * Antes se le añadía el id del usuario: al iniciar sesión se pasaba a leer
   * otra clave (vacía la primera vez) y el carrito del invitado "se perdía".
   */
  function getStorageKey() {
    return STORAGE_KEY_BASE;
  }

  function readCart(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  /** Une dos carritos sumando las cantidades del mismo producto (tope: stock). */
  function mergeCartItems(base, extra) {
    const result = base.map(item => ({ ...item }));
    extra.forEach(item => {
      if (!item || !item.productId) return;
      const existing = result.find(i => i.productId === item.productId);
      if (!existing) {
        result.push({ ...item });
        return;
      }
      const total = (existing.quantity || 0) + (item.quantity || 0);
      const stock = getProductStock(item.productId);
      existing.quantity = stock > 0 ? Math.min(total, stock) : total;
    });
    return result;
  }

  /**
   * Recupera los carritos guardados con el formato anterior
   * (libretech_cart_<uid>) y los fusiona en la clave única.
   * Solo ocurre una vez: las claves antiguas se borran al migrarlas.
   */
  function migrateLegacyCarts() {
    try {
      const legacyKeys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY_BASE + '_'));
      if (legacyKeys.length === 0) return;

      let merged = readCart(STORAGE_KEY_BASE);
      legacyKeys.forEach(key => {
        merged = mergeCartItems(merged, readCart(key));
        localStorage.removeItem(key);
      });
      if (merged.length > 0) localStorage.setItem(STORAGE_KEY_BASE, JSON.stringify(merged));
    } catch (e) {
      console.warn('[Cart] migrateLegacyCarts:', e.message);
    }
  }

  // --- Inicialización ---
  function init() {
    migrateLegacyCarts();
    load();
    ensureCartEnhancements();
    bindEvents();
    updateUI();
    // El carrito ya no depende de la sesión: al entrar o salir solo se
    // refresca la interfaz (antes se recargaba otra clave y quedaba vacío).
    document.addEventListener('auth-changed', () => {
      updateUI();
    });
    // La config de envios/obsequios llega de Supabase despues del render inicial
    document.addEventListener('site-config-loaded', updateUI);
  }

  // --- Persistencia (localStorage) ---
  function load() {
    try {
      const data = localStorage.getItem(getStorageKey());
      items = data ? JSON.parse(data) : [];
    } catch {
      items = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(items));
    } catch {
      // localStorage lleno o no disponible
    }
  }

  // --- Helpers de stock ---
  function getProductStock(productId) {
    const product = getProducts().find(p => p.id === productId);
    return product ? (product.stock ?? 0) : 0;
  }

  function getCartQty(productId) {
    const item = items.find(i => i.productId === productId);
    return item ? item.quantity : 0;
  }

  // --- Operaciones del carrito ---
  function addItem(productId) {
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const stock = product.stock ?? 0;
    const currentQty = getCartQty(productId);

    if (stock <= 0) {
      showToast(`${product.name} está agotado`, 'error');
      return;
    }

    if (currentQty >= stock) {
      showToast(`Solo hay ${stock} unidades disponibles de ${product.name}`, 'error');
      return;
    }

    const existing = items.find(i => i.productId === productId);
    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({ productId, quantity: 1 });
    }

    save();
    updateUI();
    showToast(`${product.name} agregado al carrito`, 'success');
    pulseCartReminder();
  }

  function removeItem(productId) {
    items = items.filter(i => i.productId !== productId);
    save();
    updateUI();
  }

  function updateQuantity(productId, delta) {
    const item = items.find(i => i.productId === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeItem(productId);
      return;
    }

    const stock = getProductStock(productId);
    if (newQty > stock) {
      showToast(`Solo hay ${stock} unidades disponibles`, 'error');
      return;
    }

    item.quantity = newQty;
    save();
    updateUI();
  }

  function setQuantity(productId, qty) {
    const item = items.find(i => i.productId === productId);
    if (!item) return;

    if (qty <= 0) {
      removeItem(productId);
      return;
    }

    const stock = getProductStock(productId);
    if (qty > stock) qty = stock;

    item.quantity = qty;
    save();
    updateUI();
  }

  function clear() {
    items = [];
    save();
    updateUI();
  }

  function getItems() {
    return items;
  }

  function getCount() {
    return items.reduce((sum, i) => sum + i.quantity, 0);
  }

  function getTotal() {
    return getOrderTotal(items);
  }

  function getOrderTotal(orderItems) {
    const products = getProducts();
    return (orderItems || []).reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      const price = product ? getEffectivePrice(product) : 0;
      return sum + (price * item.quantity);
    }, 0);
  }

  function getEffectivePrice(product) {
    return product.offerActive && product.offerPrice ? product.offerPrice : product.price;
  }

  // --- Obtener productos (del admin o seed) ---
  // Se memoriza el parseo: esta función se llama por cada ítem del carrito,
  // por cada obsequio y en cada repintado del resumen.
  let _productsCache = { raw: null, value: [] };

  function getProducts() {
    try {
      const data = localStorage.getItem('libretech_products') || '[]';
      if (data !== _productsCache.raw) {
        _productsCache = { raw: data, value: JSON.parse(data) };
      }
      return _productsCache.value;
    } catch {
      return [];
    }
  }

  // --- Formato de precio COP ---
  function formatPrice(price) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }

  // --- UI del carrito ---
  function updateUI() {
    updateBadge();
    renderCartItems();
    renderGiftNotice();
    updateCartFooter();
    updateCartReminder();
  }

  function updateBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const count = getCount();
    const prev = parseInt(badge.textContent, 10) || 0;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
    if (count > prev) {
      badge.classList.remove('badge-bump');
      void badge.offsetWidth; // reinicia la animacion
      badge.classList.add('badge-bump');
    }
  }

  function renderCartItems() {
    const container = document.getElementById('cartItems');
    const emptyState = document.getElementById('cartEmpty');
    if (!container) return;

    const products = getProducts();

    // Limpiar items anteriores (mantener emptyState)
    container.querySelectorAll('.cart-item').forEach(el => el.remove());

    if (items.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    items.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;

      const el = document.createElement('div');
      el.className = 'cart-item';
      const productUrl = `producto.html?id=${encodeURIComponent(product.id)}`;
      const gift = getGiftFor(product.id);
      el.innerHTML = `
        <a href="${productUrl}" class="cart-item-image cart-item-link" data-action="goto-product" data-id="${product.id}" rel="noopener" aria-label="Ver ${escapeAttr(product.name)}">
          ${product.image
            ? `<img src="${escapeAttr(product.image)}" alt="${escapeAttr(product.name)}" loading="lazy" decoding="async">`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;margin:auto;opacity:.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`
          }
        </a>
        <div class="cart-item-info">
          <a href="${productUrl}" class="cart-item-name cart-item-link" data-action="goto-product" data-id="${product.id}" rel="noopener">${escapeHTML(product.name)}</a>
          <div class="cart-item-price">${product.offerActive && product.offerPrice ? `<span class="offer-price">${formatPrice(product.offerPrice)}</span> <span class="product-price-original">${formatPrice(product.price)}</span>` : formatPrice(product.price)}</div>
          ${gift ? `<div class="cart-item-gift" title="Obsequio incluido">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
            <span>Incluye de regalo: <strong>${escapeHTML(gift)}</strong></span>
          </div>` : ''}
          <div class="cart-item-controls">
            <button class="qty-btn" data-action="decrease" data-id="${product.id}" aria-label="Disminuir cantidad">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button class="qty-btn" data-action="increase" data-id="${product.id}" aria-label="Aumentar cantidad">+</button>
            <button class="cart-item-remove" data-action="remove" data-id="${product.id}" aria-label="Eliminar producto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
      container.appendChild(el);
    });
  }

  function updateCartFooter() {
    const footer = document.getElementById('cartFooter');
    const totalEl = document.getElementById('cartTotal');
    const countEl = document.getElementById('cartItemsCount');

    if (footer) {
      footer.style.display = items.length > 0 ? 'block' : 'none';
    }
    const contWrap = document.getElementById('cartContinueWrapper');
    if (contWrap) {
      contWrap.style.display = items.length > 0 ? 'block' : 'none';
    }
    if (totalEl) {
      totalEl.textContent = formatPrice(getTotal());
    }
    if (countEl) {
      const count = getCount();
      countEl.textContent = count > 0 ? `(${count} ${count === 1 ? 'item' : 'items'})` : '';
    }

    renderFreeShippingProgress();
    renderShippingCalculator();
  }

  /* ============================================================
     OBSEQUIOS
     ============================================================ */
  function getGiftFor(productId) {
    return (typeof Gifts !== 'undefined' && Gifts.forProduct) ? Gifts.forProduct(productId) : '';
  }

  function getGiftsForItems(orderItems) {
    return (typeof Gifts !== 'undefined' && Gifts.forItems) ? Gifts.forItems(orderItems || items) : [];
  }

  function renderGiftNotice() {
    const box = document.getElementById('cartGiftNotice');
    if (!box) return;

    const gifts = getGiftsForItems(items);
    if (gifts.length === 0) {
      box.style.display = 'none';
      box.innerHTML = '';
      return;
    }

    box.style.display = 'block';
    box.innerHTML = `
      <div class="gift-notice-head">
        <span class="gift-notice-icon" aria-hidden="true">🎁</span>
        <strong>${gifts.length === 1 ? '¡Tu compra incluye un obsequio!' : `¡Tu compra incluye ${gifts.length} obsequios!`}</strong>
      </div>
      <ul class="gift-notice-list">
        ${gifts.map(g => `<li><span class="gift-notice-product">${escapeHTML(g.name)}</span><span class="gift-notice-gift">${escapeHTML(g.gift)}</span></li>`).join('')}
      </ul>
    `;
  }

  /* ============================================================
     ENVIO: barra de progreso + calculadora
     ============================================================ */
  function renderFreeShippingProgress() {
    const box = document.getElementById('cartShippingProgress');
    if (!box || typeof Shipping === 'undefined') return;

    const progress = Shipping.getFreeShippingProgress(getTotal());
    box.classList.toggle('reached', progress.reached);
    box.innerHTML = `
      <div class="ship-progress-text">
        ${progress.reached
          ? `<span class="ship-progress-icon" aria-hidden="true">🚚</span> <strong>¡Felicidades! Tu envío es GRATIS</strong>`
          : `Te faltan <strong>${formatPrice(progress.missing)}</strong> para <strong>envío gratis</strong>`}
      </div>
      <div class="ship-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}" aria-label="Progreso hacia el envío gratis">
        <div class="ship-progress-fill" style="width:${progress.percent}%"></div>
      </div>
      <div class="ship-progress-legend">
        <span>${formatPrice(progress.amount)}</span>
        <span>Envío gratis desde ${formatPrice(progress.threshold)}</span>
      </div>
    `;
  }

  function renderShippingCalculator() {
    const box = document.getElementById('cartShippingCalc');
    if (!box || typeof Shipping === 'undefined') return;

    // Solo se reconstruye la estructura una vez para no perder lo que el usuario escribe
    if (!box.dataset.ready) {
      box.innerHTML = `
        <button type="button" class="ship-calc-toggle" id="shipCalcToggle" aria-expanded="false" aria-controls="shipCalcBody">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <span>Calcular costo de envío</span>
          <svg class="ship-calc-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="ship-calc-body" id="shipCalcBody" hidden>
          <div class="ship-calc-fields">
            <select id="shipCalcDept" class="ship-calc-input" aria-label="Departamento"></select>
            <select id="shipCalcCity" class="ship-calc-input" aria-label="Ciudad" disabled></select>
            <button type="button" class="ship-calc-btn" id="shipCalcBtn">Calcular</button>
          </div>
          <div class="ship-calc-result" id="shipCalcResult"></div>
        </div>
      `;
      box.dataset.ready = '1';

      const deptSelect = box.querySelector('#shipCalcDept');
      const citySelect = box.querySelector('#shipCalcCity');

      if (typeof ColombiaLocations !== 'undefined') {
        ColombiaLocations.fillDepartmentSelect(deptSelect, shippingEstimate?.department);
        ColombiaLocations.fillCitySelect(citySelect, shippingEstimate?.department, shippingEstimate?.city);
        // Al elegir departamento se recargan sus ciudades
        deptSelect.addEventListener('change', () => {
          ColombiaLocations.fillCitySelect(citySelect, deptSelect.value);
          document.getElementById('shipCalcResult').innerHTML = '';
        });
      }

      const toggle = box.querySelector('#shipCalcToggle');
      const body = box.querySelector('#shipCalcBody');
      toggle.addEventListener('click', () => {
        const open = body.hasAttribute('hidden');
        body.toggleAttribute('hidden', !open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.classList.toggle('open', open);
        if (open) deptSelect?.focus();
      });

      box.querySelector('#shipCalcBtn').addEventListener('click', () => calculateShipping());
      citySelect.addEventListener('change', () => { if (citySelect.value) calculateShipping(); });
    }

    // Refresca el resultado si el total cambio (afecta el envio gratis)
    if (shippingEstimate) calculateShipping({ silent: true });
  }

  function calculateShipping(options = {}) {
    if (typeof Shipping === 'undefined') return;
    const cityEl = document.getElementById('shipCalcCity');
    const deptEl = document.getElementById('shipCalcDept');
    const resultEl = document.getElementById('shipCalcResult');
    if (!resultEl) return;

    const city = (cityEl?.value || shippingEstimate?.city || '').trim();
    const department = (deptEl?.value || shippingEstimate?.department || '').trim();

    if (!city) {
      if (options.silent !== true) {
        resultEl.innerHTML = '<span class="ship-calc-error">Elige tu departamento y ciudad para estimar el envío.</span>';
      }
      return;
    }

    const quote = Shipping.quote({ city, department, subtotal: getTotal() });
    shippingEstimate = { city, department, quote };

    resultEl.innerHTML = `
      <div class="ship-calc-row">
        <span>${escapeHTML(city)}${department ? ', ' + escapeHTML(department) : ''}</span>
        <strong class="${quote.free ? 'ship-free' : ''}">${quote.free ? 'GRATIS' : formatPrice(quote.cost)}</strong>
      </div>
      <div class="ship-calc-meta">Zona: ${escapeHTML(quote.zoneName)} · Entrega estimada ${escapeHTML(quote.eta)}</div>
      ${quote.free ? `<div class="ship-calc-meta ship-free">Superaste ${formatPrice(quote.threshold)}: el envío corre por nuestra cuenta.</div>` : ''}
      <div class="ship-calc-note">${escapeHTML(quote.note)}</div>
    `;
  }

  /* ============================================================
     RECORDATORIO PERSISTENTE DE CARRITO
     ============================================================ */
  function ensureCartEnhancements() {
    const footer = document.getElementById('cartFooter');
    if (footer && !document.getElementById('cartShippingProgress')) {
      const anchor = footer.querySelector('.cart-subtotal') || footer.firstChild;

      const progress = document.createElement('div');
      progress.className = 'ship-progress';
      progress.id = 'cartShippingProgress';

      const gift = document.createElement('div');
      gift.className = 'gift-notice';
      gift.id = 'cartGiftNotice';
      gift.style.display = 'none';

      const calc = document.createElement('div');
      calc.className = 'ship-calc';
      calc.id = 'cartShippingCalc';

      footer.insertBefore(progress, anchor);
      footer.insertBefore(gift, anchor);
      footer.insertBefore(calc, anchor);
    }

    if (!document.getElementById('cartReminder')) {
      const reminder = document.createElement('button');
      reminder.type = 'button';
      reminder.className = 'cart-reminder';
      reminder.id = 'cartReminder';
      reminder.setAttribute('aria-label', 'Tienes productos en el carrito. Abrir carrito');
      reminder.innerHTML = `
        <span class="cart-reminder-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          <span class="cart-reminder-count" id="cartReminderCount">0</span>
        </span>
        <span class="cart-reminder-text">
          <strong id="cartReminderTitle">Tienes productos en tu carrito</strong>
          <span id="cartReminderTotal"></span>
        </span>
        <span class="cart-reminder-cta">Ver carrito</span>
      `;
      reminder.addEventListener('click', open);
      document.body.appendChild(reminder);
    }
  }

  function updateCartReminder() {
    const reminder = document.getElementById('cartReminder');
    if (!reminder) return;

    const count = getCount();
    if (count === 0) {
      reminder.classList.remove('visible');
      return;
    }

    const countEl = document.getElementById('cartReminderCount');
    const titleEl = document.getElementById('cartReminderTitle');
    const totalEl = document.getElementById('cartReminderTotal');
    if (countEl) countEl.textContent = count;
    if (titleEl) titleEl.textContent = count === 1 ? '1 producto en tu carrito' : `${count} productos en tu carrito`;
    if (totalEl) totalEl.textContent = `Total ${formatPrice(getTotal())}`;

    // El carrito abierto no necesita recordatorio
    const cartOpen = document.getElementById('cartSidebar')?.classList.contains('active');
    reminder.classList.toggle('visible', !cartOpen);
  }

  function pulseCartReminder() {
    const reminder = document.getElementById('cartReminder');
    if (!reminder) return;
    reminder.classList.remove('pulse');
    void reminder.offsetWidth; // reinicia la animacion
    reminder.classList.add('pulse');
    setTimeout(() => reminder.classList.remove('pulse'), 900);
  }

  // --- Abrir/Cerrar carrito ---
  function open() {
    document.getElementById('cartOverlay')?.classList.add('active');
    document.getElementById('cartSidebar')?.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateCartReminder();
  }

  function close() {
    document.getElementById('cartOverlay')?.classList.remove('active');
    document.getElementById('cartSidebar')?.classList.remove('active');
    document.body.style.overflow = '';
    updateCartReminder();
  }

  // --- Eventos ---
  function bindEvents() {
    // Abrir carrito
    document.getElementById('btnOpenCart')?.addEventListener('click', open);

    // Cerrar carrito
    document.getElementById('btnCloseCart')?.addEventListener('click', close);
    document.getElementById('cartOverlay')?.addEventListener('click', close);

    // Tecla Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });

    // Clicks en items del carrito (delegación)
    document.getElementById('cartItems')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const { action, id } = btn.dataset;

      if (action === 'goto-product') {
        // Deja que el <a> navegue normal, pero cerramos el carrito antes
        document.body.style.overflow = '';
        document.getElementById('cartSidebar')?.classList.remove('active');
        document.getElementById('cartOverlay')?.classList.remove('active');
        return;
      }

      // Para los demás acciones (botones), prevenir default por si acaso
      if (btn.tagName === 'BUTTON') e.preventDefault();

      if (action === 'increase') updateQuantity(id, 1);
      else if (action === 'decrease') updateQuantity(id, -1);
      else if (action === 'remove') removeItem(id);
    });

    // Botón contraentrega (WhatsApp) — now opens form
    document.getElementById('btnWhatsApp')?.addEventListener('click', sendToWhatsApp);

    // Botón pagar en línea
    document.getElementById('btnPayOnline')?.addEventListener('click', payOnline);

    // Seguir comprando desde el carrito
    document.getElementById('btnContinueShoppingCart')?.addEventListener('click', () => {
      // Close cart and go to products lobby
      close();
      window.location.href = 'index.html';
    });

    // Order form events
    document.getElementById('btnCloseOrderForm')?.addEventListener('click', closeOrderForm);
    document.getElementById('orderFormModal')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeOrderForm();
    });
    document.getElementById('whatsappOrderForm')?.addEventListener('submit', submitWhatsAppOrder);

    // Departamento → municipios (catálogo de ColombiaLocations)
    initOrderLocationSelects();

    // Al corregir un campo se retira su aviso de error
    document.getElementById('whatsappOrderForm')?.addEventListener('input', e => {
      if (e.target.classList?.contains('has-error') && e.target.value.trim()) {
        setFieldError(e.target.id, '');
      }
    });

    // Order form auth buttons — abren el panel de sesion/registro.
    // stopPropagation evita que el listener global de auth.js (cierre al
    // hacer clic fuera del menu de usuario) cierre el panel en el mismo clic.
    document.getElementById('orderFormLoginBtn')?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openAuthPanel('login');
    });
    document.getElementById('orderFormRegisterBtn')?.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openAuthPanel('register');
    });
  }

  /**
   * Cierra el formulario de pedido y abre el panel de autenticacion.
   * Se difiere al siguiente tick para que el listener global de auth.js
   * ("cerrar al hacer clic fuera") ya haya corrido cuando abrimos el panel.
   */
  function openAuthPanel(mode) {
    closeOrderForm();
    close();
    setTimeout(() => {
      if (typeof Auth === 'undefined') return;
      if (mode === 'register' && Auth.openRegisterDropdown) Auth.openRegisterDropdown();
      else if (Auth.openLoginDropdown) Auth.openLoginDropdown();
    }, 0);
  }

  // --- Generar número de pedido YYYYMMDDXXXX ---
  function generateOrderNumber() {
    const now = new Date();
    const datePrefix = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0');

    const COUNTER_KEY = 'libretech_order_counter';
    let counterData;
    try {
      counterData = JSON.parse(localStorage.getItem(COUNTER_KEY) || '{}');
    } catch { counterData = {}; }

    // Reset sequence each day, start at 1000
    if (counterData.date !== datePrefix) {
      counterData = { date: datePrefix, seq: 1000 };
    }

    const orderNum = datePrefix + counterData.seq;
    counterData.seq++;
    localStorage.setItem(COUNTER_KEY, JSON.stringify(counterData));
    return orderNum;
  }

  // --- Descontar stock tras orden (Supabase + localStorage) ---
  function decrementStock(orderItems) {
    try {
      const products = getProducts();
      const sbItems = [];
      const itemsToDecrement = orderItems || items;
      itemsToDecrement.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          product.stock = Math.max(0, (product.stock ?? 0) - item.quantity);
          sbItems.push({ productId: item.productId, quantity: item.quantity, currentStock: product.stock });
        }
      });
      localStorage.setItem('libretech_products', JSON.stringify(products));
      // Also update Supabase
      if (typeof SB !== 'undefined' && SB.decrementStock) {
        SB.decrementStock(sbItems).catch(e => console.warn('[Cart] SB stock update:', e));
      }
    } catch { /* silent */ }
  }

  // --- Contraentrega (WhatsApp) --- opens order form instead of direct WA ---
  function sendToWhatsApp() {
    if (items.length === 0) return;
    openOrderForm();
  }

  // --- Open WhatsApp Order Form ---
  /* --- Coupon handling --- */
  async function applyCouponFromInput() {
    const input = document.getElementById('couponInput');
    const statusEl = document.getElementById('couponStatus');
    if (!input || !input.value.trim()) { if (statusEl) statusEl.innerHTML = '<span style="color:#ef4444">Ingresa un codigo</span>'; return; }
    if (typeof SB === 'undefined' || !SB.validateCoupon) { if (statusEl) statusEl.innerHTML = '<span style="color:#ef4444">Servicio no disponible</span>'; return; }
    try {
      const total = getOrderTotal(orderFormOverrideItems || items);
      const coupon = await SB.validateCoupon(input.value, total);
      const discount = coupon.type === 'percentage' ? Math.round(total * coupon.value / 100) : Math.min(coupon.value, total);
      appliedCoupon = { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, discount };
      refreshOrderSummary();
    } catch (e) {
      if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444">${escapeHTML(e.message)}</span>`;
    }
  }

  function removeCoupon() {
    appliedCoupon = null;
    refreshOrderSummary();
  }

  /**
   * Abre (o refresca) el formulario de pedido.
   * @param {{prefill?: boolean}} options prefill:false conserva lo que el
   *   cliente ya escribio — se usa al refrescar el resumen (cupon, envio).
   */
  async function openOrderForm(options = {}) {
    const { prefill = true } = options;
    const modal = document.getElementById('orderFormModal');
    if (!modal) return;

    initOrderLocationSelects();   // idempotente: solo llena las listas una vez
    if (prefill) clearOrderFormErrors();

    const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
    const authBanner = document.getElementById('orderFormAuthBanner');
    const saveLabel = document.getElementById('orderSaveDataLabel');

    // Show/hide auth banner and save checkbox
    if (user && prefill) {
      if (authBanner) authBanner.style.display = 'none';
      if (saveLabel) saveLabel.style.display = 'flex';

      // Try to load saved profile
      if (typeof SB !== 'undefined' && SB.getCustomerProfile) {
        try {
          const profile = await SB.getCustomerProfile(user.id);
          if (profile) {
            document.getElementById('orderName').value = profile.full_name || user.user_metadata?.name || '';
            document.getElementById('orderPhone').value = profile.phone || '';
            document.getElementById('orderAddress').value = profile.address || '';
            document.getElementById('orderNeighborhood').value = profile.neighborhood || '';
            setOrderLocation(profile.department, profile.city);
            document.getElementById('orderNotes').value = profile.notes || '';
          } else {
            document.getElementById('orderName').value = user.user_metadata?.name || '';
          }
        } catch {
          document.getElementById('orderName').value = user.user_metadata?.name || '';
        }
      } else {
        document.getElementById('orderName').value = user.user_metadata?.name || '';
      }
    } else if (user) {
      if (authBanner) authBanner.style.display = 'none';
      if (saveLabel) saveLabel.style.display = 'flex';
    } else {
      if (authBanner) authBanner.style.display = 'block';
      if (saveLabel) saveLabel.style.display = 'none';
    }

    // Build order summary
    const summaryEl = document.getElementById('orderSummary');
    if (summaryEl) {
      const products = getProducts();
      const orderItems = orderFormOverrideItems || items;
      let html = '<p class="order-summary-title">Resumen del pedido</p>';
      orderItems.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;
        const ep = getEffectivePrice(product);
        html += `<div class="order-summary-row">
          <span>${item.quantity}x ${escapeHTML(product.name.substring(0, 40))}${product.name.length > 40 ? '…' : ''}</span>
          <span class="order-summary-amount">${formatPrice(ep * item.quantity)}</span>
        </div>`;
      });
      html += `<div class="order-summary-subtotal">
        <span>Subtotal</span><span>${formatPrice(getOrderTotal(orderItems))}</span>
      </div>`;

      // Coupon input
      html += `<div class="coupon-box">
        <div class="coupon-box-row">
          <input type="text" id="couponInput" class="coupon-input" placeholder="Código de cupón" />
          <button type="button" id="btnApplyCoupon" class="coupon-btn">Aplicar</button>
        </div>
        <div id="couponStatus" class="coupon-status"></div>
      </div>`;

      // Show discount if coupon applied
      if (appliedCoupon) {
        html += `<div class="order-summary-row order-summary-discount">
          <span>Cupón (${escapeHTML(appliedCoupon.code)})</span><span>-${formatPrice(appliedCoupon.discount)}</span>
        </div>`;
      }

      // Envio + obsequios
      html += buildOrderShippingHTML(orderItems);
      html += buildOrderGiftsHTML(orderItems);

      const shipping = getOrderShipping(orderItems);
      const grandTotal = getOrderGrandTotal(orderItems);
      html += `<div class="order-summary-total">
        <span>Total${shipping.included ? ' (con envío)' : ''}</span><span>${formatPrice(grandTotal)}</span>
      </div>`;
      if (!shipping.included) {
        html += `<div class="order-summary-hint">El costo del envío se confirma por WhatsApp según tu ciudad.</div>`;
      }

      summaryEl.innerHTML = html;

      // Bind coupon button
      setTimeout(() => {
        document.getElementById('btnApplyCoupon')?.addEventListener('click', applyCouponFromInput);
        if (appliedCoupon) {
          const inp = document.getElementById('couponInput');
          if (inp) { inp.value = appliedCoupon.code; inp.disabled = true; }
          document.getElementById('btnApplyCoupon').textContent = 'Quitar';
          document.getElementById('btnApplyCoupon').onclick = removeCoupon;
        }
        bindOrderShippingEvents();
      }, 0);
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /* ============================================================
     ENVIO Y OBSEQUIOS EN EL RESUMEN DEL PEDIDO
     ============================================================ */

  /** Subtotal del pedido ya con el cupon aplicado. */
  function getOrderNetSubtotal(orderItems) {
    const subtotal = getOrderTotal(orderItems);
    return appliedCoupon ? Math.max(0, subtotal - appliedCoupon.discount) : subtotal;
  }

  /**
   * Envio del pedido. `included: false` significa que el cliente aun no
   * indico ciudad, asi que el total se muestra sin envio.
   */
  function getOrderShipping(orderItems) {
    if (typeof Shipping === 'undefined') return { included: false, cost: 0, free: false };

    const city = (document.getElementById('orderCity')?.value || shippingEstimate?.city || '').trim();
    const department = (document.getElementById('orderDepartment')?.value || shippingEstimate?.department || '').trim();
    const subtotal = getOrderNetSubtotal(orderItems);
    const quote = Shipping.quote({ city, department, subtotal });

    return { included: !!city, city, department, cost: quote.cost, free: quote.free, quote };
  }

  function getOrderGrandTotal(orderItems) {
    const shipping = getOrderShipping(orderItems);
    return getOrderNetSubtotal(orderItems) + (shipping.included ? shipping.cost : 0);
  }

  function buildOrderShippingHTML(orderItems) {
    if (typeof Shipping === 'undefined') return '';

    const shipping = getOrderShipping(orderItems);
    const progress = Shipping.getFreeShippingProgress(getOrderNetSubtotal(orderItems));
    const q = shipping.quote;

    return `
      <div class="order-shipping" id="orderShippingBox">
        <div class="order-shipping-head">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <strong>Envío</strong>
        </div>
        <div class="ship-progress ${progress.reached ? 'reached' : ''}">
          <div class="ship-progress-text">
            ${progress.reached
              ? '<strong>Envío GRATIS aplicado</strong>'
              : `Te faltan <strong>${formatPrice(progress.missing)}</strong> para envío gratis`}
          </div>
          <div class="ship-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}">
            <div class="ship-progress-fill" style="width:${progress.percent}%"></div>
          </div>
        </div>
        <div class="order-summary-row">
          <span>${shipping.included ? escapeHTML(q.zoneName) : 'Selecciona tu ciudad para calcularlo'}</span>
          <span class="order-summary-amount ${shipping.free ? 'ship-free' : ''}">
            ${shipping.included ? (shipping.free ? 'GRATIS' : formatPrice(shipping.cost)) : 'Por calcular'}
          </span>
        </div>
        ${shipping.included ? `<div class="order-shipping-meta">Entrega estimada: ${escapeHTML(q.eta)}</div>` : ''}
        <button type="button" class="order-shipping-recalc" id="btnRecalcShipping">Recalcular con mi ciudad</button>
        <div class="order-shipping-note">${escapeHTML(q.note)}</div>
      </div>
    `;
  }

  function buildOrderGiftsHTML(orderItems) {
    const gifts = getGiftsForItems(orderItems);
    if (gifts.length === 0) return '';
    return `
      <div class="order-gifts">
        <div class="order-gifts-head"><span aria-hidden="true">🎁</span> <strong>Obsequios incluidos</strong></div>
        <ul class="order-gifts-list">
          ${gifts.map(g => `<li><span>${escapeHTML(g.name)}</span><em>${escapeHTML(g.gift)}</em></li>`).join('')}
        </ul>
      </div>
    `;
  }

  function bindOrderShippingEvents() {
    document.getElementById('btnRecalcShipping')?.addEventListener('click', () => {
      const city = document.getElementById('orderCity')?.value.trim();
      if (!city) {
        showToast('Selecciona departamento y ciudad para calcular el envío', 'info');
        const dept = document.getElementById('orderDepartment');
        (dept && !dept.value ? dept : document.getElementById('orderCity'))?.focus();
        return;
      }
      shippingEstimate = {
        city,
        department: document.getElementById('orderDepartment')?.value.trim() || '',
        quote: null
      };
      refreshOrderSummary();
    });
  }

  /** Reconstruye el resumen conservando lo que el cliente ya escribio. */
  function refreshOrderSummary() {
    openOrderForm({ prefill: false });
  }

  function closeOrderForm() {
    orderFormOverrideItems = null;
    const modal = document.getElementById('orderFormModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function openOrderFormWithItems(customItems) {
    if (!Array.isArray(customItems) || customItems.length === 0) return;
    orderFormOverrideItems = customItems.map(item => ({ ...item }));
    openOrderForm();
  }

  /* ------------------------------------------------------------
     DEPARTAMENTO Y CIUDAD DEL PEDIDO
     Dos listas encadenadas con el catálogo de ColombiaLocations: al elegir
     departamento se cargan sus municipios. Evita erratas que rompían la
     cotización de envío cuando eran campos de texto libre.
     ------------------------------------------------------------ */
  function normalizeLocation(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /** Selecciona una opción ignorando tildes y mayúsculas. */
  function selectOptionByValue(select, value) {
    if (!select) return false;
    const target = normalizeLocation(value);
    if (!target) { select.value = ''; return false; }
    const match = Array.from(select.options).find(o => o.value && normalizeLocation(o.value) === target);
    if (!match) return false;
    select.value = match.value;
    return true;
  }

  function initOrderLocationSelects() {
    const dept = document.getElementById('orderDepartment');
    const city = document.getElementById('orderCity');
    if (!dept || !city || typeof ColombiaLocations === 'undefined') return;
    if (dept.dataset.locationsReady) return;
    dept.dataset.locationsReady = '1';

    ColombiaLocations.fillDepartmentSelect(dept);
    ColombiaLocations.fillCitySelect(city, '');

    dept.addEventListener('change', () => {
      ColombiaLocations.fillCitySelect(city, dept.value);
      setFieldError('orderDepartment', '');
      refreshOrderSummary();   // el envío se cotiza por zona
    });

    city.addEventListener('change', () => {
      setFieldError('orderCity', '');
      refreshOrderSummary();
    });
  }

  /**
   * Coloca el departamento y la ciudad guardados en el perfil.
   * Los perfiles antiguos guardaban texto libre (y a veces solo la ciudad),
   * así que se comparan sin tildes y se deduce el departamento si falta.
   */
  function setOrderLocation(department, cityName) {
    const dept = document.getElementById('orderDepartment');
    const city = document.getElementById('orderCity');
    if (!dept || !city || typeof ColombiaLocations === 'undefined') return;

    let deptName = department;
    if (!normalizeLocation(deptName) && cityName) {
      deptName = ColombiaLocations.findDepartmentByCity(cityName);
    }

    if (!selectOptionByValue(dept, deptName)) {
      dept.value = '';
      ColombiaLocations.fillCitySelect(city, '');
      return;
    }

    ColombiaLocations.fillCitySelect(city, dept.value);
    selectOptionByValue(city, cityName);
  }

  /* ------------------------------------------------------------
     VALIDACIÓN DE CAMPOS OBLIGATORIOS DEL PEDIDO
     Además del `required` del navegador, se marca el campo en rojo y se
     escribe el motivo debajo, para que el aviso se vea igual en móvil.
     ------------------------------------------------------------ */
  function setFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    const group = input.closest('.form-group') || input.parentElement;
    input.classList.toggle('has-error', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');

    let hint = group?.querySelector('.form-error');
    if (!message) { hint?.remove(); return; }

    if (!hint) {
      hint = document.createElement('small');
      hint.className = 'form-error';
      group?.appendChild(hint);
    }
    hint.textContent = message;
  }

  function clearOrderFormErrors() {
    ['orderName', 'orderPhone', 'orderAddress', 'orderCity', 'orderDepartment']
      .forEach(id => setFieldError(id, ''));
  }

  /** @returns {boolean} true si el formulario está completo */
  function validateOrderForm() {
    // En el mismo orden en que aparecen en el formulario: el foco va al
    // primero que falte, y la ciudad depende del departamento.
    const required = [
      { id: 'orderName',       message: 'Escribe tu nombre completo' },
      { id: 'orderPhone',      message: 'Escribe tu teléfono o WhatsApp' },
      { id: 'orderAddress',    message: 'Escribe tu dirección de entrega' },
      { id: 'orderDepartment', message: 'Selecciona tu departamento' },
      { id: 'orderCity',       message: 'Selecciona tu ciudad' }
    ];

    clearOrderFormErrors();

    const missing = required.filter(f => !(document.getElementById(f.id)?.value || '').trim());
    missing.forEach(f => setFieldError(f.id, f.message));

    if (missing.length === 0) return true;

    const first = document.getElementById(missing[0].id);
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    first?.focus({ preventScroll: true });
    showToast(missing[0].message, 'error');
    return false;
  }

  // --- Submit order via WhatsApp ---
  async function submitWhatsAppOrder(e) {
    e.preventDefault();

    if (!validateOrderForm()) return;

    // La pestaña de WhatsApp se reserva aquí, todavía dentro del gesto del
    // clic. Más abajo se espera la confirmación de Supabase, y pedir la
    // ventana después de ese await la haría caer en el bloqueador de
    // ventanas emergentes (Safari sobre todo). La URL se asigna al final.
    const waWindow = window.open('', '_blank');

    const name = document.getElementById('orderName').value.trim();
    const phone = document.getElementById('orderPhone').value.trim();
    const address = document.getElementById('orderAddress').value.trim();
    const neighborhood = document.getElementById('orderNeighborhood').value.trim();
    const city = document.getElementById('orderCity').value.trim();
    const department = document.getElementById('orderDepartment').value.trim();
    const notes = document.getElementById('orderNotes').value.trim();

    const orderNumber = generateOrderNumber();
    const products = getProducts();
    const orderItems = orderFormOverrideItems || items;

    // Save profile if logged in and checkbox is checked
    const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
    if (user && document.getElementById('orderSaveData')?.checked) {
      if (typeof SB !== 'undefined' && SB.upsertCustomerProfile) {
        SB.upsertCustomerProfile(user.id, {
          full_name: name,
          phone: phone,
          address: address,
          neighborhood: neighborhood,
          city: city,
          department: department,
          notes: notes
        }).catch(err => console.warn('[Cart] Save profile:', err));
      }
    }

    // Build WhatsApp message — clean, professional format
    let message = `*PEDIDO ${orderNumber}*\n`;
    message += `LIBRE TECH - Tienda Online\n`;
    message += `--------------------------------\n\n`;
    message += `*DATOS DEL CLIENTE*\n`;
    message += `Nombre: ${name}\n`;
    message += `Telefono: ${phone}\n`;
    message += `Direccion: ${address}`;
    if (neighborhood) message += `, ${neighborhood}`;
    message += `\nCiudad: ${city}`;
    if (department) message += ` - ${department}`;
    message += `\n`;
    if (notes) message += `Observaciones: ${notes}\n`;
    message += `\n*PRODUCTOS*\n\n`;

    orderItems.forEach((item, i) => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;
      const ep = getEffectivePrice(product);
      message += `${i + 1}. ${product.name}\n`;
      message += `   Cant: ${item.quantity} x ${formatPrice(ep).replace(/\s/g, '')} = ${formatPrice(ep * item.quantity).replace(/\s/g, '')}\n\n`;
    });

    // Obsequios aplicables
    const gifts = getGiftsForItems(orderItems);
    if (gifts.length > 0) {
      message += `*OBSEQUIOS INCLUIDOS*\n`;
      gifts.forEach(g => { message += `- ${g.name}: ${g.gift}\n`; });
      message += `\n`;
    }

    message += `--------------------------------\n`;
    const subtotal = getOrderTotal(orderItems);
    const netSubtotal = appliedCoupon ? Math.max(0, subtotal - appliedCoupon.discount) : subtotal;
    const shipping = getOrderShipping(orderItems);

    message += `Subtotal: ${formatPrice(subtotal).replace(/\s/g, '')}\n`;
    if (appliedCoupon) {
      message += `Cupon ${appliedCoupon.code}: -${formatPrice(appliedCoupon.discount).replace(/\s/g, '')}\n`;
    }
    if (shipping.included) {
      message += `Envio (${shipping.quote.zoneName}): ${shipping.free ? 'GRATIS' : formatPrice(shipping.cost).replace(/\s/g, '')}\n`;
      message += `Entrega estimada: ${shipping.quote.eta}\n`;
      message += `*TOTAL: ${formatPrice(netSubtotal + shipping.cost).replace(/\s/g, '')}*\n\n`;
    } else {
      message += `Envio: por confirmar\n`;
      message += `*TOTAL (sin envio): ${formatPrice(netSubtotal).replace(/\s/g, '')}*\n\n`;
    }

    // Date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
    message += `Fecha: ${dateStr} - ${timeStr}\n\n`;

    message += `IMPORTANTE:\n`;
    message += `Por favor confirmar disponibilidad y tiempo de entrega.\n\n`;
    message += `Estado: Pendiente de confirmacion\n\n`;
    message += `Gracias por comprar en LIBRE TECH`;

    // Save order and decrement stock
    const savedOrder = await saveOrder(orderNumber, 'whatsapp', orderItems);
    decrementStock(orderItems);

    // Increment coupon usage
    if (appliedCoupon && typeof SB !== 'undefined' && SB.incrementCouponUse) {
      SB.incrementCouponUse(appliedCoupon.id).catch(err => console.warn('[Cart] Coupon use:', err));
    }

    /* --- Píxel de Meta: evento Purchase ---------------------------------
       Solo se dispara si Supabase confirmó el pedido (savedOrder.saved), y
       antes de abrir WhatsApp, para que quede registrado aunque el navegador
       bloquee la pestaña o el cliente la cierre enseguida.
       El importe es el mismo "TOTAL" que va en el mensaje de WhatsApp:
       subtotal menos cupón, más envío cuando ya se pudo calcular.        */
    if (savedOrder.saved && typeof fbq === 'function') {
      var orderTotal = netSubtotal + (shipping.included ? shipping.cost : 0);
      var telefonoLimpio = phone.replace(/\D/g, '');
      var nombreCompleto = name.trim();
      var partesNombre = nombreCompleto.split(' ');

      fbq('init', '845390284976126', {
        ph: telefonoLimpio,
        fn: partesNombre[0] || '',
        ln: partesNombre.slice(1).join(' ') || ''
      });

      fbq('track', 'Purchase', {
        value: orderTotal,
        currency: 'COP'
      }, {
        eventID: 'order_' + savedOrder.remoteId
      });
    }

    const encoded = encodeURIComponent(message);
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
    if (waWindow && !waWindow.closed) waWindow.location.href = waUrl;
    else window.open(waUrl, '_blank');

    // Clean up
    appliedCoupon = null;
    shippingEstimate = null;
    closeOrderForm();
    if (!orderFormOverrideItems) {
      clear();
      close();
    }
    orderFormOverrideItems = null;
    showToast(`Pedido ${orderNumber} enviado`, 'success');
  }

  // --- Pago en línea ---
  function payOnline() {
    if (items.length === 0) return;

    const orderNumber = generateOrderNumber();

    // Guardar orden y descontar stock
    saveOrder(orderNumber, 'pago_online');
    decrementStock();

    // TODO: Integrar Wompi - por ahora guardar orden y notificar
    clear();
    close();
    showToast(`Pedido ${orderNumber} creado — Pago en línea próximamente`, 'info');
  }

  /**
   * Guarda la orden en el historial (localStorage + Supabase).
   *
   * Devuelve el resultado del guardado remoto para que quien llame pueda
   * saber si Supabase realmente lo aceptó (SB.saveOrder registra el error en
   * consola y resuelve en null, nunca rechaza). Nunca lanza: quien no
   * necesite el resultado puede seguir llamándola sin await, como antes.
   *
   * @returns {Promise<{localId: string, remoteId: string|null, saved: boolean}>}
   */
  async function saveOrder(orderNumber, method, orderItems) {
    const products = getProducts();
    orderItems = orderItems || items;
    const mappedItems = orderItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        name: product ? product.name : 'Producto desconocido',
        quantity: item.quantity,
        price: product ? getEffectivePrice(product) : 0
      };
    });

    const order = {
      id: orderNumber || generateOrderNumber(),
      date: new Date().toISOString(),
      method: method || 'contraentrega',
      items: mappedItems,
      total: orderItems.reduce((sum, item) => {
        const product = products.find(p => p.id === item.productId);
        return sum + (product ? getEffectivePrice(product) * item.quantity : 0);
      }, 0)
    };

    // Save to localStorage (legacy)
    try {
      const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      orders.unshift(order);
      if (orders.length > 50) orders.length = 50;
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch { /* silent */ }

    // Save to Supabase
    let remote = null;
    if (typeof SB !== 'undefined' && SB.saveOrder) {
      const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
      try {
        remote = await SB.saveOrder({
          id: order.id,
          userId: user?.id || null,
          method: order.method,
          status: 'pending',
          total: order.total,
          items: orderItems
        });
      } catch (e) {
        console.warn('[Cart] SB order save:', e);
        remote = null;
      }
    }

    return { localId: order.id, remoteId: remote?.id || null, saved: !!remote?.id };
  }

  // --- Utilidades ---
  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- Toast ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icons[type] || icons.info} ${escapeHTML(message)}`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      const onEnd = () => { toast.remove(); };
      toast.addEventListener('animationend', onEnd);
      // Fallback: remove after animation duration even if animationend doesn't fire
      setTimeout(onEnd, 400);
    }, 3000);
  }

  // API pública
  return {
    init,
    addItem,
    removeItem,
    updateQuantity,
    setQuantity,
    clear,
    getItems,
    getProductStock,
    getCartQty,
    getCount,
    getTotal,
    getProducts,
    formatPrice,
    open,
    close,
    openOrderFormWithItems,
    updateUI,
    showToast,
    escapeHTML,
    escapeAttr,
    WHATSAPP_NUMBER
  };
})();
