/* ============================================================
   LIBRE TECH - Store App (app.js)
   Renderizado de productos, búsqueda, filtros, carrusel, ratings
   Productos cargados desde Supabase (cache en localStorage)
   ============================================================ */

const Store = (() => {
  'use strict';

  const PRODUCTS_KEY = 'libretech_products';
  const RATINGS_KEY  = 'libretech_ratings';
  const WISHLIST_KEY = 'libretech_wishlist';
  const SOCIAL_KEY   = 'libretech_social_links';

  // Productos vienen de Supabase (cacheados en localStorage por SB.syncProducts())

  let currentCategory = 'all';
  let currentBrand = 'all';
  let searchQuery = '';
  let showAll = false;
  let carouselInterval = null;
  let carouselIndex = 0;

  // --- Inicialización ---
  function init() {
    // Products already synced from Supabase before init() is called
    seedReviews();
    renderCategories();
    renderFeaturedProducts();
    renderTopCategories();
    renderPromoBanners();
    initHeroCarousel();
    bindEvents();
    initHeaderScroll();
    updateHeroStats();
    updateWishlistBadge();
    updateWishlistVisibility();
    renderSocialLinks();
    renderPromoPhotoBanners();

    // Re-render wishlist hearts when auth state changes
    document.addEventListener('auth-changed', () => {
      updateWishlistVisibility();
      renderFeaturedProducts();
      renderTopCategories();
    });
  }

  function updateHeroStats() {
    const el = document.getElementById('heroProductCount');
    if (el) {
      const count = getActiveProducts().length;
      el.textContent = count + '+';
    }
  }

  // --- Productos cargados desde Supabase (no más seed local) ---

  // --- Sembrar reseñas de ejemplo con nombres reales ---
  function seedReviews() {
    try {
      const existing = localStorage.getItem(RATINGS_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        // If old prod-XXX keys exist, clear and re-seed
        const keys = Object.keys(parsed);
        if (keys.length > 0 && keys[0].startsWith('prod-')) {
          localStorage.removeItem(RATINGS_KEY);
          localStorage.removeItem('libretech_reviews');
        } else {
          return; // Already seeded with new product IDs
        }
      }
    } catch { /* continue */ }

    const REVIEWS = {
      'p01': [
        {star:5,name:'Carlos Mendoza',comment:'Carga super rápido mi iPhone, excelente calidad.'},
        {star:4,name:'Laura Gómez',comment:'Buen cargador, cumple su función perfectamente.'},
        {star:5,name:'Andrés Ríos',comment:'Lo mejor que he comprado, carga completa en menos de 1 hora.'}
      ],
      'p02': [
        {star:5,name:'María Fernanda López',comment:'Potente y compacto, carga mi Samsung y iPad al tiempo.'},
        {star:4,name:'Juan Esteban Vargas',comment:'Muy bueno, aunque el cable no viene incluido.'}
      ],
      'p04': [
        {star:5,name:'Valentina Castaño',comment:'Original Apple, se nota la diferencia en calidad.'},
        {star:5,name:'Diego Herrera',comment:'Carga rapidísimo mi iPhone 14, vale cada peso.'}
      ],
      'p09': [
        {star:5,name:'Sofía Martínez',comment:'Muy buen sonido para el precio, el micrófono funciona perfecto.'},
        {star:4,name:'Camilo Restrepo',comment:'Buenos audífonos, cómodos y se escucha bien.'},
        {star:5,name:'Daniela Ocampo',comment:'Los uso todos los días, excelente relación calidad-precio.'}
      ],
      'p14': [
        {star:5,name:'Santiago Muñoz',comment:'La cancelación de ruido es increíble para el precio.'},
        {star:5,name:'Isabella Torres',comment:'Parecen AirPods Pro originales, super recomendados.'},
        {star:4,name:'Mateo Gutiérrez',comment:'Muy buenos, la batería dura bastante bien.'}
      ],
      'p18': [
        {star:5,name:'Juliana Pérez',comment:'Sonido espectacular, se ven premium y se sienten cómodos.'},
        {star:4,name:'Felipe Cardona',comment:'Excelente calidad de construcción, muy cómodos para largas sesiones.'}
      ],
      'p24': [
        {star:5,name:'Alejandro Rojas',comment:'120W es una locura de potencia, carga todo al instante.'},
        {star:5,name:'Natalia Ramírez',comment:'La uso para mi laptop y celular, es genial.'}
      ],
      'p44': [
        {star:5,name:'David Osorio',comment:'Cargador original Samsung, carga mi S24 Ultra completo en 30 min.'},
        {star:5,name:'Andrea Salazar',comment:'Lo mejor de Samsung, super rápido.'},
        {star:4,name:'Nicolás Quintero',comment:'Excelente cargador, funciona igual que el que trae la caja.'}
      ],
      'p45': [
        {star:5,name:'Mariana Gil',comment:'67W reales, mi Xiaomi 13 carga al 100% en 35 minutos.'},
        {star:4,name:'Sebastián Castro',comment:'Carga super rápido, calidad Xiaomi original.'}
      ],
      'p65': [
        {star:5,name:'Paula Andrea Mejía',comment:'Sonido increíble, la cancelación de ruido funciona muy bien.'},
        {star:5,name:'Tomás Londoño',comment:'Los mejores audífonos relación calidad-precio que he tenido.'},
        {star:4,name:'Catalina Vélez',comment:'Muy cómodos y livianos, el sonido es bien balanceado.'}
      ],
      'p30': [
        {star:5,name:'Esteban Arango',comment:'Sonido JBL de verdad, graves potentes para el precio.'},
        {star:4,name:'Gabriela Duque',comment:'Buenos audífonos, se siente la calidad JBL.'}
      ],
      'p37': [
        {star:5,name:'Ricardo Morales',comment:'Son los que vienen con el Samsung, excelente sonido AKG.'},
        {star:4,name:'Luisa Fernanda Ospina',comment:'Muy buenos para llamadas y música, micrófono nítido.'}
      ]
    };

    const seedRatings = {};
    Object.entries(REVIEWS).forEach(([pid, reviews]) => {
      seedRatings[pid] = reviews.map(r => r.star);
    });

    localStorage.setItem(RATINGS_KEY, JSON.stringify(seedRatings));
    localStorage.setItem('libretech_reviews', JSON.stringify(REVIEWS));
  }

  // --- Obtener productos ---
  function getProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]'); }
    catch { return []; }
  }

  function getActiveProducts() {
    return getProducts().filter(p => p.active !== false);
  }

  // --- Ratings ---
  function getRatings() {
    try { return JSON.parse(localStorage.getItem(RATINGS_KEY) || '{}'); }
    catch { return {}; }
  }

  function getProductRating(productId) {
    const ratings = getRatings();
    const arr = ratings[productId] || [];
    if (arr.length === 0) return { avg: 0, count: 0 };
    const sum = arr.reduce((a, b) => a + b, 0);
    return { avg: sum / arr.length, count: arr.length };
  }

  function renderStars(avg, count) {
    let html = '<div class="star-rating">';
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(avg)) html += '<span class="star filled">★</span>';
      else if (i - 0.5 <= avg) html += '<span class="star half">★</span>';
      else html += '<span class="star">☆</span>';
    }
    if (count > 0) html += `<span class="rating-count">(${count})</span>`;
    html += '</div>';
    return html;
  }

  // --- Filtrar productos ---
  function getFilteredProducts() {
    let products = getActiveProducts();
    if (currentCategory !== 'all') products = products.filter(p => p.category === currentCategory);
    if (currentBrand !== 'all') products = products.filter(p => (p.brand || '').toLowerCase() === currentBrand.toLowerCase());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
      );
    }
    return products;
  }

  // --- Renderizar categorías ---
  function renderCategories() {
    const bar = document.getElementById('filtersBar');
    if (!bar) return;
    const products = getActiveProducts();
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    bar.querySelectorAll('.filter-chip:not([data-category="all"])').forEach(el => el.remove());
    bar.querySelector('.products-count')?.remove();

    categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.dataset.category = cat;
      chip.textContent = cat;
      bar.appendChild(chip);
    });

    const count = document.createElement('span');
    count.className = 'products-count';
    count.id = 'productsCount';
    bar.appendChild(count);
    updateProductsCount();
  }

  // --- Brand dropdown (replaces old fixed sub-bar) ---
  function showBrandDropdown(category, anchorEl) {
    const dropdown = document.getElementById('brandDropdown');
    const content = document.getElementById('brandDropdownContent');
    if (!dropdown || !content) return;

    if (category === 'all') { dropdown.style.display = 'none'; return; }

    const products = getActiveProducts().filter(p => p.category === category);
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
    if (brands.length === 0) { dropdown.style.display = 'none'; return; }

    content.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'brand-dd-item' + (currentBrand === 'all' ? ' active' : '');
    allBtn.dataset.brand = 'all';
    allBtn.textContent = 'Todas las marcas';
    content.appendChild(allBtn);

    brands.forEach(brand => {
      const btn = document.createElement('button');
      btn.className = 'brand-dd-item' + (currentBrand === brand ? ' active' : '');
      btn.dataset.brand = brand;
      btn.textContent = brand;
      content.appendChild(btn);
    });

    // Position below the anchor chip
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const bar = document.getElementById('filtersBar');
      const barRect = bar ? bar.getBoundingClientRect() : rect;
      dropdown.style.left = (rect.left - barRect.left) + 'px';
    }
    dropdown.style.display = 'block';
  }

  function updateProductsCount() {
    const countEl = document.getElementById('productsCount');
    if (!countEl) return;
    const filtered = getFilteredProducts();
    countEl.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`;
  }

  // --- Renderizar productos destacados ---
  function renderFeaturedProducts() {
    const grid = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');
    if (!grid) return;

    let products = getFilteredProducts();

    if (!showAll) {
      // Show only featured when no search/filter
      if (currentCategory === 'all' && !searchQuery.trim()) {
        products = products.filter(p => p.featured === true);
      }
    }

    grid.innerHTML = '';
    if (products.length === 0) {
      if (noResults) noResults.style.display = 'block';
      updateProductsCount();
      return;
    }
    if (noResults) noResults.style.display = 'none';

    products.forEach(product => grid.appendChild(createProductCard(product)));
    updateProductsCount();

    // Show/hide "Ver todos" button
    const btnViewAll = document.getElementById('btnViewAll');
    if (btnViewAll) {
      if (showAll || currentCategory !== 'all' || searchQuery.trim()) {
        btnViewAll.style.display = 'none';
      } else {
        const totalActive = getActiveProducts().length;
        const featuredCount = getActiveProducts().filter(p => p.featured === true).length;
        btnViewAll.style.display = totalActive > featuredCount ? '' : 'none';
        btnViewAll.textContent = 'Ver todos los productos';
      }
    }
  }

  // Alias for external calls
  function renderProducts() { renderFeaturedProducts(); }

  // --- Render top categories section ---
  function renderTopCategories() {
    const container = document.getElementById('topCategoriesContainer');
    if (!container) return;

    const products = getActiveProducts();
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

    container.innerHTML = '';

    categories.forEach(cat => {
      const catProducts = products.filter(p => p.category === cat);
      // Sort by average rating desc
      catProducts.sort((a, b) => {
        const ra = getProductRating(a.id).avg;
        const rb = getProductRating(b.id).avg;
        return rb - ra;
      });

      // Show top 4
      const topProducts = catProducts.slice(0, 4);
      if (topProducts.length === 0) return;

      const section = document.createElement('div');
      section.className = 'top-category-block';
      section.innerHTML = `<h3 class="top-category-title">${Cart.escapeHTML(cat)}</h3>`;

      const grid = document.createElement('div');
      grid.className = 'products-grid';
      topProducts.forEach(p => grid.appendChild(createProductCard(p)));
      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  // --- Crear tarjeta de producto ---
  function createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.productId = product.id;

    const isNew = isRecentProduct(product.createdAt);
    const detailLink = `producto.html?id=${encodeURIComponent(product.id)}`;
    const rating = getProductRating(product.id);
    const stock = product.stock ?? 0;
    const isOutOfStock = stock <= 0;
    const inWishlist = isInWishlist(product.id);

    card.innerHTML = `
      <a href="${detailLink}" class="product-card-link">
        <div class="product-card-image">
          ${isOutOfStock ? '<span class="product-badge out-of-stock">Agotado</span>' : ''}
          ${!isOutOfStock && isNew ? '<span class="product-badge new">Nuevo</span>' : ''}
          ${product.featured ? '<span class="product-badge featured">★ Destacado</span>' : ''}
          ${product.offerActive && product.offerPrice ? '<span class="product-badge sale">Oferta</span>' : ''}
          ${isOutOfStock ? '<div class="product-sold-out-overlay"></div>' : ''}
          ${product.image
            ? `<img src="${Cart.escapeAttr(product.image)}" alt="${Cart.escapeAttr(product.name)}" loading="lazy" width="260" height="260">`
            : `<div class="product-no-image">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
              </div>`
          }
        </div>
        <div class="product-card-body">
          <span class="product-category">${Cart.escapeHTML(product.category || '')}</span>
          <h3 class="product-name">${Cart.escapeHTML(product.name)}</h3>
          ${renderStars(rating.avg, rating.count)}
          <p class="product-description">${Cart.escapeHTML(product.description || '')}</p>
          <div class="product-price-row">
            ${product.offerActive && product.offerPrice
              ? `<span class="product-price offer-price">${Cart.formatPrice(product.offerPrice)}</span><span class="product-price-original">${Cart.formatPrice(product.price)}</span>`
              : `<span class="product-price">${Cart.formatPrice(product.price)}</span>`
            }
          </div>
        </div>
      </a>
      ${Auth.isLoggedIn() ? `<button class="btn-wishlist-card${inWishlist ? ' active' : ''}" data-wishlist-id="${product.id}" title="${inWishlist ? 'Quitar de favoritos' : 'Agregar a favoritos'}" aria-label="Favoritos">
        <svg viewBox="0 0 24 24" fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      </button>` : ''}
      ${isOutOfStock
        ? `<button class="btn-add-cart disabled" disabled title="Agotado" aria-label="Producto agotado">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>`
        : `<button class="btn-add-cart" data-product-id="${product.id}" title="Agregar al carrito" aria-label="Agregar ${Cart.escapeAttr(product.name)} al carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>`
      }
    `;
    return card;
  }

  function isRecentProduct(dateStr) {
    if (!dateStr) return false;
    const diffDays = (new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }

  // --- Hero carousel ---
  // --- Render promo banners alongside sections ---
  function renderPromoBanners() {
    const products = getActiveProducts();

    // --- Left banner (featured section): pick a product on offer or a top category ---
    const bannerLeft = document.getElementById('promoBannerFeatured');
    if (bannerLeft) {
      // Find a product with an active offer
      const offerProduct = products.find(p => p.offerActive && p.offerPrice);
      if (offerProduct) {
        const discount = Math.round((1 - offerProduct.offerPrice / offerProduct.price) * 100);
        bannerLeft.innerHTML = `
          <a href="producto.html?id=${encodeURIComponent(offerProduct.id)}" class="promo-banner-link promo-banner--offer-style">
            <div class="promo-banner-badge">🔥 OFERTA</div>
            <div class="promo-banner-img">
              ${offerProduct.image ? `<img src="${Cart.escapeAttr(offerProduct.image)}" alt="${Cart.escapeAttr(offerProduct.name)}" loading="lazy">` : ''}
            </div>
            <div class="promo-banner-body">
              <span class="promo-banner-discount">-${discount}%</span>
              <h4 class="promo-banner-title">${Cart.escapeHTML(offerProduct.name)}</h4>
              <div class="promo-banner-prices">
                <span class="promo-banner-new-price">${Cart.formatPrice(offerProduct.offerPrice)}</span>
                <span class="promo-banner-old-price">${Cart.formatPrice(offerProduct.price)}</span>
              </div>
              <span class="promo-banner-cta">Ver producto →</span>
            </div>
          </a>`;
      } else {
        // Fallback: audio category promo
        const audioProd = products.filter(p => p.category === 'Audio' && p.featured).slice(0, 1)[0]
          || products.filter(p => p.category === 'Audio').slice(0, 1)[0];
        bannerLeft.innerHTML = `
          <a href="${audioProd ? 'producto.html?id=' + encodeURIComponent(audioProd.id) : '#'}" class="promo-banner-link promo-banner--category-style">
            <div class="promo-banner-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
            <h4 class="promo-banner-title">Audio Premium</h4>
            <p class="promo-banner-desc">Descubre nuestra selección de audífonos y parlantes</p>
            <span class="promo-banner-cta">Explorar →</span>
          </a>`;
      }
    }

    // --- Right banner (top categories section): category lifestyle or specific product ---
    const bannerRight = document.getElementById('promoBannerCategories');
    if (bannerRight) {
      // Pick a popular/featured power bank or wearable
      const promoProd = products.find(p => p.featured && (p.category === 'Power Banks' || p.category === 'Wearables'))
        || products.find(p => p.category === 'Cargadores' && p.featured);
      if (promoProd) {
        bannerRight.innerHTML = `
          <a href="producto.html?id=${encodeURIComponent(promoProd.id)}" class="promo-banner-link promo-banner--highlight-style">
            <div class="promo-banner-tag">⚡ DESTACADO</div>
            <div class="promo-banner-img">
              ${promoProd.image ? `<img src="${Cart.escapeAttr(promoProd.image)}" alt="${Cart.escapeAttr(promoProd.name)}" loading="lazy">` : ''}
            </div>
            <div class="promo-banner-body">
              <h4 class="promo-banner-title">${Cart.escapeHTML(promoProd.name)}</h4>
              <p class="promo-banner-desc">${Cart.escapeHTML((promoProd.description || '').substring(0, 80))}${(promoProd.description || '').length > 80 ? '…' : ''}</p>
              <span class="promo-banner-price">${Cart.formatPrice(promoProd.offerActive && promoProd.offerPrice ? promoProd.offerPrice : promoProd.price)}</span>
              <span class="promo-banner-cta">Comprar ahora →</span>
            </div>
          </a>`;
      } else {
        // Fallback: Cargadores category promo
        bannerRight.innerHTML = `
          <div class="promo-banner-link promo-banner--category-style">
            <div class="promo-banner-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/></svg>
            </div>
            <h4 class="promo-banner-title">Carga Rápida</h4>
            <p class="promo-banner-desc">Cargadores y power banks de alta potencia</p>
            <span class="promo-banner-cta">Ver todos →</span>
          </div>`;
      }
    }
  }

  function initHeroCarousel() {
    const track = document.getElementById('heroCarouselTrack');
    const dotsC = document.getElementById('heroCarouselDots');
    if (!track || !dotsC) return;

    const featured = getActiveProducts().filter(p => p.featured === true).slice(0, 6);
    if (featured.length === 0) {
      // fallback: show all products
      featured.push(...getActiveProducts().slice(0, 4));
    }
    if (featured.length === 0) return;

    track.innerHTML = featured.map(p => {
      const hasOffer = p.offerActive && p.offerPrice;
      const discountPercent = hasOffer ? Math.round((1 - p.offerPrice / p.price) * 100) : 0;
      return `
      <a href="producto.html?id=${encodeURIComponent(p.id)}" class="hero-slide${hasOffer ? ' hero-slide--offer' : ''}">
        ${hasOffer ? `<div class="hero-slide-discount-badge">-${discountPercent}%</div>` : ''}
        <div class="hero-slide-image">
          ${p.image
            ? `<img src="${Cart.escapeAttr(p.image)}" alt="${Cart.escapeAttr(p.name)}" loading="lazy">`
            : `<div class="hero-slide-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </div>`
          }
        </div>
        <div class="hero-slide-info">
          <span class="hero-slide-cat">${Cart.escapeHTML(p.category || '')}</span>
          <h3 class="hero-slide-name">${Cart.escapeHTML(p.name)}</h3>
          ${hasOffer
            ? `<div class="hero-slide-prices">
                <span class="hero-slide-price hero-slide-price--offer">${Cart.formatPrice(p.offerPrice)}</span>
                <span class="hero-slide-price--original">${Cart.formatPrice(p.price)}</span>
              </div>`
            : `<span class="hero-slide-price">${Cart.formatPrice(p.price)}</span>`
          }
        </div>
      </a>
    `}).join('');

    // Dots
    dotsC.innerHTML = featured.map((_, i) =>
      `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Ir a producto ${i + 1}"></button>`
    ).join('');

    carouselIndex = 0;
    const slideCount = featured.length;

    dotsC.addEventListener('click', e => {
      const dot = e.target.closest('.carousel-dot');
      if (!dot) return;
      carouselIndex = parseInt(dot.dataset.index, 10);
      updateCarousel();
      resetCarouselTimer();
    });

    function updateCarousel() {
      const slideWidth = track.parentElement.offsetWidth;
      track.style.transform = `translateX(-${carouselIndex * slideWidth}px)`;
      dotsC.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === carouselIndex));
    }

    function nextSlide() {
      carouselIndex = (carouselIndex + 1) % slideCount;
      updateCarousel();
    }

    function resetCarouselTimer() {
      clearInterval(carouselInterval);
      carouselInterval = setInterval(nextSlide, 4000);
    }

    resetCarouselTimer();
    window.addEventListener('resize', updateCarousel);
  }

  // --- Eventos ---
  function bindEvents() {
    // Smooth scroll for hero CTA
    document.getElementById('heroCtaBtn')?.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById('productos');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // Add to cart from grids (featured + top categories)
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn-add-cart');
      if (!btn) return;
      const productId = btn.dataset.productId;
      Cart.addItem(productId);
      btn.classList.add('added');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
      setTimeout(() => {
        btn.classList.remove('added');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
      }, 1200);
    });

    // Wishlist toggle from product cards
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn-wishlist-card');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(btn.dataset.wishlistId);
    });

    // Wishlist sidebar events
    document.getElementById('btnOpenWishlist')?.addEventListener('click', openWishlist);
    document.getElementById('btnCloseWishlist')?.addEventListener('click', closeWishlist);
    document.getElementById('wishlistOverlay')?.addEventListener('click', closeWishlist);

    // Wishlist item actions (add to cart, remove)
    document.getElementById('wishlistItems')?.addEventListener('click', e => {
      const cartBtn = e.target.closest('.wishlist-item-cart');
      if (cartBtn) {
        e.preventDefault();
        Cart.addItem(cartBtn.dataset.productId);
      }
      const removeBtn = e.target.closest('.wishlist-item-remove');
      if (removeBtn) {
        e.preventDefault();
        toggleWishlist(removeBtn.dataset.wishlistRemove);
      }
    });

    // Category filter chips
    document.getElementById('filtersBar')?.addEventListener('click', e => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.dataset.category;
      currentBrand = 'all';
      showBrandDropdown(currentCategory, chip);
      showAll = currentCategory !== 'all';
      renderFeaturedProducts();
    });

    // Brand dropdown items
    document.getElementById('brandDropdown')?.addEventListener('click', e => {
      const item = e.target.closest('.brand-dd-item');
      if (!item) return;
      document.querySelectorAll('.brand-dd-item').forEach(b => b.classList.remove('active'));
      item.classList.add('active');
      currentBrand = item.dataset.brand;
      renderFeaturedProducts();
    });

    // Close brand dropdown on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#brandDropdown') && !e.target.closest('.filter-chip')) {
        const dd = document.getElementById('brandDropdown');
        if (dd) dd.style.display = 'none';
      }
    });

    // View all products
    document.getElementById('btnViewAll')?.addEventListener('click', e => {
      e.preventDefault();
      showAll = true;
      renderFeaturedProducts();
    });

    // Search with debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          searchQuery = searchInput.value;
          showAll = !!searchQuery.trim();
          renderFeaturedProducts();
          renderSearchDropdown(searchInput.value);
        }, 300);
      });
      document.addEventListener('click', e => {
        if (!e.target.closest('.search-wrapper')) {
          const dd = document.getElementById('searchDropdown');
          if (dd) dd.classList.remove('active');
        }
      });
      searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) renderSearchDropdown(searchInput.value);
      });
    }
  }

  // --- Live search dropdown ---
  function renderSearchDropdown(query) {
    const dropdown = document.getElementById('searchDropdown');
    if (!dropdown) return;
    const q = (query || '').toLowerCase().trim();
    if (!q) { dropdown.classList.remove('active'); dropdown.innerHTML = ''; return; }

    const products = getActiveProducts().filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    ).slice(0, 8);

    if (products.length === 0) {
      dropdown.innerHTML = '<div class="search-dropdown-empty">No se encontraron productos</div>';
      dropdown.classList.add('active');
      return;
    }

    dropdown.innerHTML = products.map(p => `
      <a href="producto.html?id=${encodeURIComponent(p.id)}" class="search-dropdown-item">
        <div class="search-dropdown-thumb">
          ${p.image
            ? `<img src="${Cart.escapeAttr(p.image)}" alt="${Cart.escapeAttr(p.name)}" loading="lazy">`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`
          }
        </div>
        <div class="search-dropdown-info">
          <div class="search-dropdown-name">${Cart.escapeHTML(p.name)}</div>
          <div class="search-dropdown-meta">${Cart.escapeHTML(p.category || '')}</div>
        </div>
        <span class="search-dropdown-price">${Cart.formatPrice(p.price)}</span>
      </a>
    `).join('');
    dropdown.classList.add('active');
  }

  // --- Header scroll effect ---
  function initHeaderScroll() {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          header.classList.toggle('scrolled', window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ===================== WISHLIST =====================
  function getWishlist() {
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); } catch { return []; }
  }

  function saveWishlist(list) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  }

  function isInWishlist(productId) {
    return getWishlist().includes(productId);
  }

  function toggleWishlist(productId) {
    // Require login to use wishlist
    if (!Auth.isLoggedIn()) {
      Auth.openLoginDropdown();
      Cart.showToast('Inicia sesión para agregar a favoritos', 'info');
      return;
    }

    let list = getWishlist();
    const idx = list.indexOf(productId);
    if (idx > -1) {
      list.splice(idx, 1);
      Cart.showToast('Eliminado de favoritos', 'info');
    } else {
      list.push(productId);
      Cart.showToast('Agregado a favoritos', 'success');
    }
    saveWishlist(list);
    updateWishlistBadge();
    renderWishlistSidebar();
    // Update heart icons on cards
    document.querySelectorAll('.btn-wishlist-card').forEach(btn => {
      const id = btn.dataset.wishlistId;
      const active = list.includes(id);
      btn.classList.toggle('active', active);
      btn.title = active ? 'Quitar de favoritos' : 'Agregar a favoritos';
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', active ? 'currentColor' : 'none');
    });
  }

  function updateWishlistBadge() {
    const badge = document.getElementById('wishlistBadge');
    if (!badge) return;
    const count = getWishlist().length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  function renderWishlistSidebar() {
    const container = document.getElementById('wishlistItems');
    const emptyEl = document.getElementById('wishlistEmpty');
    const countEl = document.getElementById('wishlistItemsCount');
    if (!container) return;

    const list = getWishlist();
    const products = getActiveProducts();

    if (countEl) countEl.textContent = list.length > 0 ? `(${list.length})` : '';
    if (list.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      // Remove all items except empty
      container.querySelectorAll('.wishlist-item').forEach(el => el.remove());
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    // Remove old items
    container.querySelectorAll('.wishlist-item').forEach(el => el.remove());

    list.forEach(pid => {
      const p = products.find(x => x.id === pid);
      if (!p) return;
      const div = document.createElement('div');
      div.className = 'wishlist-item';
      div.innerHTML = `
        <a href="producto.html?id=${encodeURIComponent(p.id)}" class="wishlist-item-link">
          <div class="wishlist-item-img">
            ${p.image ? `<img src="${Cart.escapeAttr(p.image)}" alt="${Cart.escapeAttr(p.name)}" loading="lazy">` : '<div class="product-no-image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg></div>'}
          </div>
          <div class="wishlist-item-info">
            <div class="wishlist-item-name">${Cart.escapeHTML(p.name)}</div>
            <div class="wishlist-item-price">${p.offerActive && p.offerPrice ? Cart.formatPrice(p.offerPrice) : Cart.formatPrice(p.price)}</div>
          </div>
        </a>
        <div class="wishlist-item-actions">
          <button class="wishlist-item-cart" data-product-id="${p.id}" title="Agregar al carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          </button>
          <button class="wishlist-item-remove" data-wishlist-remove="${p.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
      container.appendChild(div);
    });
  }

  function openWishlist() {
    document.getElementById('wishlistSidebar')?.classList.add('active');
    document.getElementById('wishlistOverlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderWishlistSidebar();
  }

  function closeWishlist() {
    document.getElementById('wishlistSidebar')?.classList.remove('active');
    document.getElementById('wishlistOverlay')?.classList.remove('active');
    document.body.style.overflow = '';
  }

  // --- Update wishlist button visibility based on login state ---
  function updateWishlistVisibility() {
    const loggedIn = Auth.isLoggedIn();
    const headerWishBtn = document.getElementById('btnOpenWishlist');
    if (headerWishBtn) {
      headerWishBtn.style.display = loggedIn ? '' : 'none';
    }
  }

  // ===================== SOCIAL MEDIA (FOOTER) =====================
  const SOCIAL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.16 8.16 0 004.76 1.52V7.12a4.84 4.84 0 01-1-.43z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29.94 29.94 0 001 11.75a30 30 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2c.312-1.732.466-3.49.46-5.25a29.94 29.94 0 00-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'
  };

  function getSocialLinks() {
    try { return JSON.parse(localStorage.getItem(SOCIAL_KEY) || '{}'); } catch { return {}; }
  }

  function renderSocialLinks() {
    const container = document.getElementById('footerSocialLinks');
    const wrapper = document.getElementById('footerSocial');
    if (!container) return;
    const links = getSocialLinks();
    const entries = Object.entries(links).filter(([, url]) => url && url.trim());
    if (entries.length === 0) {
      if (wrapper) wrapper.style.display = 'none';
      return;
    }
    if (wrapper) wrapper.style.display = '';
    container.innerHTML = entries.map(([platform, url]) => {
      const icon = SOCIAL_ICONS[platform] || SOCIAL_ICONS.instagram;
      const safeName = Cart.escapeHTML(platform.charAt(0).toUpperCase() + platform.slice(1));
      const safeUrl = Cart.escapeAttr(url);
      return `<a href="${safeUrl}" target="_blank" rel="noopener" class="footer-social-link" title="${safeName}">${icon}<span>${safeName}</span></a>`;
    }).join('');
  }

  // ===== PROMO PHOTO BANNERS =====
  const PROMO_PHOTOS_KEY = 'libretech_promo_photos';
  function getPromoPhotos() { try { return JSON.parse(localStorage.getItem(PROMO_PHOTOS_KEY) || '[]'); } catch { return []; } }

  function renderPromoPhotoBanners() {
    const slotMap = {
      'after-featured': 'promoPhotoAfterFeatured',
      'after-categories': 'promoPhotoAfterCategories',
      'before-footer': 'promoPhotoBeforeFooter'
    };
    // Clear all slots
    Object.values(slotMap).forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });

    const photos = getPromoPhotos().filter(p => p.active && p.image);
    photos.forEach(p => {
      const slotId = slotMap[p.position] || slotMap['after-featured'];
      const slot = document.getElementById(slotId);
      if (!slot) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'promo-photo-banner';
      if (p.link) {
        wrapper.innerHTML = `<a href="${Cart.escapeAttr(p.link)}" target="_blank" rel="noopener"><img src="${Cart.escapeAttr(p.image)}" alt="${Cart.escapeHTML(p.title || 'Promoción')}" loading="lazy"></a>`;
      } else {
        wrapper.innerHTML = `<img src="${Cart.escapeAttr(p.image)}" alt="${Cart.escapeHTML(p.title || 'Promoción')}" loading="lazy">`;
      }
      slot.appendChild(wrapper);
    });
  }

  return { init, renderProducts, renderCategories, getProductRating, renderStars, getActiveProducts, getProducts, isInWishlist, toggleWishlist, updateWishlistBadge, openWishlist, closeWishlist, renderWishlistSidebar, renderSocialLinks, renderPromoPhotoBanners, updateWishlistVisibility };
})();
