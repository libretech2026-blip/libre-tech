/* ============================================================
   LIBRE TECH - Hamburger Menu (hamburger-menu.js)
   Menú lateral: enlaces fijos + categorías con sus productos.

   El orden y la visibilidad de las opciones se configuran desde el
   panel de administración (pestaña "Inicio y menú") y se guardan en
   site_config.visual_ui.menuOrder / menuHidden.
   Claves: 'all', 'featured', 'offers', 'share', 'pqr' y 'cat:<Categoría>'.
   ============================================================ */

const HamburgerMenu = (() => {
  'use strict';

  const UI_KEY = 'libretech_visual_ui';
  let isOpen = false;

  /* --- Enlaces fijos disponibles en el menú --- */
  const STATIC_ITEMS = {
    all:      { label: 'Todos los productos', href: 'productos.html', icon: 'grid' },
    featured: { label: 'Destacados',          href: 'destacados.html', icon: 'star' },
    offers:   { label: 'Ofertas',             href: 'ofertas.html',   icon: 'tag' },
    pqr:      { label: 'PQRs y soporte',      href: 'pqr.html',       icon: 'chat' },
    share:    { label: 'Compartir catálogo',  action: 'share',        icon: 'share' }
  };

  const ICONS = {
    grid:  '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    star:  '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    tag:   '<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
    chat:  '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    folder:'<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'
  };

  function svg(iconKey) {
    return `<svg class="menu-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[iconKey] || ICONS.folder}</svg>`;
  }

  function init() {
    const btnHamburger = document.getElementById('btnHamburger');
    const btnCloseMenu = document.getElementById('btnCloseMenu');
    const hamburgerMenu = document.getElementById('hamburgerMenu');

    if (!btnHamburger || !btnCloseMenu || !hamburgerMenu) return;

    btnHamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      openMenu();
    });

    btnCloseMenu.addEventListener('click', closeMenu);

    // Cerrar al elegir un producto de una categoría
    hamburgerMenu.addEventListener('click', (e) => {
      if (e.target.closest('.menu-subcategory-item')) {
        setTimeout(closeMenu, 200);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) closeMenu();
    });

    renderMenuCategories();

    // Re-render cuando llegan productos o la configuración del sitio
    document.addEventListener('products-updated', renderMenuCategories);
    document.addEventListener('site-config-loaded', renderMenuCategories);
  }

  function openMenu() {
    const btnHamburger = document.getElementById('btnHamburger');
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    if (!btnHamburger || !hamburgerMenu) return;

    isOpen = true;
    btnHamburger.classList.add('active');
    btnHamburger.setAttribute('aria-expanded', 'true');
    hamburgerMenu.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    const btnHamburger = document.getElementById('btnHamburger');
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    if (!btnHamburger || !hamburgerMenu) return;

    isOpen = false;
    btnHamburger.classList.remove('active');
    btnHamburger.setAttribute('aria-expanded', 'false');
    hamburgerMenu.classList.remove('active');
    document.body.style.overflow = '';
  }

  /* ----------------------------------------------------------
     Configuración de orden / visibilidad
  ---------------------------------------------------------- */
  function getUiConfig() {
    try {
      if (typeof Store !== 'undefined' && Store.getVisualUiConfig) return Store.getVisualUiConfig();
      return JSON.parse(localStorage.getItem(UI_KEY) || '{}') || {};
    } catch {
      return {};
    }
  }

  /** Claves disponibles hoy: fijas + una por categoría con productos. */
  function buildAvailableKeys(categories) {
    return [
      ...Object.keys(STATIC_ITEMS),
      ...categories.map(c => 'cat:' + c)
    ];
  }

  /**
   * Aplica el orden guardado: primero las claves configuradas que sigan
   * existiendo, luego las nuevas (categorías recién creadas) al final.
   */
  function applyOrder(availableKeys, savedOrder, hiddenKeys) {
    const saved = Array.isArray(savedOrder) ? savedOrder : [];
    const hidden = new Set(Array.isArray(hiddenKeys) ? hiddenKeys : []);
    const ordered = saved.filter(k => availableKeys.includes(k));
    const rest = availableKeys.filter(k => !ordered.includes(k));
    return [...ordered, ...rest].filter(k => !hidden.has(k));
  }

  /** Lista de claves ordenadas — la usa también el panel de administración. */
  function getOrderedKeys() {
    const categories = getCategories();
    const cfg = getUiConfig();
    return applyOrder(buildAvailableKeys(categories), cfg.menuOrder, cfg.menuHidden);
  }

  function getCategories() {
    let products = [];
    if (typeof Store !== 'undefined' && Store.getActiveProducts) products = Store.getActiveProducts();
    return [...new Set(products.map(p => p.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }

  function getProductsByCategory() {
    let products = [];
    if (typeof Store !== 'undefined' && Store.getActiveProducts) products = Store.getActiveProducts();

    const map = new Map();
    products.forEach(p => {
      if (!p.category || !p.id || !p.name) return;
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category).push({ id: p.id, name: p.name });
    });
    return map;
  }

  /* ----------------------------------------------------------
     Render
  ---------------------------------------------------------- */
  function renderMenuCategories() {
    const content = document.getElementById('hamburgerMenuContent');
    if (!content) return;

    const categoryMap = getProductsByCategory();
    const keys = getOrderedKeys();

    content.innerHTML = '';
    keys.forEach((key, index) => {
      const node = key.startsWith('cat:')
        ? buildCategoryNode(key.slice(4), categoryMap.get(key.slice(4)) || [])
        : buildStaticNode(key);
      if (!node) return;
      // Entrada escalonada del menú
      node.style.setProperty('--menu-index', index);
      content.appendChild(node);
    });
  }

  function buildStaticNode(key) {
    const item = STATIC_ITEMS[key];
    if (!item) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'menu-category menu-category--static';
    // "Ofertas" se resalta en rojo para que se identifique de un vistazo
    if (key === 'offers') wrapper.classList.add('menu-category--offers');

    const btn = document.createElement('button');
    btn.className = 'menu-category-btn';
    btn.innerHTML = `${svg(item.icon)}<span>${item.label}</span>`;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (item.action === 'share') {
        closeMenu();
        if (typeof Share !== 'undefined') Share.shareCatalog();
        return;
      }
      closeMenu();
      if (key === 'all' && window.location.pathname.includes('productos.html')) {
        if (typeof Store !== 'undefined' && Store.setActiveCategory) {
          Store.setActiveCategory('all');
        }
        return;
      }
      window.location.href = item.href;
    });

    wrapper.appendChild(btn);
    return wrapper;
  }

  function buildCategoryNode(category, productsForCategory) {
    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'menu-category';

    const header = document.createElement('div');
    header.className = 'menu-category-header';

    const categoryBtn = document.createElement('button');
    categoryBtn.className = 'menu-category-btn';
    categoryBtn.innerHTML = `${svg('folder')}<span>${category}</span>`;
    categoryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMenu();
      if (window.location.pathname.includes('productos.html')) {
        if (typeof Store !== 'undefined' && Store.setActiveCategory) {
          Store.setActiveCategory(category);
        }
      } else {
        window.location.href = `productos.html?category=${encodeURIComponent(category)}`;
      }
    });
    header.appendChild(categoryBtn);
    categoryDiv.appendChild(header);

    const sorted = [...productsForCategory].sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
    );
    if (sorted.length === 0) return categoryDiv;

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'menu-category-toggle';
    toggleBtn.setAttribute('aria-label', `Expandir o contraer ${category}`);
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

    const productsDiv = document.createElement('div');
    productsDiv.className = 'menu-subcategories collapsed';

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const collapsed = productsDiv.classList.toggle('collapsed');
      toggleBtn.classList.toggle('expanded', !collapsed);
      toggleBtn.setAttribute('aria-expanded', String(!collapsed));
    });

    header.appendChild(toggleBtn);

    sorted.forEach(product => {
      const productBtn = document.createElement('button');
      productBtn.className = 'menu-subcategory-item';
      productBtn.textContent = product.name;
      productBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMenu();
        window.location.href = `producto.html?id=${encodeURIComponent(product.id)}`;
      });
      productsDiv.appendChild(productBtn);
    });

    categoryDiv.appendChild(productsDiv);
    return categoryDiv;
  }

  return {
    init,
    renderMenuCategories,
    openMenu,
    closeMenu,
    getOrderedKeys,
    STATIC_ITEMS
  };
})();

document.addEventListener('DOMContentLoaded', HamburgerMenu.init);
