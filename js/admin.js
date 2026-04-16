/* ============================================================
   LIBRE TECH - Admin Panel (admin.js)
   GestiÃ³n de productos, CSV upload, autenticaciÃ³n admin
   ============================================================ */

const Admin = (() => {
  'use strict';

  const PRODUCTS_KEY = 'libretech_products';
  const ORDERS_KEY = 'libretech_orders';
  const AUTH_KEY = 'libretech_admin_auth';
  const PAGES_KEY = 'libretech_pages';
  const BANNERS_KEY = 'libretech_banners';
  const PQRS_KEY = 'libretech_pqrs';
  const VIEWS_KEY = 'libretech_views';
  const SOCIAL_KEY = 'libretech_social_links';

  // ContraseÃ±a admin (hash SHA-256)
  // ContraseÃ±a por defecto: "LibreTech2026!"
  // Para cambiarla, genera un nuevo hash SHA-256 y reemplaza aquÃ­
  const ADMIN_HASH = 'ffc37d18a54f184b8daa904fd3a3e261a6906b549316aee73bc9fcc8f3d2525b';

  let csvParsedData = [];
  let editingProductId = null;
  let currentColors = [];
  let currentSpecs = [];
  let currentImages = [];

  // --- InicializaciÃ³n ---
  function init() {
    if (isAuthenticated()) {
      showDashboard();
    }
    bindEvents();
  }

  // --- AutenticaciÃ³n simple ---
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function isAuthenticated() {
    try {
      const session = sessionStorage.getItem(AUTH_KEY);
      return session === 'true';
    } catch {
      return false;
    }
  }

  function setAuthenticated(value) {
    try {
      if (value) {
        sessionStorage.setItem(AUTH_KEY, 'true');
      } else {
        sessionStorage.removeItem(AUTH_KEY);
      }
    } catch {
      // Silenciar
    }
  }

  async function login(password) {
    const hash = await hashPassword(password);
    if (hash === ADMIN_HASH) {
      setAuthenticated(true);
      showDashboard();
      return true;
    }
    return false;
  }

  function logout() {
    setAuthenticated(false);
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('adminLoginWrapper').style.display = 'flex';
    document.getElementById('adminPassword').value = '';
  }

  async function showDashboard() {
    document.getElementById('adminLoginWrapper').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    await refreshOrders();
    updateStats();
    renderProductsTable();
    renderOrdersTable();
    renderPagesTable();
    renderBannersTable();
    renderPqrsTable();
    renderPromoPhotosTable();
    populateCategoriesDatalist();
  }

  // Fetch orders from Supabase and cache locally
  async function refreshOrders() {
    if (typeof SB === 'undefined' || !SB.client) return;
    try {
      const orders = await SB.getAllOrders();
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    } catch (e) {
      console.warn('[Admin] refreshOrders:', e.message);
    }
  }

  // --- Productos CRUD ---
  function getProducts() {
    try {
      return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function saveProducts(products) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }

  async function addProduct(product) {
    product.id = 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    product.createdAt = new Date().toISOString().split('T')[0];
    try {
      if (typeof SB !== 'undefined' && SB.client) { await SB.insertProduct(product); return product; }
    } catch (e) { console.warn('[Admin] SB insert fell back to local:', e.message); }
    const products = getProducts();
    products.push(product);
    saveProducts(products);
    return product;
  }

  async function updateProduct(id, updates) {
    try {
      if (typeof SB !== 'undefined' && SB.client) { await SB.updateProduct(id, updates); return getProducts().find(p => p.id === id) || null; }
    } catch (e) { console.warn('[Admin] SB update fell back to local:', e.message); }
    const products = getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    products[index] = { ...products[index], ...updates };
    saveProducts(products);
    return products[index];
  }

  async function deleteProduct(id) {
    try {
      if (typeof SB !== 'undefined' && SB.client) { await SB.deleteProduct(id); return; }
    } catch (e) { console.warn('[Admin] SB delete fell back to local:', e.message); }
    let products = getProducts();
    products = products.filter(p => p.id !== id);
    saveProducts(products);
  }

  // --- Stats ---
  function updateStats() {
    const products = getProducts();
    const categories = new Set(products.map(p => p.category).filter(Boolean));
    const active = products.filter(p => p.active !== false);

    let ordersCount = 0;
    try {
      const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      ordersCount = orders.length;
    } catch { /* noop */ }

    document.getElementById('statProducts').textContent = products.length;
    document.getElementById('statCategories').textContent = categories.size;
    document.getElementById('statActive').textContent = active.length;
    document.getElementById('statOrders').textContent = ordersCount;
  }

  // --- Tabla de productos ---
  function renderProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    const products = getProducts();

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:2rem;color:var(--text-tertiary);">
            No hay productos. Agrega el primero o importa desde un archivo plano.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr data-id="${escapeAttr(p.id)}">
        <td>
          <div class="table-product-info">
            <div class="table-product-thumb">
              ${p.image
                ? `<img src="${escapeAttr(p.image)}" alt="${escapeAttr(p.name)}" loading="lazy">`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:24px;height:24px;margin:10px auto;opacity:.3;display:block"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`
              }
            </div>
            <span>${escapeHTML(p.name)}</span>
          </div>
        </td>
        <td>${formatPrice(p.price)}</td>
        <td>${escapeHTML(p.category || 'â€”')}</td>
        <td>${p.stock ?? 'â€”'}</td>
        <td>
          <span class="table-status ${p.active !== false ? 'active' : 'inactive'}">
            <span class="table-status-dot"></span>
            ${p.active !== false ? 'Activo' : 'Inactivo'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="table-btn" data-action="edit" data-id="${escapeAttr(p.id)}" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="table-btn delete" data-action="delete" data-id="${escapeAttr(p.id)}" title="Eliminar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // --- Formulario de producto ---
  function openProductForm(productId = null) {
    editingProductId = productId;
    const overlay = document.getElementById('productFormOverlay');
    const title = document.getElementById('productFormTitle');
    const form = document.getElementById('productForm');

    form.reset();
    document.getElementById('productId').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('uploadText').style.display = 'block';
    document.getElementById('productOfferActive').checked = false;
    document.getElementById('offerFields').style.display = 'none';
    document.getElementById('productOfferPrice').value = '';
    document.getElementById('productOfferPercent').value = '';
    currentColors = [];
    currentSpecs = [];
    currentImages = [];
    renderColorTags();
    renderSpecsRows();
    renderImagePreviews();

    if (productId) {
      // Editar
      const products = getProducts();
      const product = products.find(p => p.id === productId);
      if (!product) return;

      title.textContent = 'Editar producto';
      document.getElementById('productId').value = product.id;
      document.getElementById('productName').value = product.name || '';
      document.getElementById('productPrice').value = product.price || '';
      document.getElementById('productStock').value = product.stock ?? 0;
      document.getElementById('productCategory').value = product.category || '';
      document.getElementById('productBrand').value = product.brand || '';
      document.getElementById('productDescription').value = product.description || '';
      document.getElementById('productActive').checked = product.active !== false;
      document.getElementById('productFeatured').checked = product.featured === true;

      // Offers
      const offerActive = product.offerActive === true;
      document.getElementById('productOfferActive').checked = offerActive;
      document.getElementById('offerFields').style.display = offerActive ? 'block' : 'none';
      document.getElementById('productOfferPrice').value = product.offerPrice || '';
      updateOfferPercent();

      currentColors = Array.isArray(product.colors) ? [...product.colors] : [];
      currentSpecs = Array.isArray(product.specs) ? product.specs.map(s => ({...s})) : [];
      renderColorTags();
      renderSpecsRows();

      if (product.image) {
        const preview = document.getElementById('imagePreview');
        preview.src = product.image;
        preview.style.display = 'block';
        document.getElementById('uploadText').style.display = 'none';
      }

      // Populate images array
      currentImages = [];
      if (product.image) currentImages.push(product.image);
      if (Array.isArray(product.images)) {
        product.images.forEach(img => {
          if (img && !currentImages.includes(img)) currentImages.push(img);
        });
      }
      renderImagePreviews();
    } else {
      title.textContent = 'Agregar producto';
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('productName').focus();
  }

  function closeProductForm() {
    document.getElementById('productFormOverlay').classList.remove('active');
    document.body.style.overflow = '';
    editingProductId = null;
  }

  async function saveProductForm() {
    const name = document.getElementById('productName').value.trim();
    const price = parseInt(document.getElementById('productPrice').value) || 0;
    const stock = parseInt(document.getElementById('productStock').value) || 0;
    const category = document.getElementById('productCategory').value.trim();
    const brand = document.getElementById('productBrand').value.trim();
    const description = document.getElementById('productDescription').value.trim();
    const active = document.getElementById('productActive').checked;
    const featured = document.getElementById('productFeatured').checked;
    const imagePreview = document.getElementById('imagePreview');
    const image = currentImages.length > 0 ? currentImages[0] : (imagePreview.style.display !== 'none' ? imagePreview.src : '');
    const images = currentImages.length > 0 ? [...currentImages] : (image ? [image] : []);

    // Collect specs from form
    collectSpecsFromForm();

    if (!name || price <= 0) {
      showToast('Nombre y precio son requeridos', 'error');
      return;
    }

    const productData = { name, price, stock, category, brand, description, active, featured, image, images, colors: [...currentColors], specs: [...currentSpecs],
      offerActive: document.getElementById('productOfferActive').checked,
      offerPrice: parseInt(document.getElementById('productOfferPrice').value) || 0
    };

    if (editingProductId) {
      await updateProduct(editingProductId, productData);
      showToast('Producto actualizado', 'success');
    } else {
      await addProduct(productData);
      showToast('Producto creado', 'success');
    }

    closeProductForm();
    renderProductsTable();
    updateStats();
    populateCategoriesDatalist();
  }

  // --- Imagen upload (Supabase Storage con fallback a dataURL) ---
  async function handleImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Solo se permiten archivos de imagen', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('La imagen no debe superar 2MB', 'error');
      return;
    }

    // Try Supabase Storage first
    if (typeof SB !== 'undefined' && SB.client) {
      try {
        const pid = editingProductId || ('new-' + Date.now());
        const url = await SB.uploadImage(file, pid);
        if (!currentImages.includes(url)) currentImages.push(url);
        _updateImagePreview();
        return;
      } catch (e) {
        console.warn('[Admin] SB upload failed, using dataURL:', e.message);
      }
    }

    // Fallback: dataURL
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      if (!currentImages.includes(dataUrl)) currentImages.push(dataUrl);
      _updateImagePreview();
    };
    reader.readAsDataURL(file);
  }

  function _updateImagePreview() {
    const preview = document.getElementById('imagePreview');
    if (currentImages.length >= 1) {
      preview.src = currentImages[0];
      preview.style.display = 'block';
      document.getElementById('uploadText').style.display = 'none';
    }
    renderImagePreviews();
  }

  async function handleMultipleImageUpload(files) {
    for (const f of Array.from(files)) await handleImageUpload(f);
  }

  function renderImagePreviews() {
    const grid = document.getElementById('imagePreviewsGrid');
    if (!grid) return;

    if (currentImages.length <= 1) {
      grid.innerHTML = '';
      return;
    }

    grid.innerHTML = currentImages.map((img, i) =>
      `<div class="img-preview-item${i === 0 ? ' primary' : ''}" data-index="${i}">
        <img src="${escapeAttr(img)}" alt="Imagen ${i + 1}">
        <div class="img-preview-actions">
          ${i !== 0 ? `<button type="button" class="img-prev-btn" data-action="primary" data-index="${i}" title="Hacer principal">★</button>` : '<span class="img-primary-badge">Principal</span>'}
          <button type="button" class="img-prev-btn delete" data-action="remove" data-index="${i}" title="Eliminar">✕</button>
        </div>
      </div>`
    ).join('');

    grid.querySelectorAll('.img-prev-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        if (btn.dataset.action === 'remove') {
          currentImages.splice(idx, 1);
          // Update main preview
          const preview = document.getElementById('imagePreview');
          if (currentImages.length === 0) {
            preview.style.display = 'none';
            document.getElementById('uploadText').style.display = 'block';
          } else {
            preview.src = currentImages[0];
          }
          renderImagePreviews();
        } else if (btn.dataset.action === 'primary') {
          const [moved] = currentImages.splice(idx, 1);
          currentImages.unshift(moved);
          const preview = document.getElementById('imagePreview');
          preview.src = currentImages[0];
          renderImagePreviews();
        }
      });
    });
  }

  // --- Excel Parsing (SheetJS) ---
  function parseExcel(data) {
    try {
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const products = [];
      json.forEach(row => {
        const name = String(row.nombre || row.Nombre || row.name || row.Name || '').trim();
        const price = parseInt(row.precio || row.Precio || row.price || row.Price || 0) || 0;
        const description = String(row.descripcion || row.Descripcion || row.description || row.Description || '').trim();
        const category = String(row.categoria || row.Categoria || row.category || row.Category || '').trim();
        const stock = parseInt(row.stock || row.Stock || 0) || 0;

        if (name && price > 0) {
          products.push({ name, price, description, category, stock, image: '', active: true });
        }
      });
      return products;
    } catch (err) {
      console.error('Error parsing Excel:', err);
      return [];
    }
  }

  function handleCSVFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target.result);
      csvParsedData = parseExcel(data);

      if (csvParsedData.length === 0) {
        showToast('No se encontraron productos vÃ¡lidos en el archivo Excel', 'error');
        return;
      }

      renderCSVPreview(csvParsedData);
      showToast(`${csvParsedData.length} productos encontrados`, 'info');
    };
    reader.readAsArrayBuffer(file);
  }

  function renderCSVPreview(data) {
    const preview = document.getElementById('csvPreview');
    const tbody = document.getElementById('csvPreviewBody');
    const count = document.getElementById('csvPreviewCount');

    if (!preview || !tbody) return;

    count.textContent = data.length;
    tbody.innerHTML = data.map(p => `
      <tr>
        <td>${escapeHTML(p.name)}</td>
        <td>${formatPrice(p.price)}</td>
        <td>${escapeHTML(p.description || 'â€”')}</td>
        <td>${escapeHTML(p.category || 'â€”')}</td>
        <td>${p.stock}</td>
      </tr>
    `).join('');

    preview.style.display = 'block';
  }

  function importCSVProducts() {
    if (csvParsedData.length === 0) return;

    const products = getProducts();

    csvParsedData.forEach(p => {
      p.id = 'prod-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
      p.createdAt = new Date().toISOString().split('T')[0];
      products.push(p);
    });

    saveProducts(products);
    showToast(`${csvParsedData.length} productos importados exitosamente`, 'success');

    csvParsedData = [];
    document.getElementById('csvPreview').style.display = 'none';
    document.getElementById('csvFileInput').value = '';

    // Cambiar a tab de productos
    switchTab('products');
    renderProductsTable();
    updateStats();
    populateCategoriesDatalist();
  }

  // --- Datalist de categorÃ­as y marcas ---
  function populateCategoriesDatalist() {
    const datalist = document.getElementById('categoriesList');
    const brandsDatalist = document.getElementById('brandsList');

    const products = getProducts();

    if (datalist) {
      const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
      datalist.innerHTML = categories.map(c => `<option value="${escapeAttr(c)}">`).join('');
    }

    if (brandsDatalist) {
      const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
      brandsDatalist.innerHTML = brands.map(b => `<option value="${escapeAttr(b)}">`).join('');
    }
  }

  // --- Color tags ---
  function renderColorTags() {
    const container = document.getElementById('colorsTags');
    if (!container) return;
    container.innerHTML = currentColors.map((c, i) => `
      <span class="color-tag">
        ${escapeHTML(c)}
        <button type="button" class="color-tag-remove" data-index="${i}" aria-label="Eliminar color">&times;</button>
      </span>
    `).join('');

    container.querySelectorAll('.color-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        currentColors.splice(parseInt(btn.dataset.index), 1);
        renderColorTags();
      });
    });
  }

  // --- Spec rows ---
  function renderSpecsRows() {
    const container = document.getElementById('specsContainer');
    if (!container) return;
    container.innerHTML = currentSpecs.map((s, i) => `
      <div class="spec-row" data-index="${i}">
        <input type="text" class="form-input spec-key" value="${escapeAttr(s.key)}" placeholder="Nombre (ej: Peso)">
        <input type="text" class="form-input spec-value" value="${escapeAttr(s.value)}" placeholder="Valor (ej: 250g)">
        <button type="button" class="btn-icon btn-remove-spec" data-index="${i}" aria-label="Eliminar especificaciÃ³n">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');

    container.querySelectorAll('.btn-remove-spec').forEach(btn => {
      btn.addEventListener('click', () => {
        currentSpecs.splice(parseInt(btn.dataset.index), 1);
        renderSpecsRows();
      });
    });
  }

  function collectSpecsFromForm() {
    const rows = document.querySelectorAll('.spec-row');
    currentSpecs = [];
    rows.forEach(row => {
      const key = row.querySelector('.spec-key')?.value.trim();
      const value = row.querySelector('.spec-value')?.value.trim();
      if (key && value) {
        currentSpecs.push({ key, value });
      }
    });
  }

  // --- Tabs ---
  function switchTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    document.querySelectorAll('.admin-tab-content').forEach(c => {
      c.style.display = 'none';
    });

    const tabMap = { products: 'tabProducts', csv: 'tabCsv', orders: 'tabOrders', pages: 'tabPages', stats: 'tabStats', banners: 'tabBanners', pqrs: 'tabPqrs', social: 'tabSocial' };
    const tabEl = document.getElementById(tabMap[tabName]);
    if (tabEl) tabEl.style.display = 'block';

    if (tabName === 'orders') renderOrdersTable();
    if (tabName === 'pages') renderPagesTable();
    if (tabName === 'stats') renderStats();
    if (tabName === 'banners') { renderBannersTable(); renderPromoPhotosTable(); }
    if (tabName === 'pqrs') renderPqrsTable();
    if (tabName === 'social') loadSocialLinks();
  }

  // --- Eventos ---
  function bindEvents() {
    // Login
    document.getElementById('adminLoginForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value;
      if (!email || !password) { showToast('Ingresa email y contraseña', 'error'); return; }
      const success = await login(email, password);
      if (!success) {
        document.getElementById('loginError').style.display = 'block';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminPassword').focus();
      }
    });

    // Logout
    document.getElementById('btnAdminLogout')?.addEventListener('click', logout);

    // Agregar producto
    document.getElementById('btnAddProduct')?.addEventListener('click', () => openProductForm());

    // Tabla de productos (delegación)
    document.getElementById('productsTableBody')?.addEventListener('click', async e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const { action, id } = btn.dataset;
      if (action === 'edit') {
        openProductForm(id);
      } else if (action === 'delete') {
        if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
          await deleteProduct(id);
          renderProductsTable();
          updateStats();
          showToast('Producto eliminado', 'info');
        }
      }
    });

    // Formulario de producto
    document.getElementById('productForm')?.addEventListener('submit', e => {
      e.preventDefault();
      saveProductForm();
    });

    // Cerrar formulario
    document.getElementById('btnCloseProductForm')?.addEventListener('click', closeProductForm);
    document.getElementById('btnCancelProduct')?.addEventListener('click', closeProductForm);
    document.getElementById('productFormOverlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeProductForm();
    });

    // Imagen upload
    const imageArea = document.getElementById('imageUploadArea');
    const imageInput = document.getElementById('imageInput');

    imageArea?.addEventListener('click', () => imageInput?.click());
    imageInput?.addEventListener('change', e => {
      if (e.target.files.length > 0) handleMultipleImageUpload(e.target.files);
    });

    imageArea?.addEventListener('dragover', e => {
      e.preventDefault();
      imageArea.style.borderColor = 'var(--primary-blue)';
    });
    imageArea?.addEventListener('dragleave', () => {
      imageArea.style.borderColor = '';
    });
    imageArea?.addEventListener('drop', e => {
      e.preventDefault();
      imageArea.style.borderColor = '';
      if (e.dataTransfer.files.length > 0) handleMultipleImageUpload(e.dataTransfer.files);
    });

    // CSV upload
    const csvZone = document.getElementById('csvDropZone');
    const csvInput = document.getElementById('csvFileInput');

    csvZone?.addEventListener('click', () => csvInput?.click());
    csvInput?.addEventListener('change', e => {
      if (e.target.files[0]) handleCSVFile(e.target.files[0]);
    });

    csvZone?.addEventListener('dragover', e => {
      e.preventDefault();
      csvZone.classList.add('dragover');
    });
    csvZone?.addEventListener('dragleave', () => {
      csvZone.classList.remove('dragover');
    });
    csvZone?.addEventListener('drop', e => {
      e.preventDefault();
      csvZone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) handleCSVFile(e.dataTransfer.files[0]);
    });

    // CSV actions
    document.getElementById('btnCsvImport')?.addEventListener('click', importCSVProducts);
    document.getElementById('btnCsvCancel')?.addEventListener('click', () => {
      csvParsedData = [];
      document.getElementById('csvPreview').style.display = 'none';
      document.getElementById('csvFileInput').value = '';
    });

    // Tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeProductForm();
        closePageForm();
        closeOrderDetail();
      }
    });

    // Colors input
    document.getElementById('colorsInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const input = e.target;
        const color = input.value.trim();
        if (color && !currentColors.includes(color)) {
          currentColors.push(color);
          renderColorTags();
        }
        input.value = '';
      }
    });

    // Add spec row
    document.getElementById('btnAddSpec')?.addEventListener('click', () => {
      collectSpecsFromForm();
      currentSpecs.push({ key: '', value: '' });
      renderSpecsRows();
      const lastKey = document.querySelector('.spec-row:last-child .spec-key');
      if (lastKey) lastKey.focus();
    });

    // Order status filter
    document.getElementById('orderStatusFilter')?.addEventListener('change', () => renderOrdersTable());

    // Order detail close
    document.getElementById('btnCloseOrderDetail')?.addEventListener('click', closeOrderDetail);
    document.getElementById('orderDetailOverlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeOrderDetail();
    });

    // Pages form
    document.getElementById('pageForm')?.addEventListener('submit', e => {
      e.preventDefault();
      savePageForm();
    });
    document.getElementById('btnClosePageForm')?.addEventListener('click', closePageForm);
    document.getElementById('btnCancelPage')?.addEventListener('click', closePageForm);
    document.getElementById('pageFormOverlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) closePageForm();
    });

    // Offer toggle
    document.getElementById('productOfferActive')?.addEventListener('change', e => {
      document.getElementById('offerFields').style.display = e.target.checked ? 'block' : 'none';
    });
    document.getElementById('productOfferPrice')?.addEventListener('input', updateOfferPercent);
    document.getElementById('productPrice')?.addEventListener('input', updateOfferPercent);

    // Banners
    document.getElementById('btnAddBanner')?.addEventListener('click', () => openBannerForm());
    document.getElementById('bannerForm')?.addEventListener('submit', e => { e.preventDefault(); saveBannerForm(); });
    document.getElementById('btnCloseBannerForm')?.addEventListener('click', closeBannerForm);
    document.getElementById('btnCancelBanner')?.addEventListener('click', closeBannerForm);
    document.getElementById('bannerFormOverlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeBannerForm(); });
    const bannerImgArea = document.getElementById('bannerImageArea');
    const bannerImgInput = document.getElementById('bannerImageInput');
    bannerImgArea?.addEventListener('click', () => bannerImgInput?.click());
    bannerImgInput?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      if (file.size > 2 * 1024 * 1024) { showToast('Imagen max 2MB', 'error'); return; }
      const r = new FileReader(); r.onload = ev => { document.getElementById('bannerImagePreview').src = ev.target.result; document.getElementById('bannerImagePreview').style.display = 'block'; document.getElementById('bannerUploadText').style.display = 'none'; }; r.readAsDataURL(file);
    });

    // PQRs
    document.getElementById('pqrStatusFilter')?.addEventListener('change', () => renderPqrsTable());
    document.getElementById('pqrReplyForm')?.addEventListener('submit', e => { e.preventDefault(); savePqrReply(); });
    document.getElementById('btnClosePqrDetail')?.addEventListener('click', closePqrDetail);
    document.getElementById('pqrDetailOverlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closePqrDetail(); });

    // Social links
    document.getElementById('socialLinksForm')?.addEventListener('submit', e => { e.preventDefault(); saveSocialLinks(); });

    // Promo photo banners
    document.getElementById('btnAddPromoPhoto')?.addEventListener('click', () => openPromoPhotoForm());
    document.getElementById('promoPhotoForm')?.addEventListener('submit', e => { e.preventDefault(); savePromoPhotoForm(); });
    document.getElementById('btnClosePromoPhotoForm')?.addEventListener('click', closePromoPhotoForm);
    document.getElementById('btnCancelPromoPhoto')?.addEventListener('click', closePromoPhotoForm);
    document.getElementById('promoPhotoFormOverlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closePromoPhotoForm(); });
    const promoPhotoImgArea = document.getElementById('promoPhotoImageArea');
    const promoPhotoImgInput = document.getElementById('promoPhotoImageInput');
    promoPhotoImgArea?.addEventListener('click', () => promoPhotoImgInput?.click());
    promoPhotoImgInput?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) { showToast('Imagen max 5MB', 'error'); return; }
      const r = new FileReader();
      r.onload = ev => { document.getElementById('promoPhotoImagePreview').src = ev.target.result; document.getElementById('promoPhotoImagePreview').style.display = 'block'; document.getElementById('promoPhotoUploadText').style.display = 'none'; };
      r.readAsDataURL(file);
    });
  }

  // --- Utilidades ---
  function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icons[type] || icons.info} ${escapeHTML(message)}`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
  }

  // ===== ORDERS MANAGEMENT =====
  const ORDER_STATUS_LABELS = {
    pending: 'Pendiente',
    processing: 'En proceso',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  };

  function getOrders() {
    try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); }
    catch { return []; }
  }

  function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  }

  function updateOrderStatus(orderId, status) {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      saveOrders(orders);
    }
    if (typeof SB !== 'undefined' && SB.client) {
      SB.updateOrderStatus(orderId, status).catch(e => console.warn('[Admin] SB status update:', e));
    }
  }

  function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    const filterEl = document.getElementById('orderStatusFilter');
    const statusFilter = filterEl ? filterEl.value : 'all';
    let orders = getOrders();

    if (statusFilter !== 'all') {
      orders = orders.filter(o => (o.status || 'pending') === statusFilter);
    }

    // Sort newest first
    orders.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-tertiary);">No hay pedidos${statusFilter !== 'all' ? ' con este estado' : ''}.</td></tr>`;
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const status = o.status || 'pending';
      const itemsSummary = (o.items || []).map(i => `${i.name} x${i.quantity}`).join(', ');
      const shortItems = itemsSummary.length > 60 ? itemsSummary.substring(0, 57) + '...' : itemsSummary;
      return `
        <tr data-order-id="${escapeAttr(o.id)}">
          <td><strong>${escapeHTML(o.id)}</strong></td>
          <td>${escapeHTML(o.date ? new Date(o.date).toLocaleDateString('es-CO') : 'â€”')}</td>
          <td title="${escapeAttr(itemsSummary)}">${escapeHTML(shortItems)}</td>
          <td><strong>${formatPrice(o.total || 0)}</strong></td>
          <td>
            <select class="form-select order-status-select" data-order-id="${escapeAttr(o.id)}" style="font-size:0.8rem;padding:0.25rem 0.5rem;width:auto;">
              ${Object.entries(ORDER_STATUS_LABELS).map(([val, label]) =>
                `<option value="${val}" ${status === val ? 'selected' : ''}>${label}</option>`
              ).join('')}
            </select>
          </td>
          <td>
            <button class="table-btn" data-action="view-order" data-order-id="${escapeAttr(o.id)}" title="Ver detalle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Status change events
    tbody.querySelectorAll('.order-status-select').forEach(sel => {
      sel.addEventListener('change', e => {
        updateOrderStatus(e.target.dataset.orderId, e.target.value);
        showToast('Estado del pedido actualizado', 'success');
      });
    });

    // View detail events
    tbody.querySelectorAll('[data-action="view-order"]').forEach(btn => {
      btn.addEventListener('click', () => openOrderDetail(btn.dataset.orderId));
    });
  }

  function openOrderDetail(orderId) {
    const orders = getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const overlay = document.getElementById('orderDetailOverlay');
    const title = document.getElementById('orderDetailTitle');
    const body = document.getElementById('orderDetailBody');

    title.textContent = `Pedido ${order.id}`;
    body.innerHTML = `
      <div style="margin-bottom:var(--spacing-md)">
        <strong>Fecha:</strong> ${order.date ? new Date(order.date).toLocaleString('es-CO') : 'â€”'}<br>
        <strong>Estado:</strong> ${ORDER_STATUS_LABELS[order.status || 'pending']}<br>
        ${order.customer ? `<strong>Cliente:</strong> ${escapeHTML(order.customer)}<br>` : ''}
        ${order.phone ? `<strong>TelÃ©fono:</strong> ${escapeHTML(order.phone)}<br>` : ''}
      </div>
      <table class="products-table" style="margin-bottom:var(--spacing-md)">
        <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
        <tbody>
          ${(order.items || []).map(i => `
            <tr>
              <td>${escapeHTML(i.name)}</td>
              <td>${i.quantity}</td>
              <td>${formatPrice(i.price)}</td>
              <td>${formatPrice(i.price * i.quantity)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot><tr><td colspan="3" style="text-align:right"><strong>Total:</strong></td><td><strong>${formatPrice(order.total || 0)}</strong></td></tr></tfoot>
      </table>
    `;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeOrderDetail() {
    const overlay = document.getElementById('orderDetailOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ===== PAGES CMS =====
  const DEFAULT_PAGES = {
    'sobre-nosotros': { title: 'Sobre Nosotros', content: '<h1>Sobre Nosotros</h1><p>Somos LIBRE TECH, tu tienda de confianza.</p>' },
    'preguntas-frecuentes': { title: 'Preguntas Frecuentes', content: '<h1>Preguntas Frecuentes</h1><p>PrÃ³ximamente...</p>' },
    'contactanos': { title: 'ContÃ¡ctanos', content: '<h1>ContÃ¡ctanos</h1><p>WhatsApp: +57 300 560 6287</p>' },
    'seguimiento-pedido': { title: 'Seguimiento de Pedido', content: '<h1>Seguimiento de su Pedido</h1><p>ContÃ¡ctanos por WhatsApp.</p>' },
    'politica-privacidad': { title: 'PolÃ­tica de Privacidad', content: '<h1>PolÃ­tica de Privacidad</h1><p>Respetamos tu privacidad.</p>' },
    'terminos-condiciones': { title: 'TÃ©rminos y Condiciones', content: '<h1>TÃ©rminos y Condiciones</h1><p>PrÃ³ximamente...</p>' },
    'devoluciones-garantias': { title: 'Devoluciones y GarantÃ­as', content: '<h1>Devoluciones y GarantÃ­as</h1><p>PrÃ³ximamente...</p>' }
  };

  function getPages() {
    try { return JSON.parse(localStorage.getItem(PAGES_KEY) || 'null') || DEFAULT_PAGES; }
    catch { return DEFAULT_PAGES; }
  }

  function savePages(pages) {
    localStorage.setItem(PAGES_KEY, JSON.stringify(pages));
  }

  function renderPagesTable() {
    const tbody = document.getElementById('pagesTableBody');
    if (!tbody) return;

    const pages = getPages();
    const slugs = Object.keys(pages);

    tbody.innerHTML = slugs.map(slug => {
      const page = pages[slug];
      return `
        <tr>
          <td>${escapeHTML(page.title)}</td>
          <td><code>${escapeHTML(slug)}</code></td>
          <td>
            <div class="table-actions">
              <button class="table-btn" data-action="edit-page" data-slug="${escapeAttr(slug)}" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <a href="pagina.html?page=${encodeURIComponent(slug)}" target="_blank" class="table-btn" title="Ver pÃ¡gina">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </a>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Edit page events
    tbody.querySelectorAll('[data-action="edit-page"]').forEach(btn => {
      btn.addEventListener('click', () => openPageForm(btn.dataset.slug));
    });
  }

  function openPageForm(slug) {
    const pages = getPages();
    const page = pages[slug];
    if (!page) return;

    document.getElementById('pageSlug').value = slug;
    document.getElementById('pageTitle').value = page.title || '';
    document.getElementById('pageContent').value = page.content || '';
    document.getElementById('pageFormTitle').textContent = `Editar: ${page.title}`;

    document.getElementById('pageFormOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closePageForm() {
    const overlay = document.getElementById('pageFormOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function savePageForm() {
    const slug = document.getElementById('pageSlug').value;
    const title = document.getElementById('pageTitle').value.trim();
    const content = document.getElementById('pageContent').value;

    if (!slug || !title) {
      showToast('El tÃ­tulo es requerido', 'error');
      return;
    }

    const pages = getPages();
    pages[slug] = { title, content };
    savePages(pages);

    closePageForm();
    renderPagesTable();
    showToast('PÃ¡gina actualizada', 'success');
  }

  // ===== OFFER TOGGLE =====
  function updateOfferPercent() {
    const price = parseInt(document.getElementById('productPrice').value) || 0;
    const offer = parseInt(document.getElementById('productOfferPrice').value) || 0;
    const el = document.getElementById('productOfferPercent');
    if (price > 0 && offer > 0 && offer < price) {
      el.value = Math.round((1 - offer / price) * 100) + '%';
    } else { el.value = 'â€”'; }
  }

  // ===== STATISTICS =====
  function renderStats() {
    const orders = getOrders();
    const products = getProducts();
    const views = getViews();

    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const totalSales = orders.length;
    const avgOrder = totalSales > 0 ? Math.round(totalRevenue / totalSales) : 0;
    const totalViews = Object.values(views).reduce((s, v) => s + v, 0);

    document.getElementById('statTotalRevenue').textContent = formatPrice(totalRevenue);
    document.getElementById('statTotalSales').textContent = totalSales;
    document.getElementById('statAvgOrder').textContent = formatPrice(avgOrder);
    document.getElementById('statTotalViews').textContent = totalViews;

    // Most viewed
    const viewEntries = Object.entries(views).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const mvEl = document.getElementById('mostViewedList');
    if (mvEl) {
      if (viewEntries.length === 0) { mvEl.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">Sin datos aÃºn</p>'; }
      else { mvEl.innerHTML = viewEntries.map(([pid, count], i) => {
        const p = products.find(x => x.id === pid);
        return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light);font-size:0.85rem;"><span>${i+1}. ${p ? escapeHTML(p.name) : pid}</span><strong>${count} vistas</strong></div>`;
      }).join(''); }
    }

    // Top selling
    const salesMap = {};
    orders.forEach(o => (o.items || []).forEach(it => { salesMap[it.name] = (salesMap[it.name] || 0) + it.quantity; }));
    const topSelling = Object.entries(salesMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const tsEl = document.getElementById('topSellingList');
    if (tsEl) {
      if (topSelling.length === 0) { tsEl.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">Sin datos aÃºn</p>'; }
      else { tsEl.innerHTML = topSelling.map(([name, qty], i) =>
        `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light);font-size:0.85rem;"><span>${i+1}. ${escapeHTML(name)}</span><strong>${qty} vendidos</strong></div>`
      ).join(''); }
    }

    // Sales by category
    const catMap = {};
    orders.forEach(o => (o.items || []).forEach(it => {
      const p = products.find(x => x.name === it.name);
      const cat = p ? p.category : 'Otro';
      catMap[cat] = (catMap[cat] || 0) + (it.price * it.quantity);
    }));
    const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    const scEl = document.getElementById('salesByCategoryList');
    if (scEl) {
      if (catEntries.length === 0) { scEl.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">Sin datos aÃºn</p>'; }
      else { scEl.innerHTML = catEntries.map(([cat, total]) =>
        `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light);font-size:0.85rem;"><span>${escapeHTML(cat)}</span><strong>${formatPrice(total)}</strong></div>`
      ).join(''); }
    }
  }

  function getViews() {
    try { return JSON.parse(localStorage.getItem(VIEWS_KEY) || '{}'); } catch { return {}; }
  }

  // ===== BANNERS =====
  function getBanners() {
    try { return JSON.parse(localStorage.getItem(BANNERS_KEY) || '[]'); } catch { return []; }
  }
  function saveBanners(banners) { localStorage.setItem(BANNERS_KEY, JSON.stringify(banners)); }

  function renderBannersTable() {
    const container = document.getElementById('bannersContainer');
    if (!container) return;
    const banners = getBanners();
    if (banners.length === 0) { container.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">No hay banners personalizados.</p>'; return; }

    container.innerHTML = banners.map((b, i) => `
      <div style="display:flex;align-items:center;gap:var(--spacing-md);padding:var(--spacing-md);border:1px solid var(--border-light);border-radius:var(--radius-md);margin-bottom:var(--spacing-sm);background:var(--bg-secondary)">
        <div style="width:120px;height:60px;border-radius:var(--radius-sm);overflow:hidden;background:var(--bg-tertiary);flex-shrink:0">
          ${b.image ? `<img src="${escapeAttr(b.image)}" style="width:100%;height:100%;object-fit:cover">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);font-size:0.7rem">Sin imagen</div>'}
        </div>
        <div style="flex:1;min-width:0">
          <strong style="font-size:0.9rem">${escapeHTML(b.title)}</strong>
          <div style="font-size:0.8rem;color:var(--text-secondary)">${b.subtitle || ''}</div>
          <div style="font-size:0.75rem;color:var(--text-tertiary)">${b.startDate || 'â€”'} â†’ ${b.endDate || 'â€”'} | ${b.active ? 'âœ… Activo' : 'âŒ Inactivo'}</div>
        </div>
        <div class="table-actions">
          <button class="table-btn" onclick="Admin._editBanner(${i})" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="table-btn delete" onclick="Admin._deleteBanner(${i})" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  let editingBannerIndex = -1;
  function openBannerForm(index = -1) {
    editingBannerIndex = index;
    const form = document.getElementById('bannerForm');
    form.reset();
    document.getElementById('bannerImagePreview').style.display = 'none';
    document.getElementById('bannerUploadText').style.display = 'block';

    if (index >= 0) {
      const banners = getBanners();
      const b = banners[index];
      if (!b) return;
      document.getElementById('bannerFormTitle').textContent = 'Editar banner';
      document.getElementById('bannerTitle').value = b.title || '';
      document.getElementById('bannerSubtitle').value = b.subtitle || '';
      document.getElementById('bannerStartDate').value = b.startDate || '';
      document.getElementById('bannerEndDate').value = b.endDate || '';
      document.getElementById('bannerActive').checked = b.active !== false;
      if (b.image) { document.getElementById('bannerImagePreview').src = b.image; document.getElementById('bannerImagePreview').style.display = 'block'; document.getElementById('bannerUploadText').style.display = 'none'; }
    } else {
      document.getElementById('bannerFormTitle').textContent = 'Agregar banner';
    }

    document.getElementById('bannerFormOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeBannerForm() { document.getElementById('bannerFormOverlay').classList.remove('active'); document.body.style.overflow = ''; }

  function saveBannerForm() {
    const title = document.getElementById('bannerTitle').value.trim();
    if (!title) { showToast('TÃ­tulo requerido', 'error'); return; }
    const preview = document.getElementById('bannerImagePreview');
    const data = {
      title, subtitle: document.getElementById('bannerSubtitle').value.trim(),
      startDate: document.getElementById('bannerStartDate').value, endDate: document.getElementById('bannerEndDate').value,
      active: document.getElementById('bannerActive').checked,
      image: preview.style.display !== 'none' ? preview.src : ''
    };
    const banners = getBanners();
    if (editingBannerIndex >= 0) { banners[editingBannerIndex] = data; } else { banners.push(data); }
    saveBanners(banners);
    closeBannerForm(); renderBannersTable();
    showToast('Banner guardado', 'success');
  }

  // ===== PQRs =====
  const PQR_STATUS_LABELS = { open: 'Abierto', answered: 'Respondido', closed: 'Cerrado' };
  function getPqrs() { try { return JSON.parse(localStorage.getItem(PQRS_KEY) || '[]'); } catch { return []; } }
  function savePqrs(pqrs) { localStorage.setItem(PQRS_KEY, JSON.stringify(pqrs)); }

  function renderPqrsTable() {
    const tbody = document.getElementById('pqrsTableBody');
    if (!tbody) return;
    const filterEl = document.getElementById('pqrStatusFilter');
    const statusFilter = filterEl ? filterEl.value : 'all';
    let pqrs = getPqrs();
    if (statusFilter !== 'all') pqrs = pqrs.filter(p => (p.status || 'open') === statusFilter);
    pqrs.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (pqrs.length === 0) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-tertiary);">No hay PQRs${statusFilter !== 'all' ? ' con este estado' : ''}.</td></tr>`; return; }

    tbody.innerHTML = pqrs.map(p => {
      const status = p.status || 'open';
      return `<tr>
        <td><strong>${escapeHTML(p.id)}</strong></td>
        <td>${escapeHTML(p.type || 'PeticiÃ³n')}</td>
        <td>${escapeHTML(p.subject || 'â€”')}</td>
        <td>${escapeHTML(p.userName || 'â€”')}</td>
        <td>${p.date ? new Date(p.date).toLocaleDateString('es-CO') : 'â€”'}</td>
        <td><span class="table-status ${status === 'open' ? 'inactive' : 'active'}"><span class="table-status-dot"></span>${PQR_STATUS_LABELS[status] || status}</span></td>
        <td><button class="table-btn" data-action="view-pqr" data-pqr-id="${escapeAttr(p.id)}" title="Ver"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-action="view-pqr"]').forEach(btn => {
      btn.addEventListener('click', () => openPqrDetail(btn.dataset.pqrId));
    });
  }

  function openPqrDetail(pqrId) {
    const pqrs = getPqrs();
    const pqr = pqrs.find(p => p.id === pqrId);
    if (!pqr) return;
    document.getElementById('pqrDetailTitle').textContent = `PQR ${pqr.id}`;
    document.getElementById('pqrReplyId').value = pqrId;
    document.getElementById('pqrReplyText').value = pqr.reply || '';
    document.getElementById('pqrDetailBody').innerHTML = `
      <div style="margin-bottom:var(--spacing-md)">
        <strong>Tipo:</strong> ${escapeHTML(pqr.type || 'PeticiÃ³n')}<br>
        <strong>Asunto:</strong> ${escapeHTML(pqr.subject || 'â€”')}<br>
        <strong>Usuario:</strong> ${escapeHTML(pqr.userName || 'â€”')} (${escapeHTML(pqr.userEmail || 'â€”')})<br>
        <strong>Fecha:</strong> ${pqr.date ? new Date(pqr.date).toLocaleString('es-CO') : 'â€”'}<br>
        <strong>Estado:</strong> ${PQR_STATUS_LABELS[pqr.status || 'open']}
      </div>
      <div style="background:var(--bg-secondary);padding:var(--spacing-md);border-radius:var(--radius-md);margin-bottom:var(--spacing-md)">
        <strong>Mensaje:</strong><br>${escapeHTML(pqr.message || '')}
      </div>
      ${pqr.reply ? `<div style="background:rgba(52,199,89,0.08);padding:var(--spacing-md);border-radius:var(--radius-md);border-left:3px solid var(--success)"><strong>Respuesta admin:</strong><br>${escapeHTML(pqr.reply)}</div>` : ''}
    `;
    document.getElementById('pqrDetailOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closePqrDetail() { document.getElementById('pqrDetailOverlay').classList.remove('active'); document.body.style.overflow = ''; }

  function savePqrReply() {
    const id = document.getElementById('pqrReplyId').value;
    const reply = document.getElementById('pqrReplyText').value.trim();
    if (!reply) { showToast('Escribe una respuesta', 'error'); return; }
    const pqrs = getPqrs();
    const pqr = pqrs.find(p => p.id === id);
    if (pqr) { pqr.reply = reply; pqr.status = 'answered'; savePqrs(pqrs); }
    closePqrDetail(); renderPqrsTable();
    showToast('Respuesta enviada', 'success');
  }

  // ===== SOCIAL LINKS =====
  function loadSocialLinks() {
    let links = {};
    try { links = JSON.parse(localStorage.getItem(SOCIAL_KEY) || '{}'); } catch {}
    document.getElementById('socialInstagram').value = links.instagram || '';
    document.getElementById('socialFacebook').value = links.facebook || '';
    document.getElementById('socialTiktok').value = links.tiktok || '';
    document.getElementById('socialTwitter').value = links.twitter || '';
    document.getElementById('socialYoutube').value = links.youtube || '';
    document.getElementById('socialWhatsapp').value = links.whatsapp || '';
  }

  function saveSocialLinks() {
    const links = {};
    const fields = ['instagram','facebook','tiktok','twitter','youtube','whatsapp'];
    fields.forEach(f => {
      const val = document.getElementById('social' + f.charAt(0).toUpperCase() + f.slice(1))?.value?.trim();
      if (val) links[f] = val;
    });
    localStorage.setItem(SOCIAL_KEY, JSON.stringify(links));
    showToast('Redes sociales guardadas', 'success');
  }

  // ===== PROMO PHOTO BANNERS (full-width image banners) =====
  const PROMO_PHOTOS_KEY = 'libretech_promo_photos';

  function getPromoPhotos() { try { return JSON.parse(localStorage.getItem(PROMO_PHOTOS_KEY) || '[]'); } catch { return []; } }
  function savePromoPhotos(arr) { localStorage.setItem(PROMO_PHOTOS_KEY, JSON.stringify(arr)); }

  function renderPromoPhotosTable() {
    const container = document.getElementById('promoPhotosContainer');
    if (!container) return;
    const photos = getPromoPhotos();
    if (photos.length === 0) {
      container.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">No hay banners de foto promocional.</p>';
      return;
    }
    container.innerHTML = photos.map((p, i) => `
      <div style="display:flex;align-items:center;gap:var(--spacing-md);padding:var(--spacing-md);background:var(--bg-secondary);border-radius:var(--radius-md);margin-bottom:var(--spacing-sm)">
        <div style="width:160px;height:60px;border-radius:var(--radius-sm);overflow:hidden;background:var(--bg-tertiary);flex-shrink:0">
          ${p.image ? `<img src="${escapeAttr(p.image)}" style="width:100%;height:100%;object-fit:cover">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);font-size:0.7rem">Sin imagen</div>'}
        </div>
        <div style="flex:1;min-width:0">
          <strong style="font-size:0.9rem">${escapeHTML(p.title || 'Sin título')}</strong>
          <div style="font-size:0.8rem;color:var(--text-secondary)">${p.link ? escapeHTML(p.link) : 'Sin enlace'}</div>
          <div style="font-size:0.75rem;color:var(--text-tertiary)">${p.position || 'Después de destacados'} | ${p.active ? '✅ Activo' : '❌ Inactivo'}</div>
        </div>
        <div class="table-actions">
          <button class="table-btn" onclick="Admin._editPromoPhoto(${i})" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="table-btn delete" onclick="Admin._deletePromoPhoto(${i})" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  let editingPromoPhotoIndex = -1;
  function openPromoPhotoForm(index = -1) {
    editingPromoPhotoIndex = index;
    const form = document.getElementById('promoPhotoForm');
    form.reset();
    document.getElementById('promoPhotoImagePreview').style.display = 'none';
    document.getElementById('promoPhotoUploadText').style.display = 'block';

    if (index >= 0) {
      const photos = getPromoPhotos();
      const p = photos[index];
      if (!p) return;
      document.getElementById('promoPhotoFormTitle').textContent = 'Editar banner foto';
      document.getElementById('promoPhotoTitle').value = p.title || '';
      document.getElementById('promoPhotoLink').value = p.link || '';
      document.getElementById('promoPhotoPosition').value = p.position || 'after-featured';
      document.getElementById('promoPhotoActive').checked = p.active !== false;
      if (p.image) {
        document.getElementById('promoPhotoImagePreview').src = p.image;
        document.getElementById('promoPhotoImagePreview').style.display = 'block';
        document.getElementById('promoPhotoUploadText').style.display = 'none';
      }
    } else {
      document.getElementById('promoPhotoFormTitle').textContent = 'Agregar banner foto';
    }
    document.getElementById('promoPhotoFormOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closePromoPhotoForm() { document.getElementById('promoPhotoFormOverlay').classList.remove('active'); document.body.style.overflow = ''; }

  function savePromoPhotoForm() {
    const preview = document.getElementById('promoPhotoImagePreview');
    const image = preview.style.display !== 'none' ? preview.src : '';
    if (!image) { showToast('Se requiere una imagen', 'error'); return; }
    const data = {
      title: document.getElementById('promoPhotoTitle').value.trim(),
      link: document.getElementById('promoPhotoLink').value.trim(),
      position: document.getElementById('promoPhotoPosition').value || 'after-featured',
      active: document.getElementById('promoPhotoActive').checked,
      image
    };
    const photos = getPromoPhotos();
    if (editingPromoPhotoIndex >= 0) { photos[editingPromoPhotoIndex] = data; } else { photos.push(data); }
    savePromoPhotos(photos);
    closePromoPhotoForm();
    renderPromoPhotosTable();
    showToast('Banner foto guardado', 'success');
  }

  return {
    init,
    _editBanner: openBannerForm,
    _deleteBanner: (i) => { if (confirm('¿Eliminar este banner?')) { const b = getBanners(); b.splice(i, 1); saveBanners(b); renderBannersTable(); showToast('Banner eliminado', 'info'); } },
    _editPromoPhoto: openPromoPhotoForm,
    _deletePromoPhoto: (i) => { if (confirm('¿Eliminar este banner foto?')) { const p = getPromoPhotos(); p.splice(i, 1); savePromoPhotos(p); renderPromoPhotosTable(); showToast('Banner foto eliminado', 'info'); } }
  };
})();
