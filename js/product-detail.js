/* ============================================================
   LIBRE TECH - Product Detail (product-detail.js)
   Renderiza detalle del producto + recomendaciones
   ============================================================ */

const ProductDetail = (() => {
  'use strict';

  const PRODUCTS_KEY = 'libretech_products';
  const RATINGS_KEY  = 'libretech_ratings';
  const WISHLIST_KEY_BASE = 'libretech_wishlist';
  const SOCIAL_KEY   = 'libretech_social_links';

  function getWishlistKey() {
    const user = (typeof Auth !== 'undefined') && Auth.getUser && Auth.getUser();
    return user ? WISHLIST_KEY_BASE + '_' + user.id : WISHLIST_KEY_BASE;
  }
  let currentProduct = null;
  let selectedColor = null;
  let quantity = 1;

  function init() {
    const productId = getProductIdFromURL();
    if (!productId) {
      window.location.href = 'index.html';
      return;
    }

    const products = getProducts();
    currentProduct = products.find(p => p.id === productId && p.active !== false);

    if (!currentProduct) {
      window.location.href = 'index.html';
      return;
    }

    render();
    renderRecommended();
    bindEvents();
    initHeaderScroll();
    initSearch();
    trackView(productId);
    initWishlistUI();
    renderSocialLinks();
  }

  function trackView(productId) {
    try {
      const VIEWS_KEY = 'libretech_views';
      const views = JSON.parse(localStorage.getItem(VIEWS_KEY) || '{}');
      views[productId] = (views[productId] || 0) + 1;
      localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
    } catch { /* silent */ }
  }

  function getProductIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  }

  function getProducts() {
    try {
      return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function getActiveProducts() {
    return getProducts().filter(p => p.active !== false);
  }

  // --- Render product detail ---
  function render() {
    const p = currentProduct;

    // Update page title
    document.title = `${p.name} | LIBRE TECH`;

    // Breadcrumb
    const bc = document.getElementById('breadcrumbProduct');
    if (bc) bc.textContent = p.name;

    // Update meta description and Open Graph tags
    const metaDesc = `${p.name} - Compra en LIBRE TECH al mejor precio. ${p.description || ''}`.substring(0, 160);
    document.querySelector('meta[name="description"]')?.setAttribute('content', metaDesc);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${p.name} | LIBRE TECH`);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', metaDesc);
    if (p.image) {
      document.querySelector('meta[property="og:image"]')?.setAttribute('content', p.image);
      document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', p.image);
    }

    // JSON-LD structured data
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      description: p.description || '',
      image: p.image || '',
      brand: { '@type': 'Brand', name: p.brand || 'LIBRE TECH' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'COP',
        price: p.offerActive && p.offerPrice ? p.offerPrice : p.price,
        availability: (p.stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: { '@type': 'Organization', name: 'LIBRE TECH' }
      }
    };
    let ldScript = document.getElementById('productJsonLd');
    if (!ldScript) {
      ldScript = document.createElement('script');
      ldScript.type = 'application/ld+json';
      ldScript.id = 'productJsonLd';
      document.head.appendChild(ldScript);
    }
    ldScript.textContent = JSON.stringify(jsonLd);

    // Build images list: combine image + images array
    const allImages = [];
    if (p.image) allImages.push(p.image);
    if (Array.isArray(p.images)) {
      p.images.forEach(img => {
        if (img && !allImages.includes(img)) allImages.push(img);
      });
    }

    // Main image (with zoom capability)
    const imgContainer = document.getElementById('pdMainImage');
    if (imgContainer && allImages.length > 0) {
      imgContainer.innerHTML = `<img src="${Cart.escapeAttr(allImages[0])}" alt="${Cart.escapeAttr(p.name)}" loading="lazy" id="pdMainImg" style="cursor:zoom-in;">`;
      imgContainer.addEventListener('click', () => openImageZoom(document.getElementById('pdMainImg')?.src));
    }

    // Thumbnails
    const thumbsContainer = document.getElementById('pdThumbnails');
    if (thumbsContainer && allImages.length > 1) {
      thumbsContainer.style.display = 'flex';
      thumbsContainer.innerHTML = allImages.map((img, i) =>
        `<button class="pd-thumb${i === 0 ? ' active' : ''}" data-index="${i}" data-src="${Cart.escapeAttr(img)}" aria-label="Ver imagen ${i + 1}">
          <img src="${Cart.escapeAttr(img)}" alt="Foto ${i + 1}" loading="lazy">
        </button>`
      ).join('');
    }

    // Info
    document.getElementById('pdCategory').textContent = p.category || '';
    document.getElementById('pdBrand').textContent = p.brand || '';
    document.getElementById('pdName').textContent = p.name;
    if (p.offerActive && p.offerPrice) {
      document.getElementById('pdPrice').innerHTML = `<span class="offer-price">${Cart.formatPrice(p.offerPrice)}</span> <span class="product-price-original">${Cart.formatPrice(p.price)}</span>`;
    } else {
      document.getElementById('pdPrice').textContent = Cart.formatPrice(p.price);
    }
    document.getElementById('pdDescription').textContent = p.description || 'Sin descripción disponible.';

    // Stock
    const stockEl = document.getElementById('pdStock');
    const stockText = document.getElementById('pdStockText');
    if (stockEl && stockText) {
      const stock = p.stock ?? 0;
      if (stock > 10) {
        stockEl.className = 'pd-stock in-stock';
        stockText.textContent = 'En stock';
      } else if (stock > 0) {
        stockEl.className = 'pd-stock low-stock';
        stockText.textContent = `¡Solo quedan ${stock} unidades!`;
      } else {
        stockEl.className = 'pd-stock out-of-stock';
        stockText.textContent = 'Agotado';
      }
    }

    // Rating
    renderRatingUI();

    // Colors
    const colors = p.colors || [];
    const colorsGroup = document.getElementById('pdColorsGroup');
    const colorsContainer = document.getElementById('pdColors');
    if (colors.length > 0 && colorsGroup && colorsContainer) {
      colorsGroup.style.display = 'block';
      selectedColor = colors[0];
      colorsContainer.innerHTML = colors.map((color, i) => `
        <button class="pd-color-btn ${i === 0 ? 'active' : ''}" data-color="${Cart.escapeAttr(color)}" title="${Cart.escapeAttr(color)}">
          <span class="pd-color-swatch" style="background:${getColorHex(color)}"></span>
          <span class="pd-color-name">${Cart.escapeHTML(color)}</span>
        </button>
      `).join('');
    }

    // Specifications
    const specs = p.specs || [];
    const specsSection = document.getElementById('pdSpecsSection');
    const specsTable = document.getElementById('pdSpecsTable');
    if (specs.length > 0 && specsSection && specsTable) {
      specsSection.style.display = 'block';
      specsTable.querySelector('tbody').innerHTML = specs.map(s => `
        <tr>
          <td class="pd-spec-key">${Cart.escapeHTML(s.key)}</td>
          <td class="pd-spec-value">${Cart.escapeHTML(s.value)}</td>
        </tr>
      `).join('');
    }
  }

  // --- Common color name to hex ---
  function getColorHex(colorName) {
    const map = {
      'negro': '#1d1d1f', 'black': '#1d1d1f',
      'blanco': '#f5f5f7', 'white': '#f5f5f7',
      'rojo': '#ff3b30', 'red': '#ff3b30',
      'azul': '#007aff', 'blue': '#007aff',
      'verde': '#34c759', 'green': '#34c759',
      'amarillo': '#ffcc00', 'yellow': '#ffcc00',
      'naranja': '#ff9500', 'orange': '#ff9500',
      'rosa': '#ff2d55', 'pink': '#ff2d55',
      'morado': '#af52de', 'purple': '#af52de',
      'gris': '#8e8e93', 'gray': '#8e8e93', 'grey': '#8e8e93',
      'plateado': '#c7c7cc', 'silver': '#c7c7cc',
      'dorado': '#d4a017', 'gold': '#d4a017',
      'café': '#8b4513', 'brown': '#8b4513',
    };
    return map[colorName.toLowerCase()] || '#8e8e93';
  }

  // --- Render recommended products ---
  function renderRecommended() {
    const grid = document.getElementById('recommendedGrid');
    if (!grid || !currentProduct) return;

    const allActive = getActiveProducts();

    // Only same category, exclude current product
    const sameCategory = allActive
      .filter(p => p.id !== currentProduct.id && p.category === currentProduct.category)
      .sort(() => Math.random() - 0.5);
    const recommended = sameCategory.slice(0, 4);

    if (recommended.length === 0) {
      document.getElementById('recommendedSection').style.display = 'none';
      return;
    }

    grid.innerHTML = recommended.map(p => `
      <article class="product-card" data-product-id="${p.id}">
        <a href="producto.html?id=${encodeURIComponent(p.id)}" class="product-card-link">
          <div class="product-card-image">
            ${p.image
              ? `<img src="${Cart.escapeAttr(p.image)}" alt="${Cart.escapeAttr(p.name)}" loading="lazy" width="260" height="260">`
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
            <span class="product-category">${Cart.escapeHTML(p.category || '')}</span>
            <h3 class="product-name">${Cart.escapeHTML(p.name)}</h3>
            <div class="product-price-row">
              <span class="product-price">${Cart.formatPrice(p.price)}</span>
            </div>
          </div>
        </a>
      </article>
    `).join('');
  }

  // --- Rating UI (Supabase reviews) ---
  function getRatings() {
    try { return JSON.parse(localStorage.getItem(RATINGS_KEY) || '{}'); }
    catch { return {}; }
  }

  async function renderRatingUI() {
    const container = document.getElementById('pdRating');
    if (!container || !currentProduct) return;

    // Load reviews from Supabase
    let reviews = [];
    try {
      if (typeof SB !== 'undefined' && SB.getProductReviews) {
        reviews = await SB.getProductReviews(currentProduct.id);
      }
    } catch (e) { console.warn('Reviews load:', e.message); }

    // Fallback: also load from localStorage
    const localRatings = getRatings();
    const localArr = localRatings[currentProduct.id] || [];

    // Combine: use Supabase reviews for avg if available, else localStorage
    const sbAvg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const localAvg = localArr.length > 0 ? localArr.reduce((a, b) => a + b, 0) / localArr.length : 0;
    const avg = reviews.length > 0 ? sbAvg : localAvg;
    const totalVotes = reviews.length > 0 ? reviews.length : localArr.length;
    const userRated = localStorage.getItem('libretech_user_rated_' + currentProduct.id);

    let html = '<div class="pd-rating-interactive">';
    html += '<div class="pd-rate-stars">';
    for (let i = 1; i <= 5; i++) {
      html += `<button class="pd-rate-star ${i <= Math.round(avg) ? 'active' : ''}" data-value="${i}" ${userRated ? 'disabled' : ''}>★</button>`;
    }
    html += '</div>';
    html += `<span class="pd-rate-text">${avg > 0 ? avg.toFixed(1) + '/5' : 'Sin valoraciones'} (${totalVotes} ${totalVotes === 1 ? 'voto' : 'votos'})</span>`;
    if (userRated) html += '<span class="pd-rate-text" style="color:var(--primary-blue)">¡Ya valoraste!</span>';
    html += '</div>';

    // Review submission form (if logged in)
    const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
    if (user && !userRated) {
      html += `<div class="pd-review-form" style="margin-top:var(--spacing-md);padding:var(--spacing-md);background:var(--bg-secondary);border-radius:var(--radius-md);">
        <h4 style="font-size:0.9rem;font-weight:700;margin-bottom:var(--spacing-sm)">Escribe una reseña</h4>
        <div class="pd-review-stars-input" style="margin-bottom:var(--spacing-sm);">
          <span style="font-size:0.85rem;color:var(--text-secondary);">Tu calificación:</span>
          <div id="reviewStarsInput" style="display:inline-flex;gap:2px;margin-left:8px;">
            ${[1,2,3,4,5].map(i => `<button class="pd-rate-star" data-review-star="${i}" style="font-size:1.3rem;cursor:pointer;">☆</button>`).join('')}
          </div>
        </div>
        <textarea id="reviewComment" placeholder="Cuéntanos tu experiencia con este producto..." style="width:100%;min-height:80px;padding:var(--spacing-sm);border:1px solid var(--border-color);border-radius:var(--radius-sm);resize:vertical;font-family:inherit;font-size:0.85rem;background:var(--bg-primary);color:var(--text-primary);"></textarea>
        <button id="btnSubmitReview" class="btn btn-primary" style="margin-top:var(--spacing-sm);padding:8px 20px;font-size:0.85rem;">Enviar reseña</button>
      </div>`;
    }

    // Show reviews
    if (reviews.length > 0) {
      html += '<div class="pd-reviews" style="margin-top:var(--spacing-lg)">';
      html += `<h4 style="font-size:0.95rem;font-weight:700;margin-bottom:var(--spacing-md)">Reseñas de clientes (${reviews.length})</h4>`;
      reviews.forEach(r => {
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : '';
        html += `<div style="padding:var(--spacing-md);background:var(--bg-secondary);border-radius:var(--radius-md);margin-bottom:var(--spacing-sm)">
          <div style="display:flex;align-items:center;gap:var(--spacing-sm);margin-bottom:4px">
            <strong style="font-size:0.85rem">${Cart.escapeHTML(r.user_name || 'Anónimo')}</strong>
            <span style="color:#f5a623;font-size:0.85rem">${stars}</span>
            <span style="font-size:0.75rem;color:var(--text-tertiary);margin-left:auto;">${date}</span>
          </div>
          ${r.comment ? `<p style="font-size:0.85rem;color:var(--text-secondary);margin:0">${Cart.escapeHTML(r.comment)}</p>` : ''}
        </div>`;
      });
      html += '</div>';
    } else {
      // Fallback to localStorage reviews
      try {
        const lsReviews = JSON.parse(localStorage.getItem('libretech_reviews') || '{}');
        const prodReviews = lsReviews[currentProduct.id] || [];
        if (prodReviews.length > 0) {
          html += '<div class="pd-reviews" style="margin-top:var(--spacing-lg)">';
          html += '<h4 style="font-size:0.95rem;font-weight:700;margin-bottom:var(--spacing-md)">Reseñas de clientes</h4>';
          prodReviews.forEach(r => {
            const stars = '★'.repeat(r.star) + '☆'.repeat(5 - r.star);
            html += `<div style="padding:var(--spacing-md);background:var(--bg-secondary);border-radius:var(--radius-md);margin-bottom:var(--spacing-sm)">
              <div style="display:flex;align-items:center;gap:var(--spacing-sm);margin-bottom:4px">
                <strong style="font-size:0.85rem">${Cart.escapeHTML(r.name)}</strong>
                <span style="color:#f5a623;font-size:0.85rem">${stars}</span>
              </div>
              <p style="font-size:0.85rem;color:var(--text-secondary);margin:0">${Cart.escapeHTML(r.comment)}</p>
            </div>`;
          });
          html += '</div>';
        }
      } catch { /* silent */ }
    }

    container.innerHTML = html;

    // Bind star rating events (quick star-only vote without review form)
    container.querySelectorAll('.pd-rate-star:not([data-review-star])').forEach(star => {
      star.addEventListener('click', () => {
        if (userRated) return;
        const value = parseInt(star.dataset.value);
        const ratings = getRatings();
        if (!ratings[currentProduct.id]) ratings[currentProduct.id] = [];
        ratings[currentProduct.id].push(value);
        localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
        localStorage.setItem('libretech_user_rated_' + currentProduct.id, 'true');
        renderRatingUI();
        Cart.showToast('¡Gracias por tu valoración!', 'success');
      });
    });

    // Bind review form events
    let selectedReviewRating = 0;
    container.querySelectorAll('[data-review-star]').forEach(star => {
      star.addEventListener('click', () => {
        selectedReviewRating = parseInt(star.dataset.reviewStar);
        container.querySelectorAll('[data-review-star]').forEach((s, i) => {
          s.textContent = (i + 1) <= selectedReviewRating ? '★' : '☆';
          s.classList.toggle('active', (i + 1) <= selectedReviewRating);
        });
      });
    });

    const submitBtn = container.querySelector('#btnSubmitReview');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        if (selectedReviewRating === 0) { Cart.showToast('Selecciona una calificación', 'error'); return; }
        const comment = (container.querySelector('#reviewComment')?.value || '').trim();
        try {
          const user = Auth.getUser();
          await SB.submitReview({
            productId: currentProduct.id,
            userId: user.id,
            userName: user.user_metadata?.full_name || user.email.split('@')[0],
            rating: selectedReviewRating,
            comment: comment
          });
          localStorage.setItem('libretech_user_rated_' + currentProduct.id, 'true');
          Cart.showToast('¡Reseña enviada!', 'success');
          renderRatingUI();
        } catch (err) {
          Cart.showToast('Error al enviar reseña: ' + err.message, 'error');
        }
      });
    }
  }

  // --- Events ---
  function bindEvents() {
    const stock = currentProduct ? (currentProduct.stock ?? 0) : 0;

    // Disable add-to-cart if out of stock
    if (stock <= 0) {
      const addBtn = document.getElementById('pdAddCart');
      if (addBtn) {
        addBtn.disabled = true;
        addBtn.textContent = 'Agotado';
        addBtn.classList.add('btn-disabled');
      }
      const qtyPlus = document.getElementById('pdQtyPlus');
      const qtyMinus = document.getElementById('pdQtyMinus');
      if (qtyPlus) qtyPlus.disabled = true;
      if (qtyMinus) qtyMinus.disabled = true;
    }

    // Quantity
    document.getElementById('pdQtyMinus')?.addEventListener('click', () => {
      if (quantity > 1) {
        quantity--;
        document.getElementById('pdQtyValue').textContent = quantity;
      }
    });

    document.getElementById('pdQtyPlus')?.addEventListener('click', () => {
      const maxQty = stock - Cart.getCartQty(currentProduct.id);
      if (quantity < maxQty) {
        quantity++;
        document.getElementById('pdQtyValue').textContent = quantity;
      } else {
        Cart.showToast(`Solo hay ${stock} unidades disponibles`, 'error');
      }
    });

    // Add to cart
    document.getElementById('pdAddCart')?.addEventListener('click', () => {
      if (!currentProduct) return;
      if (stock <= 0) return;

      const available = stock - Cart.getCartQty(currentProduct.id);
      if (quantity > available) {
        Cart.showToast(`Solo puedes agregar ${available} unidades más`, 'error');
        return;
      }

      for (let i = 0; i < quantity; i++) {
        Cart.addItem(currentProduct.id);
      }
    });

    // Color selection
    document.getElementById('pdColors')?.addEventListener('click', e => {
      const btn = e.target.closest('.pd-color-btn');
      if (!btn) return;
      document.querySelectorAll('.pd-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.dataset.color;
    });

    // Thumbnail gallery navigation
    document.getElementById('pdThumbnails')?.addEventListener('click', e => {
      const thumb = e.target.closest('.pd-thumb');
      if (!thumb) return;
      const mainImg = document.getElementById('pdMainImg');
      if (mainImg) mainImg.src = thumb.dataset.src;
      document.querySelectorAll('.pd-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  }

  // --- Header scroll ---
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

  // --- Search (same as main page) ---
  function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
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

  function renderSearchDropdown(query) {
    const dropdown = document.getElementById('searchDropdown');
    if (!dropdown) return;
    const q = (query || '').toLowerCase().trim();
    if (!q) { dropdown.classList.remove('active'); dropdown.innerHTML = ''; return; }

    const products = getActiveProducts().filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
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

  // ===================== WISHLIST (product detail page) =====================
  function getWishlist() {
    try { return JSON.parse(localStorage.getItem(getWishlistKey()) || '[]'); } catch { return []; }
  }

  function saveWishlist(list) {
    localStorage.setItem(getWishlistKey(), JSON.stringify(list));
  }

  function isInWishlist(productId) {
    return getWishlist().includes(productId);
  }

  function toggleWishlistPD(productId) {
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
    updateWishlistBtn();
    renderWishlistSidebar();
  }

  function updateWishlistBadge() {
    const badge = document.getElementById('wishlistBadge');
    if (!badge) return;
    const count = getWishlist().length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  function updateWishlistBtn() {
    const btn = document.getElementById('pdWishlistBtn');
    if (!btn || !currentProduct) return;
    const active = isInWishlist(currentProduct.id);
    btn.classList.toggle('active', active);
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', active ? 'currentColor' : 'none');
    btn.title = active ? 'Quitar de favoritos' : 'Agregar a favoritos';
  }

  function renderWishlistSidebar() {
    const container = document.getElementById('wishlistItems');
    const emptyEl = document.getElementById('wishlistEmpty');
    const countEl = document.getElementById('wishlistItemsCount');
    if (!container) return;

    const list = getWishlist();
    const products = getActiveProducts();

    if (countEl) countEl.textContent = list.length > 0 ? `(${list.length})` : '';
    container.querySelectorAll('.wishlist-item').forEach(el => el.remove());

    if (list.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

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

  function initWishlistUI() {
    if (!currentProduct) return;

    // Add wishlist button next to add-to-cart
    const actionsDiv = document.querySelector('.pd-actions');
    if (actionsDiv) {
      const active = isInWishlist(currentProduct.id);
      const btn = document.createElement('button');
      btn.className = 'btn-wishlist-detail' + (active ? ' active' : '');
      btn.id = 'pdWishlistBtn';
      btn.title = active ? 'Quitar de favoritos' : 'Agregar a favoritos';
      btn.setAttribute('aria-label', 'Favoritos');
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="${active ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`;
      btn.addEventListener('click', () => toggleWishlistPD(currentProduct.id));
      actionsDiv.appendChild(btn);
    }

    updateWishlistBadge();

    // Open/close wishlist sidebar
    document.getElementById('btnOpenWishlist')?.addEventListener('click', () => {
      document.getElementById('wishlistSidebar')?.classList.add('active');
      document.getElementById('wishlistOverlay')?.classList.add('active');
      document.body.style.overflow = 'hidden';
      renderWishlistSidebar();
    });
    document.getElementById('btnCloseWishlist')?.addEventListener('click', closeWishlist);
    document.getElementById('wishlistOverlay')?.addEventListener('click', closeWishlist);

    // Wishlist item actions
    document.getElementById('wishlistItems')?.addEventListener('click', e => {
      const cartBtn = e.target.closest('.wishlist-item-cart');
      if (cartBtn) { e.preventDefault(); Cart.addItem(cartBtn.dataset.productId); }
      const removeBtn = e.target.closest('.wishlist-item-remove');
      if (removeBtn) { e.preventDefault(); toggleWishlistPD(removeBtn.dataset.wishlistRemove); }
    });
  }

  function closeWishlist() {
    document.getElementById('wishlistSidebar')?.classList.remove('active');
    document.getElementById('wishlistOverlay')?.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ===================== SOCIAL MEDIA (FOOTER) =====================
  function renderSocialLinks() {
    const SOCIAL_ICONS = {
      instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
      facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>',
      tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.16 8.16 0 004.76 1.52V7.12a4.84 4.84 0 01-1-.43z"/></svg>',
      twitter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>',
      youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29.94 29.94 0 001 11.75a30 30 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2c.312-1.732.466-3.49.46-5.25a29.94 29.94 0 00-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>',
      whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'
    };
    const container = document.getElementById('footerSocialLinks');
    const wrapper = document.getElementById('footerSocial');
    if (!container) return;
    let links = {};
    try { links = JSON.parse(localStorage.getItem(SOCIAL_KEY) || '{}'); } catch {}
    const entries = Object.entries(links).filter(([, url]) => url && url.trim());
    if (entries.length === 0) { if (wrapper) wrapper.style.display = 'none'; return; }
    if (wrapper) wrapper.style.display = '';
    container.innerHTML = entries.map(([platform, url]) => {
      const icon = SOCIAL_ICONS[platform] || SOCIAL_ICONS.instagram;
      const safeName = Cart.escapeHTML(platform.charAt(0).toUpperCase() + platform.slice(1));
      return `<a href="${Cart.escapeAttr(url)}" target="_blank" rel="noopener" class="footer-social-link" title="${safeName}">${icon}<span>${safeName}</span></a>`;
    }).join('');
  }

  // ===================== IMAGE ZOOM =====================
  function openImageZoom(src) {
    if (!src) return;
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'image-zoom-overlay';
    overlay.innerHTML = `
      <button class="image-zoom-close" aria-label="Cerrar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="image-zoom-container">
        <img src="${Cart.escapeAttr(src)}" alt="Zoom" class="image-zoom-img" id="zoomImg">
      </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => overlay.classList.add('active'));

    const img = overlay.querySelector('.image-zoom-img');
    let scale = 1;
    let isDragging = false;
    let startX = 0, startY = 0, translateX = 0, translateY = 0;

    img.addEventListener('wheel', e => {
      e.preventDefault();
      scale = Math.min(4, Math.max(0.5, scale + (e.deltaY > 0 ? -0.2 : 0.2)));
      img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    }, { passive: false });

    img.addEventListener('mousedown', e => {
      if (scale <= 1) return;
      isDragging = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      img.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      if (img) img.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
    });

    // Touch pinch zoom
    let lastTouchDist = 0;
    img.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      }
    }, { passive: true });

    img.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        const delta = (dist - lastTouchDist) * 0.01;
        scale = Math.min(4, Math.max(0.5, scale + delta));
        img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        lastTouchDist = dist;
      }
    }, { passive: false });

    // Close
    const closeZoom = () => {
      overlay.classList.remove('active');
      setTimeout(() => { overlay.remove(); document.body.style.overflow = ''; }, 200);
    };
    overlay.querySelector('.image-zoom-close').addEventListener('click', closeZoom);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeZoom(); });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { closeZoom(); document.removeEventListener('keydown', onEsc); }
    });
  }

  return { init };
})();
