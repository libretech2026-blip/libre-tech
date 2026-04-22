/* ============================================================
   LIBRE TECH - Cart Module (cart.js)
   Manejo del carrito con persistencia en localStorage
   ============================================================ */

const Cart = (() => {
  'use strict';

  const STORAGE_KEY_BASE = 'libretech_cart';
  const ORDERS_KEY = 'libretech_orders';
  const WHATSAPP_NUMBER = '573116488816';

  let items = [];
  let appliedCoupon = null; // { id, code, type, value, discount }

  function getStorageKey() {
    const user = (typeof Auth !== 'undefined') && Auth.getUser && Auth.getUser();
    return user ? STORAGE_KEY_BASE + '_' + user.id : STORAGE_KEY_BASE;
  }

  // --- Inicialización ---
  function init() {
    load();
    bindEvents();
    updateUI();
    // Reload cart when user logs in/out
    document.addEventListener('auth-changed', () => {
      load();
      updateUI();
    });
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
    const products = getProducts();
    return items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId);
      const price = product ? (product.offerActive && product.offerPrice ? product.offerPrice : product.price) : 0;
      return sum + (price * item.quantity);
    }, 0);
  }

  function getEffectivePrice(product) {
    return product.offerActive && product.offerPrice ? product.offerPrice : product.price;
  }

  // --- Obtener productos (del admin o seed) ---
  function getProducts() {
    try {
      const data = localStorage.getItem('libretech_products');
      return data ? JSON.parse(data) : [];
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
    updateCartFooter();
  }

  function updateBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const count = getCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
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
      el.innerHTML = `
        <div class="cart-item-image">
          ${product.image
            ? `<img src="${escapeAttr(product.image)}" alt="${escapeAttr(product.name)}" loading="lazy">`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;margin:auto;opacity:.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`
          }
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${escapeHTML(product.name)}</div>
          <div class="cart-item-price">${product.offerActive && product.offerPrice ? `<span class="offer-price">${formatPrice(product.offerPrice)}</span> <span class="product-price-original">${formatPrice(product.price)}</span>` : formatPrice(product.price)}</div>
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
    if (totalEl) {
      totalEl.textContent = formatPrice(getTotal());
    }
    if (countEl) {
      const count = getCount();
      countEl.textContent = count > 0 ? `(${count} ${count === 1 ? 'item' : 'items'})` : '';
    }
  }

  // --- Abrir/Cerrar carrito ---
  function open() {
    document.getElementById('cartOverlay')?.classList.add('active');
    document.getElementById('cartSidebar')?.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    document.getElementById('cartOverlay')?.classList.remove('active');
    document.getElementById('cartSidebar')?.classList.remove('active');
    document.body.style.overflow = '';
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
      if (action === 'increase') updateQuantity(id, 1);
      else if (action === 'decrease') updateQuantity(id, -1);
      else if (action === 'remove') removeItem(id);
    });

    // Botón contraentrega (WhatsApp) — now opens form
    document.getElementById('btnWhatsApp')?.addEventListener('click', sendToWhatsApp);

    // Botón pagar en línea
    document.getElementById('btnPayOnline')?.addEventListener('click', payOnline);

    // Order form events
    document.getElementById('btnCloseOrderForm')?.addEventListener('click', closeOrderForm);
    document.getElementById('orderFormModal')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeOrderForm();
    });
    document.getElementById('whatsappOrderForm')?.addEventListener('submit', submitWhatsAppOrder);

    // Order form auth buttons — open login dropdown
    document.getElementById('orderFormLoginBtn')?.addEventListener('click', () => {
      closeOrderForm();
      if (typeof Auth !== 'undefined' && Auth.openLoginDropdown) Auth.openLoginDropdown();
    });
    document.getElementById('orderFormRegisterBtn')?.addEventListener('click', () => {
      closeOrderForm();
      if (typeof Auth !== 'undefined' && Auth.openLoginDropdown) Auth.openLoginDropdown();
    });
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
  function decrementStock() {
    try {
      const products = getProducts();
      const sbItems = [];
      items.forEach(item => {
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
      const total = getTotal();
      const coupon = await SB.validateCoupon(input.value, total);
      const discount = coupon.type === 'percentage' ? Math.round(total * coupon.value / 100) : Math.min(coupon.value, total);
      appliedCoupon = { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value, discount };
      openOrderForm(); // refresh summary
    } catch (e) {
      if (statusEl) statusEl.innerHTML = `<span style="color:#ef4444">${escapeHTML(e.message)}</span>`;
    }
  }

  function removeCoupon() {
    appliedCoupon = null;
    openOrderForm(); // refresh summary
  }

  async function openOrderForm() {
    const modal = document.getElementById('orderFormModal');
    if (!modal) return;

    const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
    const authBanner = document.getElementById('orderFormAuthBanner');
    const saveLabel = document.getElementById('orderSaveDataLabel');

    // Show/hide auth banner and save checkbox
    if (user) {
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
            document.getElementById('orderCity').value = profile.city || '';
            document.getElementById('orderDepartment').value = profile.department || '';
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
    } else {
      if (authBanner) authBanner.style.display = 'block';
      if (saveLabel) saveLabel.style.display = 'none';
    }

    // Build order summary
    const summaryEl = document.getElementById('orderSummary');
    if (summaryEl) {
      const products = getProducts();
      let html = '<p style="font-weight:600;font-size:0.9rem;margin:0 0 8px;color:var(--text-primary)">Resumen del pedido:</p>';
      items.forEach((item, i) => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;
        const ep = getEffectivePrice(product);
        html += `<div style="display:flex;justify-content:space-between;font-size:0.85rem;padding:3px 0;color:var(--text-secondary)">
          <span>${item.quantity}x ${escapeHTML(product.name.substring(0, 40))}${product.name.length > 40 ? '…' : ''}</span>
          <span style="font-weight:500">${formatPrice(ep * item.quantity)}</span>
        </div>`;
      });
      html += `<div style="border-top:1px solid var(--border-color);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-weight:700;color:var(--text-primary)">
        <span>Subtotal</span><span>${formatPrice(getTotal())}</span>
      </div>`;

      // Coupon input
      html += `<div class="coupon-box" style="margin-top:10px">
        <div style="display:flex;gap:8px;align-items:stretch">
          <input type="text" id="couponInput" placeholder="Código de cupón" style="flex:1 1 auto;min-width:0;padding:10px 12px;border:1px solid var(--border-color);border-radius:var(--radius-md);font-size:0.85rem;text-transform:uppercase;background:var(--bg-primary);color:var(--text-primary)" />
          <button type="button" id="btnApplyCoupon" style="flex:0 0 auto;white-space:nowrap;padding:10px 16px;background:linear-gradient(135deg,var(--primary-blue),#2563eb);color:#fff;border:none;border-radius:var(--radius-md);font-size:0.85rem;cursor:pointer;font-weight:700;letter-spacing:0.02em;box-shadow:0 2px 8px rgba(26,75,140,0.25);transition:transform .15s ease">Aplicar</button>
        </div>
        <div id="couponStatus" style="font-size:0.8rem;margin-top:6px"></div>
      </div>`;

      // Show discount if coupon applied
      if (appliedCoupon) {
        html += `<div style="display:flex;justify-content:space-between;font-size:0.85rem;padding:4px 0;color:#22c55e;font-weight:600">
          <span>Cupon (${escapeHTML(appliedCoupon.code)})</span><span>-${formatPrice(appliedCoupon.discount)}</span>
        </div>`;
        html += `<div style="display:flex;justify-content:space-between;font-weight:700;color:var(--text-primary);font-size:1rem;padding-top:4px">
          <span>Total</span><span>${formatPrice(getTotal() - appliedCoupon.discount)}</span>
        </div>`;
      } else {
        html += `<div style="display:flex;justify-content:space-between;font-weight:700;color:var(--text-primary);font-size:1rem;padding-top:4px">
          <span>Total</span><span>${formatPrice(getTotal())}</span>
        </div>`;
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
      }, 0);
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeOrderForm() {
    const modal = document.getElementById('orderFormModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // --- Submit order via WhatsApp ---
  async function submitWhatsAppOrder(e) {
    e.preventDefault();

    const name = document.getElementById('orderName').value.trim();
    const phone = document.getElementById('orderPhone').value.trim();
    const address = document.getElementById('orderAddress').value.trim();
    const neighborhood = document.getElementById('orderNeighborhood').value.trim();
    const city = document.getElementById('orderCity').value.trim();
    const department = document.getElementById('orderDepartment').value.trim();
    const notes = document.getElementById('orderNotes').value.trim();

    if (!name || !phone || !address || !city) {
      showToast('Completa los campos obligatorios', 'error');
      return;
    }

    const orderNumber = generateOrderNumber();
    const products = getProducts();

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

    items.forEach((item, i) => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return;
      const ep = getEffectivePrice(product);
      message += `${i + 1}. ${product.name}\n`;
      message += `   Cant: ${item.quantity} x ${formatPrice(ep).replace(/\s/g, '')} = ${formatPrice(ep * item.quantity).replace(/\s/g, '')}\n\n`;
    });

    message += `--------------------------------\n`;
    const subtotal = getTotal();
    if (appliedCoupon) {
      message += `Subtotal: ${formatPrice(subtotal).replace(/\s/g, '')}\n`;
      message += `Cupon ${appliedCoupon.code}: -${formatPrice(appliedCoupon.discount).replace(/\s/g, '')}\n`;
      message += `*TOTAL: ${formatPrice(subtotal - appliedCoupon.discount).replace(/\s/g, '')}*\n\n`;
    } else {
      message += `*TOTAL: ${formatPrice(subtotal).replace(/\s/g, '')}*\n\n`;
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
    saveOrder(orderNumber, 'whatsapp');
    decrementStock();

    // Increment coupon usage
    if (appliedCoupon && typeof SB !== 'undefined' && SB.incrementCouponUse) {
      SB.incrementCouponUse(appliedCoupon.id).catch(err => console.warn('[Cart] Coupon use:', err));
    }

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, '_blank');

    // Clean up
    appliedCoupon = null;
    closeOrderForm();
    clear();
    close();
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

  // --- Guardar orden en historial (localStorage + Supabase) ---
  function saveOrder(orderNumber, method) {
    const products = getProducts();
    const orderItems = items.map(item => {
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
      items: orderItems,
      total: getTotal()
    };

    // Save to localStorage (legacy)
    try {
      const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      orders.unshift(order);
      if (orders.length > 50) orders.length = 50;
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch { /* silent */ }

    // Save to Supabase
    if (typeof SB !== 'undefined' && SB.saveOrder) {
      const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
      SB.saveOrder({
        id: order.id,
        userId: user?.id || null,
        method: order.method,
        status: 'pending',
        total: order.total,
        items: orderItems
      }).catch(e => console.warn('[Cart] SB order save:', e));
    }
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
    showToast,
    escapeHTML,
    escapeAttr
  };
})();
