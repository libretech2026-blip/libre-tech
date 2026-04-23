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



  let csvParsedData = [];

  let editingProductId = null;

  let currentColors = [];

  let currentSpecs = [];

  let currentImages = [];



  // --- Inicialización ---

  function init() {

    // Check if already authenticated via Supabase session

    checkAuth().then(ok => {

      if (ok) showDashboard();

    });

    bindEvents();

  }



  // --- Autenticación via Supabase ---

  async function checkAuth() {

    try {

      const user = await SB.getUser();

      if (!user) return false;

      return SB.isAdmin(user);

    } catch {

      return false;

    }

  }



  async function login(email, password) {

    try {

      const { data, error } = await SB.client.auth.signInWithPassword({ email, password });

      if (error) {

        const msg = error.message || '';

        if (msg === 'Invalid login credentials') {

          showToast('Correo o contraseña incorrectos', 'error');

        } else if (msg.includes('Email not confirmed')) {

          showToast('Tu correo aún no ha sido verificado. Revisa tu bandeja de entrada.', 'error');

        } else {

          showToast(msg, 'error');

        }

        return false;

      }

      const user = data.user;

      if (!SB.isAdmin(user)) {

        await SB.client.auth.signOut();

        showToast('No tienes permisos de administrador', 'error');

        return false;

      }

      showDashboard();

      return true;

    } catch (err) {

      showToast(err.message || 'Error al iniciar sesión', 'error');

      return false;

    }

  }



  async function logout() {

    try { await SB.client.auth.signOut(); } catch {}

    document.getElementById('adminDashboard').style.display = 'none';

    document.getElementById('adminLoginWrapper').style.display = 'flex';

    document.getElementById('adminPassword').value = '';

    document.getElementById('adminEmail').value = '';

  }



  async function showDashboard() {

    document.getElementById('adminLoginWrapper').style.display = 'none';

    document.getElementById('adminDashboard').style.display = 'block';

    await refreshOrders();

    updateStats();

    renderProductsTable();

    renderOrdersTable();

    renderPagesTable();

    renderVisualBannersTable();

    renderPqrsTable();

    populateCategoriesDatalist();

    initUserManagement();

    initCouponsEvents();

    initAnalyticsEvents();

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

      const products = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');

      return products.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' }));

    } catch {

      return [];

    }

  }



  function saveProducts(products) {

    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));

  }



  async function addProduct(product) {

    product.id = crypto.randomUUID();

    product.createdAt = new Date().toISOString().split('T')[0];

    // Always save locally first so data is never lost

    const products = getProducts();

    products.push(product);

    saveProducts(products);

    try {

      if (typeof SB !== 'undefined' && SB.client) { await SB.insertProduct(product); }

    } catch (e) {

      console.warn('[Admin] SB insert failed (saved locally):', e.message);

      showToast('Producto guardado localmente — error al sincronizar con Supabase', 'error');

    }

    return product;

  }



  async function updateProduct(id, updates) {

    // Update locally first

    const products = getProducts();

    const index = products.findIndex(p => p.id === id);

    if (index !== -1) { products[index] = { ...products[index], ...updates }; saveProducts(products); }

    try {

      if (typeof SB !== 'undefined' && SB.client) { await SB.updateProduct(id, updates); }

    } catch (e) {

      console.warn('[Admin] SB update failed (saved locally):', e.message);

      showToast('Cambio guardado localmente — error al sincronizar con Supabase', 'error');

    }

    return products[index] || null;

  }



  async function deleteProduct(id) {

    // Delete locally first

    let products = getProducts();

    products = products.filter(p => p.id !== id);

    saveProducts(products);

    try {

      if (typeof SB !== 'undefined' && SB.client) { await SB.deleteProduct(id); }

    } catch (e) {

      console.warn('[Admin] SB delete failed (deleted locally):', e.message);

      showToast('Eliminado localmente — error al sincronizar con Supabase', 'error');

    }

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

      const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });

      const sheetName = workbook.SheetNames[0];

      const sheet = workbook.Sheets[sheetName];

      const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });



      const products = [];

      json.forEach(row => {

        const name = cleanText(row.nombre || row.Nombre || row.name || row.Name || '');

        const price = parseInt(row.precio || row.Precio || row.price || row.Price || 0) || 0;

        const description = cleanText(row.descripcion || row.Descripcion || row.description || row.Description || '');

        const category = cleanText(row.categoria || row.Categoria || row.category || row.Category || '');

        const brand = cleanText(row.marca || row.Marca || row.brand || row.Brand || '');

        const stock = parseInt(row.stock || row.Stock || 0) || 0;

        const colorRaw = cleanText(row.color || row.Color || row.colores || row.Colores || '');

        const colors = colorRaw ? colorRaw.split(/[,;|]/).map(c => c.trim()).filter(Boolean) : [];



        // Specs: columns like spec1, spec2... or especificacion1, etc.

        const specs = [];

        for (const key of Object.keys(row)) {

          const kl = key.toLowerCase();

          if ((kl.startsWith('spec') || kl.startsWith('especificacion') || kl.startsWith('especificación')) && row[key]) {

            const val = cleanText(String(row[key]));

            if (val) {

              const parts = val.split(':');

              if (parts.length >= 2) {

                specs.push({ key: parts[0].trim(), value: parts.slice(1).join(':').trim() });

              } else {

                specs.push({ key: kl, value: val });

              }

            }

          }

        }



        if (name && price > 0) {

          products.push({ name, price, description, category, brand, stock, image: '', active: true, colors, specs });

        }

      });

      return products;

    } catch (err) {

      console.error('Error parsing Excel:', err);

      return [];

    }

  }



  // Fix encoding issues (â€", Ã­, etc.) from improperly encoded files

  function cleanText(val) {

    if (!val) return '';

    let s = String(val).trim();

    // Common mojibake replacements

    s = s.replace(/â€"/g, '—').replace(/â€œ/g, '"').replace(/â€\u009D/g, '"')

         .replace(/â€˜/g, "'").replace(/â€™/g, "'").replace(/â€¢/g, '•')

         .replace(/Ã¡/g, 'á').replace(/Ã©/g, 'é').replace(/Ã­/g, 'í')

         .replace(/Ã³/g, 'ó').replace(/Ãº/g, 'ú').replace(/Ã±/g, 'ñ')

         .replace(/Ã'/g, 'Ñ');

    return s;

  }



  function handleCSVFile(file) {

    if (!file) return;



    const reader = new FileReader();

    reader.onload = e => {

      const data = new Uint8Array(e.target.result);

      csvParsedData = parseExcel(data);



      if (csvParsedData.length === 0) {

        showToast('No se encontraron productos v\u00e1lidos en el archivo Excel', 'error');

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



  async function importCSVProducts() {

    if (csvParsedData.length === 0) return;



    const products = getProducts();

    let sbErrors = 0;



    for (const p of csvParsedData) {

      p.id = crypto.randomUUID();

      p.createdAt = new Date().toISOString().split('T')[0];

      products.push(p);

      // Try to sync each product to Supabase

      try {

        if (typeof SB !== 'undefined' && SB.client) { await SB.insertProduct(p); }

      } catch (e) { sbErrors++; console.warn('[Admin] CSV import SB insert error:', e.message); }

    }



    saveProducts(products);

    const msg = `${csvParsedData.length} productos importados exitosamente`;

    showToast(sbErrors > 0 ? msg + ` (${sbErrors} no sincronizados con Supabase)` : msg, sbErrors > 0 ? 'error' : 'success');



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

        <button type="button" class="btn-icon btn-remove-spec" data-index="${i}" aria-label="Eliminar especificaci\u00f3n">

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



    const tabMap = { products: 'tabProducts', csv: 'tabCsv', orders: 'tabOrders', pages: 'tabPages', stats: 'tabStats', visual: 'tabVisual', pqrs: 'tabPqrs', social: 'tabSocial', users: 'tabUsers', reviews: 'tabReviews', coupons: 'tabCoupons', analytics: 'tabAnalytics' };

    const tabEl = document.getElementById(tabMap[tabName]);

    if (tabEl) tabEl.style.display = 'block';



    if (tabName === 'orders') renderOrdersTable();

    if (tabName === 'pages') renderPagesTable();

    if (tabName === 'stats') renderStats();

    if (tabName === 'visual') {
      Promise.all([loadVisualBannersFromDB(), loadVisualUiFromDB()]).then(() => {
        renderVisualBannersTable();
        updatePagePreview();
        renderVisualUiForm();
      });
    }

    if (tabName === 'pqrs') renderPqrsTable();

    if (tabName === 'social') loadSocialLinks();

    if (tabName === 'users') renderUsersTable();

    if (tabName === 'reviews') renderReviewsTable();

    if (tabName === 'coupons') renderCouponsTable();

    if (tabName === 'analytics') renderAnalytics();

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



    // Sync DB

    document.getElementById('btnSyncSupabase')?.addEventListener('click', async () => {

      const btn = document.getElementById('btnSyncSupabase');

      btn.disabled = true;

      btn.textContent = 'Sincronizando...';

      try {

        const products = getProducts();

        const { successCount, failCount } = await SB.pushAllProducts(products);

        showToast(`Sync: ${successCount} ok, ${failCount} errores`, successCount > 0 ? 'success' : 'error');

      } catch (err) {

        showToast('Error sync: ' + err.message, 'error');

      } finally {

        btn.disabled = false;

        btn.textContent = 'Sync DB';

      }

    });



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



    // Visualización (banners unificados)

    initVisualBanners();
    initVisualUiEvents();



    // PQRs

    document.getElementById('pqrStatusFilter')?.addEventListener('change', () => renderPqrsTable());

    document.getElementById('pqrReplyForm')?.addEventListener('submit', e => { e.preventDefault(); savePqrReply(); });

    document.getElementById('btnClosePqrDetail')?.addEventListener('click', closePqrDetail);

    document.getElementById('pqrDetailOverlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closePqrDetail(); });



    // Social links

    document.getElementById('socialLinksForm')?.addEventListener('submit', e => { e.preventDefault(); saveSocialLinks(); });





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

      const remove = () => { if (toast.parentNode) toast.remove(); };

      toast.addEventListener('animationend', remove);

      setTimeout(remove, 500); // Fallback if animationend doesn't fire

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

        ${order.phone ? `<strong>Tel\u00e9fono:</strong> ${escapeHTML(order.phone)}<br>` : ''}

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
    'sobre-nosotros': { title: 'Sobre Nosotros', content: '<h1>Sobre Nosotros</h1><p>Somos <strong>LIBRE TECH</strong>, una tienda colombiana de tecnología fundada con el propósito de hacer accesible la tecnología de calidad a todos. Desde nuestra sede en <strong>Barranquilla, Colombia</strong>, trabajamos cada día para traerte los mejores productos al mejor precio.</p><h2>Nuestra Misión</h2><p>Democratizar el acceso a la tecnología en Colombia, ofreciendo productos originales de alta calidad con atención personalizada y envíos a todo el país.</p><h2>Nuestra Visión</h2><p>Ser la tienda de tecnología en línea preferida de los colombianos, reconocida por la confianza, calidad y experiencia excepcional.</p><h2>Nuestros Valores</h2><ul><li><strong>Confianza:</strong> Todos nuestros productos son originales y cuentan con garantía.</li><li><strong>Calidad:</strong> Seleccionamos cuidadosamente cada artículo de nuestro catálogo.</li><li><strong>Servicio:</strong> Atención personalizada por WhatsApp con respuesta rápida.</li><li><strong>Accesibilidad:</strong> Precios justos y envíos a todo el territorio colombiano.</li></ul><h2>Nuestra Ubicación</h2><p>Nos encontramos en <strong>Barranquilla, Atlántico, Colombia</strong>.</p><div style="margin-top:1rem;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.15)"><iframe src="https://www.openstreetmap.org/export/embed.html?bbox=-75.06%2C10.91%2C-74.95%2C11.02&amp;layer=mapnik&amp;marker=10.9639,-74.7964" width="100%" height="350" style="border:0;display:block" loading="lazy" title="Barranquilla, Colombia"></iframe></div>' },
    'preguntas-frecuentes': { title: 'Preguntas Frecuentes', content: '<h1>Preguntas Frecuentes</h1><p>Aquí encontrarás respuestas a las preguntas más comunes.</p><div class="faq-item"><p class="faq-question">¿Cómo realizo un pedido?</p><p>Agrega los productos a tu carrito y finaliza el pedido por WhatsApp. Nuestro equipo te confirmará disponibilidad y pago.</p></div><div class="faq-item"><p class="faq-question">¿Qué métodos de pago aceptan?</p><p>Transferencias bancarias (Bancolombia, Nequi, Daviplata), PSE y pago contra entrega en Barranquilla.</p></div><div class="faq-item"><p class="faq-question">¿Cuánto tarda el envío?</p><p><strong>Barranquilla:</strong> 1-2 días hábiles. <strong>Ciudades principales:</strong> 2-4 días. <strong>Otras ciudades:</strong> 3-7 días.</p></div><div class="faq-item"><p class="faq-question">¿Los productos son originales?</p><p>Sí, todos son 100% originales y nuevos con garantía de fabricante.</p></div><div class="faq-item"><p class="faq-question">¿Tienen garantía?</p><p>Sí, todos los productos cuentan con garantía. Contáctanos por WhatsApp para reclamaciones.</p></div><div class="faq-item"><p class="faq-question">¿Puedo devolver un producto?</p><p>Tienes 5 días hábiles desde la recepción. El producto debe estar sin uso y en empaque original.</p></div><div class="faq-item"><p class="faq-question">¿Hacen envíos a todo Colombia?</p><p>¡Sí! Enviamos a todo el territorio colombiano con rastreo incluido.</p></div><p style="margin-top:1.5rem">¿No encontraste tu pregunta? <a href="https://wa.me/573116488816" target="_blank">Escríbenos por WhatsApp</a>.</p>' },
    'contactanos': { title: 'Contáctanos', content: '<h1>Contáctanos</h1><p>¿Tienes alguna pregunta o necesitas ayuda? ¡Estamos aquí para ti!</p><div class="contact-grid"><div class="contact-card"><strong>💬 WhatsApp</strong><p><a href="https://wa.me/573116488816" target="_blank">+57 300 560 6287</a></p></div><div class="contact-card"><strong>📧 Correo</strong><p><a href="mailto:libretech2026@gmail.com">libretech2026@gmail.com</a></p></div><div class="contact-card"><strong>🕐 Horario</strong><p>Lun-Vie: 8AM-6PM<br>Sáb: 9AM-1PM</p></div><div class="contact-card"><strong>📍 Ubicación</strong><p>Barranquilla, Colombia</p></div></div><h2>Escríbenos</h2><p><a href="https://wa.me/573116488816" target="_blank" style="display:inline-block;background:#25D366;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">💬 Chatear por WhatsApp</a></p>' },
    'seguimiento-pedido': { title: 'Seguimiento de Pedido', content: '<h1>Seguimiento de su Pedido</h1><p>Mantente informado sobre el estado de tu compra.</p><h2>¿Cómo rastreo mi pedido?</h2><ol><li>Cuando tu pedido sea despachado, recibirás por WhatsApp el <strong>número de guía</strong>.</li><li>Ingresa a la página de la transportadora para ver el estado en tiempo real.</li><li>Si tienes dudas, contáctanos por WhatsApp.</li></ol><h2>Estados del pedido</h2><table><thead><tr><th>Estado</th><th>Descripción</th></tr></thead><tbody><tr><td><strong>Confirmado</strong></td><td>Pedido recibido y pago verificado.</td></tr><tr><td><strong>En preparación</strong></td><td>Alistando tu paquete.</td></tr><tr><td><strong>Enviado</strong></td><td>En camino, recibirás guía.</td></tr><tr><td><strong>Entregado</strong></td><td>¡Entregado exitosamente!</td></tr></tbody></table><h2>Tiempos estimados</h2><table><thead><tr><th>Destino</th><th>Tiempo</th></tr></thead><tbody><tr><td>Barranquilla</td><td>1-2 días</td></tr><tr><td>Ciudades principales</td><td>2-4 días</td></tr><tr><td>Otras ciudades</td><td>3-7 días</td></tr></tbody></table><div class="info-card"><h4>¿Necesitas ayuda?</h4><p><a href="https://wa.me/573116488816" target="_blank" style="display:inline-block;background:#25D366;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">💬 Consultar mi pedido</a></p></div>' },
    'politica-privacidad': { title: 'Política de Privacidad', content: '<h1>Política de Privacidad</h1><p><strong>Última actualización:</strong> Enero 2026</p><p>En <strong>LIBRE TECH</strong> nos tomamos muy en serio la protección de tus datos personales.</p><h2>1. Información que Recopilamos</h2><ul><li><strong>Datos de contacto:</strong> Nombre, teléfono, correo electrónico.</li><li><strong>Datos de envío:</strong> Dirección completa, ciudad, departamento.</li><li><strong>Datos de la compra:</strong> Productos, cantidades, montos.</li></ul><h2>2. Uso de la Información</h2><ul><li>Procesar y gestionar tus pedidos.</li><li>Comunicarnos sobre el estado de tu pedido.</li><li>Brindarte soporte al cliente.</li><li>Mejorar nuestros productos y servicios.</li></ul><h2>3. Protección de Datos</h2><p>Implementamos medidas de seguridad para proteger tu información contra acceso no autorizado.</p><h2>4. No Compartimos tu Información</h2><p><strong>No vendemos ni compartimos tu información personal</strong>, excepto con transportadoras para el envío o cuando lo requiera la ley.</p><h2>5. Tus Derechos</h2><p>Según la Ley 1581 de 2012, puedes conocer, actualizar, rectificar y solicitar eliminación de tus datos.</p><h2>6. Contacto</h2><p>WhatsApp: <a href="https://wa.me/573116488816" target="_blank">+57 300 560 6287</a> | Correo: <a href="mailto:libretech2026@gmail.com">libretech2026@gmail.com</a></p>' },
    'terminos-condiciones': { title: 'Términos y Condiciones', content: '<h1>Términos y Condiciones</h1><p><strong>Última actualización:</strong> Enero 2026</p><h2>1. Productos y Precios</h2><ul><li>Precios en <strong>pesos colombianos (COP)</strong> con IVA incluido.</li><li>Precios y disponibilidad pueden cambiar sin previo aviso.</li><li>Las imágenes son de referencia.</li></ul><h2>2. Proceso de Compra</h2><ol><li>Selecciona productos y agrégalos al carrito.</li><li>Completa el pedido por WhatsApp.</li><li>Confirmaremos disponibilidad y monto total.</li><li>Realiza el pago acordado.</li><li>Tu pedido será procesado y enviado.</li></ol><h2>3. Envíos</h2><ul><li>Envíos a todo Colombia.</li><li>Tiempos estimados, pueden variar.</li><li>Verifica tu paquete al recibirlo.</li></ul><h2>4. Métodos de Pago</h2><ul><li>Transferencia bancaria (Bancolombia, Nequi, Daviplata)</li><li>PSE</li><li>Contra entrega (solo Barranquilla)</li></ul><h2>5. Devoluciones</h2><p>Consulta nuestra <a href="pagina.html?page=devoluciones-garantias">Política de Devoluciones y Garantías</a>.</p><h2>6. Legislación</h2><p>Se rigen por las leyes de Colombia. Controversias resueltas en tribunales de Barranquilla.</p>' },
    'devoluciones-garantias': { title: 'Devoluciones y Garantías', content: '<h1>Devoluciones y Garantías</h1><p><strong>Última actualización:</strong> Enero 2026</p><h2>Devoluciones</h2><p>Plazo: <strong>5 días hábiles</strong> desde la recepción.</p><h3>Condiciones</h3><ul><li>Producto <strong>sin uso</strong> y en perfecto estado.</li><li><strong>Empaque original</strong> con todos los accesorios.</li><li>Comprobante de compra.</li></ul><h3>No aplica devolución</h3><ul><li>Productos con signos de uso o daños.</li><li>Sin empaque original.</li><li>Consumibles con sello abierto.</li></ul><h3>Proceso</h3><ol><li>Contáctanos por <a href="https://wa.me/573116488816" target="_blank">WhatsApp</a>.</li><li>Evaluaremos tu solicitud.</li><li>Envía el producto en empaque original.</li><li>Reembolso en 3-5 días hábiles.</li></ol><h2>Garantía</h2><table><thead><tr><th>Categoría</th><th>Garantía</th></tr></thead><tbody><tr><td>Audífonos y parlantes</td><td>3-6 meses</td></tr><tr><td>Smartwatches / Wearables</td><td>6 meses</td></tr><tr><td>Power Banks / Cargadores</td><td>6 meses</td></tr><tr><td>Cables y accesorios</td><td>3 meses</td></tr></tbody></table><h3>Cubre</h3><ul><li>Defectos de fabricación.</li><li>Mal funcionamiento bajo uso normal.</li></ul><h3>No cubre</h3><ul><li>Daños por mal uso, caídas o líquidos.</li><li>Desgaste natural.</li><li>Modificaciones por terceros.</li></ul><div class="info-card"><h4>¿Necesitas soporte?</h4><p><a href="https://wa.me/573116488816" target="_blank" style="display:inline-block;background:#25D366;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">💬 Contactar soporte</a></p></div>' }
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

              <a href="pagina.html?page=${encodeURIComponent(slug)}" target="_blank" class="table-btn" title="Ver p\u00e1gina">

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

      showToast('El t\u00edtulo es requerido', 'error');

      return;

    }



    const pages = getPages();

    pages[slug] = { title, content };

    savePages(pages);



    closePageForm();

    renderPagesTable();

    showToast('P\u00e1gina actualizada', 'success');

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

    const allOrders = getOrders();

    const products = getProducts();

    const views = getViews();

    // Exclude cancelled orders from statistics
    const orders = allOrders.filter(o => (o.status || 'pending') !== 'cancelled');

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

      if (viewEntries.length === 0) { mvEl.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">Sin datos a\u00fan</p>'; }

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

      if (topSelling.length === 0) { tsEl.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">Sin datos a\u00fan</p>'; }

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

      if (catEntries.length === 0) { scEl.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">Sin datos a\u00fan</p>'; }

      else { scEl.innerHTML = catEntries.map(([cat, total]) =>

        `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border-light);font-size:0.85rem;"><span>${escapeHTML(cat)}</span><strong>${formatPrice(total)}</strong></div>`

      ).join(''); }

    }

  }



  function getViews() {

    try { return JSON.parse(localStorage.getItem(VIEWS_KEY) || '{}'); } catch { return {}; }

  }



  // ===== VISUALIZACIÓN (unified banners) =====

  const VB_KEY = 'libretech_visual_banners';
  const VUI_KEY = 'libretech_visual_ui';
  let _vbInMemory = null; // In-memory cache to avoid localStorage quota issues with base64 images
  let _visualUiInMemory = null;

  function getVisualBanners() {
    if (_vbInMemory) return _vbInMemory;
    try { return JSON.parse(localStorage.getItem(VB_KEY) || '[]'); } catch { return []; }
  }

  async function saveVisualBanners(arr) {
    _vbInMemory = arr;
    try { localStorage.setItem(VB_KEY, JSON.stringify(arr)); } catch (e) { /* quota ok — Supabase is source of truth */ }
    // Persist to Supabase (source of truth) — await to prevent race conditions
    if (typeof SB !== 'undefined' && SB.setSiteConfig) {
      try {
        await SB.setSiteConfig('visual_banners', arr);
      } catch(e) {
        console.warn('[Admin] SB banner save:', e);
        showToast('Error guardando banner en la nube', 'error');
      }
    }
  }

  // Load banners from Supabase on init
  async function loadVisualBannersFromDB() {
    if (typeof SB === 'undefined' || !SB.getSiteConfig) return;
    try {
      const data = await SB.getSiteConfig('visual_banners');
      if (data && Array.isArray(data)) {
        _vbInMemory = data;
        try { localStorage.setItem(VB_KEY, JSON.stringify(data)); } catch (e) { /* quota ok */ }
        syncToLegacyBanners(data);
      }
    } catch (e) { console.warn('[Admin] Load banners from DB:', e); }
  }

  function getVisualUiConfig() {
    if (_visualUiInMemory && typeof _visualUiInMemory === 'object') return _visualUiInMemory;
    try {
      const parsed = JSON.parse(localStorage.getItem(VUI_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  async function loadVisualUiFromDB() {
    if (typeof SB === 'undefined' || !SB.getSiteConfig) return;
    try {
      const data = await SB.getSiteConfig('visual_ui');
      if (data && typeof data === 'object') {
        _visualUiInMemory = data;
        try { localStorage.setItem(VUI_KEY, JSON.stringify(data)); } catch (e) { /* quota ok */ }
      }
    } catch (e) {
      console.warn('[Admin] Load visual_ui from DB:', e);
    }
  }

  async function saveVisualUiConfig(config) {
    _visualUiInMemory = config;
    try { localStorage.setItem(VUI_KEY, JSON.stringify(config)); } catch (e) { /* quota ok */ }
    if (typeof SB !== 'undefined' && SB.setSiteConfig) {
      await SB.setSiteConfig('visual_ui', config);
    }
  }

  function normalizeCategoryKey(name) {
    return String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function getStoreCategoriesWithAll() {
    const products = getProducts();
    const dynamic = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    return ['Todos', ...dynamic];
  }

  function renderCategoryBubblePreviewImage(image, label) {
    if (image) {
      return `<img src="${escapeAttr(image)}" alt="${escapeAttr(label)}" style="width:58px;height:58px;border-radius:50%;object-fit:cover;border:2px solid var(--border-light)">`;
    }
    return `<div style="width:58px;height:58px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(26,75,140,0.16),rgba(232,119,34,0.18));font-weight:800;color:var(--primary-blue-dark)">${escapeHTML(label.charAt(0).toUpperCase())}</div>`;
  }

  function renderVisualUiForm() {
    const colorInput = document.getElementById('visualHeaderColor');
    const colorText = document.getElementById('visualHeaderColorText');
    const list = document.getElementById('visualCategoryBubblesList');
    if (!colorInput || !colorText || !list) return;

    const cfg = getVisualUiConfig();
    const safeColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test((cfg.headerInnerColor || '').trim()) ? cfg.headerInnerColor.trim() : '#e87722';
    const images = cfg.categoryBubbleImages && typeof cfg.categoryBubbleImages === 'object' ? cfg.categoryBubbleImages : {};

    colorInput.value = safeColor;
    colorText.value = safeColor;

    const categories = getStoreCategoriesWithAll();
    list.innerHTML = categories.map(cat => {
      const key = normalizeCategoryKey(cat === 'Todos' ? 'all' : cat);
      const saved = images[key] || '';
      return `
        <div class="admin-panel" style="padding:var(--spacing-md)">
          <div style="display:flex;align-items:center;gap:var(--spacing-sm);margin-bottom:var(--spacing-sm)">
            ${renderCategoryBubblePreviewImage(saved, cat)}
            <div>
              <div style="font-weight:700;font-size:0.88rem">${escapeHTML(cat)}</div>
              <div style="font-size:0.75rem;color:var(--text-tertiary)">Clave: ${escapeHTML(key)}</div>
            </div>
          </div>
          <div style="display:flex;gap:var(--spacing-sm)">
            <input type="file" accept="image/*" class="form-input vui-cat-file" data-cat-key="${escapeAttr(key)}" style="font-size:0.78rem;padding:8px">
            <button type="button" class="btn btn-secondary vui-cat-clear" data-cat-key="${escapeAttr(key)}">Quitar</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function collectVisualUiConfigFromForm() {
    const colorInput = document.getElementById('visualHeaderColor');
    const colorText = document.getElementById('visualHeaderColorText');
    const base = getVisualUiConfig();
    const colorRaw = (colorText?.value || colorInput?.value || '').trim();
    const safeColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(colorRaw) ? colorRaw : '#e87722';
    return {
      ...base,
      headerInnerColor: safeColor,
      categoryBubbleImages: { ...(base.categoryBubbleImages || {}) }
    };
  }

  function initVisualUiEvents() {
    const colorInput = document.getElementById('visualHeaderColor');
    const colorText = document.getElementById('visualHeaderColorText');
    const form = document.getElementById('visualUiForm');
    const list = document.getElementById('visualCategoryBubblesList');

    colorInput?.addEventListener('input', () => {
      if (colorText) colorText.value = colorInput.value;
    });

    colorText?.addEventListener('input', () => {
      const val = colorText.value.trim();
      if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(val) && colorInput) {
        colorInput.value = val;
      }
    });

    list?.addEventListener('change', async e => {
      const input = e.target.closest('.vui-cat-file');
      if (!input || !input.files || !input.files[0]) return;
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showToast('Imagen máx. 5MB', 'error');
        input.value = '';
        return;
      }
      const key = input.dataset.catKey;
      try {
        showToast('Subiendo imagen de categoría...', 'info');
        const publicUrl = await SB.uploadImage(file, `bubbles/${key}`);
        const cfg = collectVisualUiConfigFromForm();
        cfg.categoryBubbleImages[key] = publicUrl;
        _visualUiInMemory = cfg;
        try { localStorage.setItem(VUI_KEY, JSON.stringify(cfg)); } catch (_) { /* ok */ }
        renderVisualUiForm();
        showToast('Imagen de categoría subida', 'success');
      } catch (err) {
        console.error('[Admin] Bubble upload error:', err);
        showToast('Error al subir: ' + (err.message || err), 'error');
        input.value = '';
      }
    });

    list?.addEventListener('click', e => {
      const btn = e.target.closest('.vui-cat-clear');
      if (!btn) return;
      const key = btn.dataset.catKey;
      const cfg = collectVisualUiConfigFromForm();
      if (cfg.categoryBubbleImages[key]) delete cfg.categoryBubbleImages[key];
      _visualUiInMemory = cfg;
      try { localStorage.setItem(VUI_KEY, JSON.stringify(cfg)); } catch (e) { /* quota ok */ }
      renderVisualUiForm();
    });

    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const cfg = collectVisualUiConfigFromForm();
      try {
        await saveVisualUiConfig(cfg);
        // Aplicar cambios inmediatamente
        const safeColor = cfg.headerInnerColor || '#e87722';
        document.documentElement.style.setProperty('--header-inner-bg', safeColor);
        showToast('Personalización visual guardada', 'success');
      } catch (err) {
        showToast('Error guardando visual: ' + (err.message || err), 'error');
      }
    });
  }

  function getBanners() { try { return JSON.parse(localStorage.getItem(BANNERS_KEY) || '[]'); } catch { return []; } }

  function saveBanners(banners) { try { localStorage.setItem(BANNERS_KEY, JSON.stringify(banners)); } catch (e) { console.warn('[Admin] localStorage quota (banners):', e.message); } }



  const POSITION_LABELS = {

    'hero-carousel': 'Hero Carrusel',

    'side-left': 'Lateral Izquierdo',

    'after-featured': 'Completo — Después de Destacados',

    'side-right': 'Lateral Derecho',

    'after-categories': 'Completo — Después de Categorías',

    'before-footer': 'Completo — Antes del Footer'

  };



  function renderVisualBannersTable() {

    const tbody = document.getElementById('visualBannersTableBody');

    if (!tbody) return;

    const banners = getVisualBanners();

    if (banners.length === 0) {

      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-tertiary)">No hay banners configurados.</td></tr>';

      updatePagePreview(); return;

    }

    const products = getProducts();

    tbody.innerHTML = banners.map((b, i) => {

      const prod = b.productId ? products.find(p => p.id === b.productId) : null;
      const linkLabel = prod ? escapeHTML(prod.name) : (b.linkSection ? b.linkSection : (b.linkUrl ? 'URL' : '—'));

      return `<tr draggable="true" data-vb-index="${i}">

        <td style="cursor:grab;text-align:center;width:40px;">
          <div style="display:flex;flex-direction:column;gap:2px;align-items:center;">
            <button class="table-btn" onclick="Admin._moveVB(${i},-1)" title="Subir" style="width:24px;height:24px;" ${i === 0 ? 'disabled' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            <button class="table-btn" onclick="Admin._moveVB(${i},1)" title="Bajar" style="width:24px;height:24px;" ${i === banners.length - 1 ? 'disabled' : ''}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
        </td>

        <td><div style="width:80px;height:40px;border-radius:4px;overflow:hidden;background:var(--bg-secondary)">${b.image ? `<img src="${escapeAttr(b.image)}" style="width:100%;height:100%;object-fit:cover">` : '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:0.65rem;color:var(--text-tertiary)">—</div>'}</div></td>

        <td><strong>${escapeHTML(b.name || 'Sin nombre')}</strong>${b.subtitle ? `<div style="font-size:0.75rem;color:var(--text-tertiary)">${escapeHTML(b.subtitle)}</div>` : ''}</td>

        <td style="font-size:0.8rem">${POSITION_LABELS[b.position] || b.position}</td>

        <td style="font-size:0.8rem">${linkLabel}</td>

        <td><span class="table-status ${b.active ? 'active' : 'inactive'}"><span class="table-status-dot"></span>${b.active ? 'Activo' : 'Inactivo'}</span></td>

        <td><div class="table-actions">

          <button class="table-btn" onclick="Admin._editVB(${i})" title="Editar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>

          <button class="table-btn delete" onclick="Admin._deleteVB(${i})" title="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>

        </div></td>

      </tr>`;

    }).join('');

    // Drag and drop reorder
    initBannerDragDrop(tbody);

    updatePagePreview();

  }

  function initBannerDragDrop(tbody) {
    let dragSrcIndex = null;
    tbody.querySelectorAll('tr[draggable]').forEach(row => {
      row.addEventListener('dragstart', e => {
        dragSrcIndex = parseInt(row.dataset.vbIndex);
        e.dataTransfer.effectAllowed = 'move';
        row.style.opacity = '0.4';
      });
      row.addEventListener('dragend', () => { row.style.opacity = '1'; });
      row.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        row.style.borderTop = '2px solid var(--primary-blue)';
      });
      row.addEventListener('dragleave', () => { row.style.borderTop = ''; });
      row.addEventListener('drop', e => {
        e.preventDefault();
        row.style.borderTop = '';
        const dropIndex = parseInt(row.dataset.vbIndex);
        if (dragSrcIndex === null || dragSrcIndex === dropIndex) return;
        const banners = getVisualBanners();
        const [moved] = banners.splice(dragSrcIndex, 1);
        banners.splice(dropIndex, 0, moved);
        saveVisualBanners(banners);
        syncToLegacyBanners(banners);
        renderVisualBannersTable();
        showToast('Banner reordenado', 'info');
      });
    });
  }



  function updatePagePreview() {

    const banners = getVisualBanners();

    const slots = ['hero-carousel','side-left','after-featured','side-right','after-categories','before-footer'];

    slots.forEach(slot => {

      const slotBanners = banners.filter(b => b.position === slot && b.active);

      const camelId = 'pvStatus' + slot.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');

      const statusEl = document.getElementById(camelId);

      const slotEl = document.querySelector(`.pv-banner-slot[data-slot="${slot}"]`);

      if (!statusEl || !slotEl) return;

      if (slotBanners.length > 0) {

        statusEl.textContent = `${slotBanners.length} banner${slotBanners.length > 1 ? 's' : ''}`;

        if (slotBanners[0].image) { slotEl.style.backgroundImage = `url(${slotBanners[0].image})`; slotEl.classList.add('pv-has-image'); }

        else { slotEl.style.backgroundImage = ''; slotEl.classList.remove('pv-has-image'); }

      } else {

        statusEl.textContent = slot.startsWith('side') ? 'Auto' : 'Vacío';

        slotEl.style.backgroundImage = ''; slotEl.classList.remove('pv-has-image');

      }

    });

  }



  let editingVBIndex = -1;

  let vbCurrentImage = '';



  function populateVBProductSelect() {

    const select = document.getElementById('vbProduct');

    if (!select) return;

    const products = getProducts();

    select.innerHTML = '<option value="">— Ninguno —</option>' + products.map(p => `<option value="${escapeAttr(p.id)}">${escapeHTML(p.name)} ($${(p.price||0).toLocaleString('es-CO')})</option>`).join('');

  }



  function toggleBannerFormFields() {
    const pos = document.getElementById('vbPosition').value;
    const linkType = document.getElementById('vbLinkType').value;
    const isHero = pos === 'hero-carousel';
    const isSide = pos === 'side-left' || pos === 'side-right';

    // Hero: hide subtitle, link type, height — only image + name/dates/active
    document.getElementById('vbSubtitleGroup').style.display = isHero ? 'none' : '';
    document.getElementById('vbHeightGroup').style.display = isSide ? '' : 'none';
    document.getElementById('vbLinkTypeGroup').style.display = isHero ? 'none' : '';
    document.getElementById('vbHeroHint').style.display = isHero ? 'block' : 'none';

    // Link type sub-fields (only for non-hero)
    document.getElementById('vbProductGroup').style.display = (!isHero && linkType === 'product') ? '' : 'none';
    document.getElementById('vbSectionGroup').style.display = (!isHero && linkType === 'section') ? '' : 'none';
    document.getElementById('vbUrlGroup').style.display = (!isHero && linkType === 'url') ? '' : 'none';
  }

  function openVisualBannerForm(indexOrSlot) {

    editingVBIndex = typeof indexOrSlot === 'number' ? indexOrSlot : -1;

    const form = document.getElementById('visualBannerForm');

    form.reset(); vbCurrentImage = '';

    document.getElementById('vbImagePreview').style.display = 'none';

    document.getElementById('vbUploadText').style.display = 'block';

    populateVBProductSelect();

    // Reset link type
    document.getElementById('vbLinkType').value = 'none';

    if (editingVBIndex >= 0) {

      const b = getVisualBanners()[editingVBIndex];

      if (!b) return;

      document.getElementById('visualBannerTitle').textContent = 'Editar Banner';

      document.getElementById('vbName').value = b.name || '';

      document.getElementById('vbPosition').value = b.position || 'after-featured';

      document.getElementById('vbSubtitle').value = b.subtitle || '';

      document.getElementById('vbStartDate').value = b.startDate || '';

      document.getElementById('vbEndDate').value = b.endDate || '';

      if (document.getElementById('vbHeight')) document.getElementById('vbHeight').value = b.height || '';

      document.getElementById('vbActive').checked = b.active !== false;

      // Restore link type
      if (b.productId) {
        document.getElementById('vbLinkType').value = 'product';
        document.getElementById('vbProduct').value = b.productId;
      } else if (b.linkSection) {
        document.getElementById('vbLinkType').value = 'section';
        document.getElementById('vbSection').value = b.linkSection;
      } else if (b.linkUrl) {
        document.getElementById('vbLinkType').value = 'url';
        document.getElementById('vbUrl').value = b.linkUrl;
      }

      vbCurrentImage = b.image || '';

      if (b.image) { document.getElementById('vbImagePreview').src = b.image; document.getElementById('vbImagePreview').style.display = 'block'; document.getElementById('vbUploadText').style.display = 'none'; }

    } else {

      document.getElementById('visualBannerTitle').textContent = 'Agregar Banner';

      if (typeof indexOrSlot === 'string') document.getElementById('vbPosition').value = indexOrSlot;

    }

    toggleBannerFormFields();

    document.getElementById('visualBannerOverlay').classList.add('active');

    document.body.style.overflow = 'hidden';

  }



  function closeVisualBannerForm() { document.getElementById('visualBannerOverlay').classList.remove('active'); document.body.style.overflow = ''; }



  async function saveVisualBannerForm() {

    const name = document.getElementById('vbName').value.trim();

    if (!name) { showToast('Nombre requerido', 'error'); return; }

    const preview = document.getElementById('vbImagePreview');

    const image = preview.style.display !== 'none' ? preview.src : vbCurrentImage;

    const position = document.getElementById('vbPosition').value;
    const linkType = document.getElementById('vbLinkType').value;
    const isHero = position === 'hero-carousel';

    // Determine link fields based on link type
    let productId = '', linkSection = '', linkUrl = '';
    if (!isHero) {
      if (linkType === 'product') productId = document.getElementById('vbProduct').value || '';
      else if (linkType === 'section') linkSection = document.getElementById('vbSection').value || '';
      else if (linkType === 'url') linkUrl = document.getElementById('vbUrl').value.trim() || '';
    }

    const data = {
      name, position,
      productId, linkSection, linkUrl,
      subtitle: isHero ? '' : document.getElementById('vbSubtitle').value.trim(),
      startDate: document.getElementById('vbStartDate').value,
      endDate: document.getElementById('vbEndDate').value,
      height: document.getElementById('vbHeight') ? document.getElementById('vbHeight').value : '',
      active: document.getElementById('vbActive').checked, image
    };

    const banners = getVisualBanners();

    if (editingVBIndex >= 0) { banners[editingVBIndex] = data; } else { banners.push(data); }

    await saveVisualBanners(banners);

    syncToLegacyBanners(banners);

    closeVisualBannerForm(); renderVisualBannersTable(); updatePagePreview();

    showToast('Banner guardado', 'success');

  }



  function syncToLegacyBanners(allBanners) {
    // No longer write large base64 images to localStorage — app.js loads directly from Supabase.
    // Only write minimal metadata (without images) for backward compatibility / admin preview.
    try {
      const heroBanners = allBanners.filter(b => b.position === 'hero-carousel').map(b => ({ title: b.name, subtitle: b.subtitle, startDate: b.startDate, endDate: b.endDate, active: b.active }));
      saveBanners(heroBanners);
    } catch (e) { /* ok */ }
  }



  function initVisualBanners() {

    document.querySelectorAll('.pv-banner-slot').forEach(slot => {

      slot.addEventListener('click', () => {

        const pos = slot.dataset.slot;

        const banners = getVisualBanners().filter(b => b.position === pos);

        if (banners.length === 1) openVisualBannerForm(getVisualBanners().indexOf(banners[0]));

        else if (banners.length > 1) openVisualBannerForm(getVisualBanners().indexOf(banners[0]));

        else openVisualBannerForm(pos);

      });

    });

    const addBtn = document.getElementById('btnAddVisualBanner');
    if (addBtn) addBtn.addEventListener('click', () => openVisualBannerForm(-1));

    const addBtnTop = document.getElementById('btnAddVisualBannerTop');
    if (addBtnTop) addBtnTop.addEventListener('click', () => openVisualBannerForm(-1));

    const closeBtn = document.getElementById('btnCloseVisualBanner');

    if (closeBtn) closeBtn.addEventListener('click', closeVisualBannerForm);

    const cancelBtn = document.getElementById('btnCancelVisualBanner');

    if (cancelBtn) cancelBtn.addEventListener('click', closeVisualBannerForm);

    const form = document.getElementById('visualBannerForm');

    if (form) form.addEventListener('submit', e => { e.preventDefault(); saveVisualBannerForm(); });

    // Toggle fields based on position and link type
    document.getElementById('vbPosition')?.addEventListener('change', toggleBannerFormFields);
    document.getElementById('vbLinkType')?.addEventListener('change', toggleBannerFormFields);

    const imageArea = document.getElementById('vbImageArea');

    const imageInput = document.getElementById('vbImageInput');

    if (imageArea && imageInput) {

      imageArea.addEventListener('click', () => imageInput.click());

       imageInput.addEventListener('change', async () => {
        const file = imageInput.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Imagen máx. 5MB', 'error'); return; }

        const preview = document.getElementById('vbImagePreview');
        const uploadText = document.getElementById('vbUploadText');

        // Mostrar preview local mientras se sube
        const localReader = new FileReader();
        localReader.onload = e => {
          preview.src = e.target.result;
          preview.style.display = 'block';
          uploadText.style.display = 'none';
        };
        localReader.readAsDataURL(file);

        // Subir a Supabase Storage y guardar solo la URL pública
        try {
          showToast('Subiendo imagen...', 'info');
          const publicUrl = await SB.uploadImage(file, 'banners');
          vbCurrentImage = publicUrl;
          preview.src = publicUrl;
          showToast('Imagen subida', 'success');
        } catch (err) {
          console.error('[Admin] Banner upload error:', err);
          showToast('Error al subir imagen: ' + (err.message || err), 'error');
          preview.style.display = 'none';
          uploadText.style.display = 'block';
          vbCurrentImage = '';
          imageInput.value = '';
        }
      });

    }

    migrateOldBanners();

    renderVisualBannersTable();

  }



  function migrateOldBanners() {

    if (getVisualBanners().length > 0) return;

    const merged = [];

    getBanners().forEach(b => { merged.push({ name: b.title || 'Banner Hero', position: 'hero-carousel', subtitle: b.subtitle || '', image: b.image || '', startDate: b.startDate || '', endDate: b.endDate || '', active: b.active !== false, productId: '' }); });

    let oldPhotos = []; try { oldPhotos = JSON.parse(localStorage.getItem('libretech_promo_photos') || '[]'); } catch {}

    oldPhotos.forEach(p => { merged.push({ name: p.title || 'Banner Foto', position: p.position || 'after-featured', image: p.image || '', active: p.active !== false, productId: '', subtitle: '' }); });

    if (merged.length > 0) saveVisualBanners(merged);

  }





  // ===== USUARIOS =====

  const USERS_LS_KEY = 'libretech_users';



  function getLocalUsers() {

    try { return JSON.parse(localStorage.getItem(USERS_LS_KEY) || '[]'); } catch { return []; }

  }

  function saveLocalUsers(users) { localStorage.setItem(USERS_LS_KEY, JSON.stringify(users)); }



  async function renderUsersTable() {

    const tbody = document.getElementById('usersTableBody');

    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-secondary);">Cargando...</td></tr>';



    let users = [];

    try {

      users = await SB.listUsers();

    } catch (e) {

      console.warn('[Admin] listUsers error:', e.message);

    }



    const localUsers = getLocalUsers();

    const emailSet = new Set(users.map(u => (u.email || '').toLowerCase()));

    localUsers.forEach(lu => {

      if (!emailSet.has((lu.email || '').toLowerCase())) users.push(lu);

    });



    // Update user count badge

    const countEl = document.getElementById('usersCount');

    if (countEl) countEl.textContent = users.length;



    if (users.length === 0) {

      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-secondary);">No hay usuarios registrados.</td></tr>';

      return;

    }



    const adminEmails = ['admin@libretechtienda.com', 'libretech2026@gmail.com'];



    tbody.innerHTML = users.map(u => {

      const email = escapeHTML(u.email || 'Sin email');

      const name = escapeHTML(u.full_name || (u.user_metadata ? u.user_metadata.full_name : '') || u.name || '');

      const created = u.created_at ? new Date(u.created_at).toLocaleDateString('es-CO') : '';

      const lastSignIn = u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('es-CO') : 'Nunca';

      const uid = escapeAttr(u.id || u.email || '');

      const isAdm = adminEmails.includes((u.email || '').toLowerCase());

      const roleBadge = isAdm

        ? '<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:linear-gradient(135deg,var(--primary-orange),var(--primary-orange-dark,#c75f1a));color:#fff;font-size:0.7rem;font-weight:700;">Admin</span>'

        : '<span style="display:inline-block;padding:2px 8px;border-radius:12px;background:var(--bg-secondary);color:var(--text-secondary);font-size:0.7rem;font-weight:600;">Cliente</span>';



      return '<tr>' +

        '<td>' +

          '<div style="display:flex;flex-direction:column;gap:2px;">' +

            '<span style="font-weight:600;">' + email + '</span>' +

            roleBadge +

          '</div>' +

        '</td>' +

        '<td>' + (name || '\u2014') + '</td>' +

        '<td>' + (created || '\u2014') + '</td>' +

        '<td>' + lastSignIn + '</td>' +

        '<td>' +

          '<div style="display:flex;gap:4px;flex-wrap:wrap;">' +

            '<button class="table-btn" onclick="Admin._changeUserPw(\'' + uid + '\',\'' + escapeAttr(u.email || '') + '\')" title="Cambiar contrase\u00f1a">' +

              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' +

            '</button>' +

            (isAdm ? '' :

            '<button class="table-btn delete" onclick="Admin._deleteUser(\'' + uid + '\',\'' + escapeAttr(u.email || '') + '\')" title="Eliminar usuario">' +

              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +

            '</button>') +

          '</div>' +

        '</td>' +

      '</tr>';

    }).join('');

  }



  function openUserPasswordModal(userId, email) {

    document.getElementById('userPasswordUserId').value = userId;

    document.getElementById('userPasswordEmail').textContent = 'Usuario: ' + email;

    document.getElementById('userNewPassword').value = '';

    document.getElementById('userConfirmPassword').value = '';

    document.getElementById('userPasswordOverlay').classList.add('active');

    document.body.style.overflow = 'hidden';

  }



  function closeUserPasswordModal() {

    document.getElementById('userPasswordOverlay').classList.remove('active');

    document.body.style.overflow = '';

  }



  function initUserManagement() {

    document.getElementById('btnRefreshUsers')?.addEventListener('click', renderUsersTable);

    document.getElementById('btnCloseUserPassword')?.addEventListener('click', closeUserPasswordModal);

    document.getElementById('btnCancelUserPassword')?.addEventListener('click', closeUserPasswordModal);



    document.getElementById('userPasswordForm')?.addEventListener('submit', async e => {

      e.preventDefault();

      const userId = document.getElementById('userPasswordUserId').value;

      const pw = document.getElementById('userNewPassword').value;

      const confirmPw = document.getElementById('userConfirmPassword').value;

      if (pw !== confirmPw) { showToast('Las contrase\u00f1as no coinciden', 'error'); return; }

      if (pw.length < 6) { showToast('M\u00ednimo 6 caracteres', 'error'); return; }

      try {

        await SB.updateUserPassword(userId, pw);

        showToast('Contrase\u00f1a actualizada', 'success');

        closeUserPasswordModal();

      } catch (err) {

        showToast('Error: ' + err.message, 'error');

      }

    });



    // Track registrations via auth state changes

    SB.onAuthChange(user => {

      if (!user) return;

      const users = getLocalUsers();

      const exists = users.some(u => u.id === user.id || (u.email || '').toLowerCase() === (user.email || '').toLowerCase());

      if (!exists) {

        users.push({

          id: user.id,

          email: user.email,

          full_name: user.user_metadata?.full_name || '',

          created_at: user.created_at || new Date().toISOString(),

          last_sign_in_at: user.last_sign_in_at || new Date().toISOString()

        });

        saveLocalUsers(users);

      }

    });

  }



  async function handleDeleteUser(userId, email) {

    if (!confirm('\u00bfEst\u00e1s seguro de eliminar al usuario ' + email + '? Esta acci\u00f3n no se puede deshacer.')) return;

    try {

      await SB.deleteUser(userId);

      // Also remove from local cache

      const users = getLocalUsers().filter(u => u.id !== userId && (u.email || '').toLowerCase() !== email.toLowerCase());

      saveLocalUsers(users);

      showToast('Usuario eliminado', 'success');

      renderUsersTable();

    } catch (err) {

      showToast('Error: ' + err.message, 'error');

    }

  }



    // ===== PQRs (Supabase) =====
  const PQR_STATUS_LABELS = { open: 'Abierto', answered: 'Respondido', closed: 'Cerrado' };

  async function renderPqrsTable() {
    const tbody = document.getElementById('pqrsTableBody');
    if (!tbody) return;
    const filterEl = document.getElementById('pqrStatusFilter');
    const statusFilter = filterEl ? filterEl.value : 'all';

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-secondary);">Cargando...</td></tr>';

    let pqrs = [];
    try { pqrs = await SB.getAllPqrs(); } catch (e) { console.warn('[Admin] PQR load:', e.message); }

    if (statusFilter !== 'all') pqrs = pqrs.filter(p => (p.status || 'open') === statusFilter);

    if (pqrs.length === 0) { tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-tertiary);">No hay PQRs${statusFilter !== 'all' ? ' con este estado' : ''}.</td></tr>`; return; }

    const typeLabels = { peticion: 'Petici\u00f3n', queja: 'Queja', reclamo: 'Reclamo', sugerencia: 'Sugerencia' };
    tbody.innerHTML = pqrs.map(p => {
      const status = p.status || 'open';
      return `<tr>
        <td><strong>${escapeHTML((p.id || '').substring(0, 8))}</strong></td>
        <td>${escapeHTML(typeLabels[p.type] || p.type || 'Petici\u00f3n')}</td>
        <td>${escapeHTML(p.subject || '\u2014')}</td>
        <td>${escapeHTML(p.user_email || '\u2014')}</td>
        <td>${p.created_at ? new Date(p.created_at).toLocaleDateString('es-CO') : '\u2014'}</td>
        <td><span class="table-status ${status === 'open' ? 'inactive' : 'active'}"><span class="table-status-dot"></span>${PQR_STATUS_LABELS[status] || status}</span></td>
        <td><button class="table-btn" data-action="view-pqr" data-pqr-id="${escapeAttr(p.id)}" title="Ver"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-action="view-pqr"]').forEach(btn => {
      btn.addEventListener('click', () => openPqrDetail(btn.dataset.pqrId, pqrs));
    });
  }

  async function openPqrDetail(pqrId, pqrs) {
    if (!pqrs) { try { pqrs = await SB.getAllPqrs(); } catch { pqrs = []; } }
    const pqr = pqrs.find(p => p.id === pqrId);
    if (!pqr) return;
    const typeLabels = { peticion: 'Petici\u00f3n', queja: 'Queja', reclamo: 'Reclamo', sugerencia: 'Sugerencia' };
    document.getElementById('pqrDetailTitle').textContent = 'PQR #' + (pqr.id || '').substring(0, 8);
    document.getElementById('pqrReplyId').value = pqrId;
    document.getElementById('pqrReplyText').value = pqr.admin_reply || '';
    document.getElementById('pqrDetailBody').innerHTML = `
      <div style="margin-bottom:var(--spacing-md)">
        <strong>Tipo:</strong> ${escapeHTML(typeLabels[pqr.type] || pqr.type || 'Petici\u00f3n')}<br>
        <strong>Asunto:</strong> ${escapeHTML(pqr.subject || '\u2014')}<br>
        <strong>Usuario:</strong> ${escapeHTML(pqr.user_email || '\u2014')}<br>
        <strong>Fecha:</strong> ${pqr.created_at ? new Date(pqr.created_at).toLocaleString('es-CO') : '\u2014'}<br>
        <strong>Estado:</strong> ${PQR_STATUS_LABELS[pqr.status || 'open']}
      </div>
      <div style="background:var(--bg-secondary);padding:var(--spacing-md);border-radius:var(--radius-md);margin-bottom:var(--spacing-md)">
        <strong>Mensaje:</strong><br>${escapeHTML(pqr.message || '')}
      </div>
      ${pqr.admin_reply ? `<div style="background:rgba(52,199,89,0.08);padding:var(--spacing-md);border-radius:var(--radius-md);border-left:3px solid var(--success)"><strong>Respuesta admin:</strong><br>${escapeHTML(pqr.admin_reply)}</div>` : ''}
    `;
    document.getElementById('pqrDetailOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closePqrDetail() { document.getElementById('pqrDetailOverlay').classList.remove('active'); document.body.style.overflow = ''; }

  async function savePqrReply() {
    const id = document.getElementById('pqrReplyId').value;
    const reply = document.getElementById('pqrReplyText').value.trim();
    if (!reply) { showToast('Escribe una respuesta', 'error'); return; }
    try {
      await SB.replyPqr(id, reply);
      showToast('Respuesta enviada', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
    closePqrDetail(); renderPqrsTable();
  }

  // ===== ADMIN REVIEWS =====
  async function renderReviewsTable() {
    const tbody = document.getElementById('reviewsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-secondary);">Cargando...</td></tr>';

    let reviews = [];
    try { reviews = await SB.getAllReviews(); } catch (e) { console.warn('[Admin] Reviews load:', e.message); }

    const products = getProducts();

    if (reviews.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-tertiary);">No hay rese\u00f1as.</td></tr>';
      return;
    }

    tbody.innerHTML = reviews.map(r => {
      const prod = products.find(p => p.id === r.product_id);
      const stars = '\u2605'.repeat(r.rating) + '\u2606'.repeat(5 - r.rating);
      return `<tr>
        <td>${escapeHTML(prod ? prod.name : (r.product_id || '').substring(0, 8))}</td>
        <td>${escapeHTML(r.user_name || 'An\u00f3nimo')}</td>
        <td style="color:var(--primary-orange);letter-spacing:2px;">${stars}</td>
        <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeAttr(r.comment || '')}">${escapeHTML(r.comment || '\u2014')}</td>
        <td>${r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : '\u2014'}</td>
        <td><button class="table-btn delete" data-action="delete-review" data-review-id="${escapeAttr(r.id)}" title="Eliminar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-action="delete-review"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('\u00bfEliminar esta rese\u00f1a?')) return;
        try {
          await SB.deleteReview(btn.dataset.reviewId);
          showToast('Rese\u00f1a eliminada', 'success');
          renderReviewsTable();
        } catch (err) { showToast('Error: ' + err.message, 'error'); }
      });
    });
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

    // Also try loading from Supabase
    if (typeof SB !== 'undefined' && SB.getSiteConfig) {
      SB.getSiteConfig('social_links').then(data => {
        if (data && typeof data === 'object') {
          localStorage.setItem(SOCIAL_KEY, JSON.stringify(data));
          document.getElementById('socialInstagram').value = data.instagram || '';
          document.getElementById('socialFacebook').value = data.facebook || '';
          document.getElementById('socialTiktok').value = data.tiktok || '';
          document.getElementById('socialTwitter').value = data.twitter || '';
          document.getElementById('socialYoutube').value = data.youtube || '';
          document.getElementById('socialWhatsapp').value = data.whatsapp || '';
        }
      }).catch(() => {});
    }
  }



  function saveSocialLinks() {

    const links = {};

    const fields = ['instagram','facebook','tiktok','twitter','youtube','whatsapp'];

    fields.forEach(f => {

      const val = document.getElementById('social' + f.charAt(0).toUpperCase() + f.slice(1))?.value?.trim();

      if (val) links[f] = val;

    });

    localStorage.setItem(SOCIAL_KEY, JSON.stringify(links));

    // Persist to Supabase
    if (typeof SB !== 'undefined' && SB.setSiteConfig) {
      SB.setSiteConfig('social_links', links).then(() => {
        showToast('Redes sociales guardadas', 'success');
      }).catch(e => {
        console.warn('[Admin] SB social save:', e);
        showToast('Guardado local, error al sincronizar con servidor', 'warning');
      });
    } else {
      showToast('Redes sociales guardadas', 'success');
    }

  }



  /* ----------------------------------------------------------
     COUPONS MANAGEMENT
  ---------------------------------------------------------- */
  let editingCouponId = null;

  async function renderCouponsTable() {
    const tbody = document.getElementById('couponsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-secondary);">Cargando...</td></tr>';
    try {
      const coupons = await SB.getCoupons();
      if (coupons.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-secondary);">No hay cupones creados.</td></tr>';
        return;
      }
      tbody.innerHTML = coupons.map(c => {
        const isExpired = c.expires_at && new Date(c.expires_at) < new Date();
        const usesText = c.max_uses > 0 ? `${c.current_uses || 0} / ${c.max_uses}` : `${c.current_uses || 0} / Ilimitado`;
        const expiry = c.expires_at ? new Date(c.expires_at).toLocaleDateString('es-CO') : 'Sin vencimiento';
        const statusClass = !c.active ? 'color:#ef4444' : isExpired ? 'color:#f59e0b' : 'color:#22c55e';
        const statusText = !c.active ? 'Inactivo' : isExpired ? 'Expirado' : 'Activo';
        const valueText = c.type === 'percentage' ? `${c.value}%` : `$${Number(c.value).toLocaleString('es-CO')}`;
        const minText = c.min_purchase > 0 ? `$${Number(c.min_purchase).toLocaleString('es-CO')}` : 'Sin minimo';
        return `<tr>
          <td><code style="font-weight:700;font-size:0.9rem">${escapeHTML(c.code)}</code></td>
          <td>${c.type === 'percentage' ? 'Porcentaje' : 'Fijo'}</td>
          <td>${valueText}</td>
          <td>${minText}</td>
          <td>${usesText}</td>
          <td>${expiry}</td>
          <td><span style="${statusClass};font-weight:600">${statusText}</span></td>
          <td>
            <div style="display:flex;gap:4px">
              <button class="table-btn" onclick="Admin._editCoupon('${c.id}')" title="Editar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="table-btn" onclick="Admin._deleteCoupon('${c.id}')" title="Eliminar" style="color:#ef4444">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-secondary);">Error: ${escapeHTML(e.message)}</td></tr>`;
    }
  }

  function openCouponForm(coupon) {
    editingCouponId = coupon ? coupon.id : null;
    document.getElementById('couponFormTitle').textContent = coupon ? 'Editar cupón' : 'Nuevo cupón';
    document.getElementById('couponCode').value = coupon ? coupon.code : '';
    document.getElementById('couponType').value = coupon ? coupon.type : 'percentage';
    document.getElementById('couponValue').value = coupon ? coupon.value : '';
    document.getElementById('couponMinPurchase').value = coupon ? (coupon.min_purchase || 0) : 0;
    document.getElementById('couponMaxUses').value = coupon ? (coupon.max_uses || 0) : 0;
    document.getElementById('couponExpiry').value = coupon && coupon.expires_at ? coupon.expires_at.split('T')[0] : '';
    document.getElementById('couponActive').checked = coupon ? coupon.active !== false : true;
    document.getElementById('couponFormOverlay').classList.add('active');
  }

  function closeCouponForm() {
    document.getElementById('couponFormOverlay').classList.remove('active');
    editingCouponId = null;
  }

  async function saveCoupon(e) {
    e.preventDefault();
    const code = document.getElementById('couponCode').value.toUpperCase().trim();
    const type = document.getElementById('couponType').value;
    const value = parseFloat(document.getElementById('couponValue').value) || 0;
    const min_purchase = parseFloat(document.getElementById('couponMinPurchase').value) || 0;
    const max_uses = parseInt(document.getElementById('couponMaxUses').value) || 0;
    const expiry = document.getElementById('couponExpiry').value;
    const active = document.getElementById('couponActive').checked;

    if (!code || value <= 0) { showToast('Codigo y valor son requeridos', 'error'); return; }
    if (type === 'percentage' && value > 100) { showToast('El porcentaje no puede ser mayor a 100', 'error'); return; }

    try {
      const couponData = { code, type, value, min_purchase, max_uses, active, expires_at: expiry ? new Date(expiry + 'T23:59:59').toISOString() : null };
      if (editingCouponId) couponData.id = editingCouponId;
      await SB.upsertCoupon(couponData);
      showToast(editingCouponId ? 'Cupon actualizado' : 'Cupon creado', 'success');
      closeCouponForm();
      renderCouponsTable();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }

  async function editCoupon(id) {
    try {
      const coupons = await SB.getCoupons();
      const coupon = coupons.find(c => c.id === id);
      if (coupon) openCouponForm(coupon);
    } catch (e) { showToast('Error al cargar cupon', 'error'); }
  }

  async function deleteCouponById(id) {
    if (!confirm('¿Eliminar este cupon?')) return;
    try {
      await SB.deleteCoupon(id);
      showToast('Cupon eliminado', 'info');
      renderCouponsTable();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  }

  function initCouponsEvents() {
    document.getElementById('btnAddCoupon')?.addEventListener('click', () => openCouponForm(null));
    document.getElementById('btnCloseCouponForm')?.addEventListener('click', closeCouponForm);
    document.getElementById('btnCancelCoupon')?.addEventListener('click', closeCouponForm);
    document.getElementById('couponForm')?.addEventListener('submit', saveCoupon);
    document.getElementById('couponFormOverlay')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeCouponForm(); });
  }


  /* ----------------------------------------------------------
     ADVANCED ANALYTICS
  ---------------------------------------------------------- */
  async function renderAnalytics() {
    const kpisEl = document.getElementById('analyticsKpis');
    const salesEl = document.getElementById('analyticsSalesChart');
    const topEl = document.getElementById('analyticsTopProducts');
    const catEl = document.getElementById('analyticsCategoryChart');
    const statusEl = document.getElementById('analyticsOrderStatus');
    const activityEl = document.getElementById('analyticsRecentActivity');
    if (!kpisEl) return;

    const rangeDays = document.getElementById('analyticsDateRange')?.value || '30';
    let orders = [];
    try { orders = await SB.getAllOrders(); } catch (e) { console.warn('Analytics orders:', e); }

    const products = JSON.parse(localStorage.getItem('libretech_products') || '[]');
    const now = new Date();
    const rangeMs = rangeDays === 'all' ? Infinity : parseInt(rangeDays) * 86400000;
    const filtered = orders.filter(o => {
      if (o.status === 'cancelled') return false;
      if (rangeMs === Infinity) return true;
      return (now - new Date(o.created_at)) <= rangeMs;
    });

    // KPI calculations
    const totalRevenue = filtered.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
    const totalOrders = filtered.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const pendingOrders = filtered.filter(o => o.status === 'pending').length;
    const completedOrders = filtered.filter(o => o.status === 'completed' || o.status === 'delivered').length;
    const totalProducts = products.filter(p => p.active !== false).length;

    const fmtPrice = (v) => '$' + Math.round(v).toLocaleString('es-CO');

    kpisEl.innerHTML = [
      { label: 'Ingresos totales', value: fmtPrice(totalRevenue), color: '#22c55e' },
      { label: 'Pedidos', value: totalOrders, color: '#3b82f6' },
      { label: 'Ticket promedio', value: fmtPrice(avgOrderValue), color: '#8b5cf6' },
      { label: 'Pendientes', value: pendingOrders, color: '#f59e0b' },
      { label: 'Completados', value: completedOrders, color: '#22c55e' },
      { label: 'Productos activos', value: totalProducts, color: '#06b6d4' }
    ].map(k => `
      <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-lg);padding:var(--spacing-lg);border-left:4px solid ${k.color}">
        <div style="font-size:0.8rem;color:var(--text-tertiary);margin-bottom:4px">${k.label}</div>
        <div style="font-size:1.5rem;font-weight:800;color:var(--text-primary)">${k.value}</div>
      </div>
    `).join('');

    // Sales by day (bar chart via CSS)
    if (salesEl) {
      const dayMap = {};
      filtered.forEach(o => {
        const day = new Date(o.created_at).toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
        dayMap[day] = (dayMap[day] || 0) + (parseFloat(o.total) || 0);
      });
      const entries = Object.entries(dayMap).slice(-15);
      const maxVal = Math.max(...entries.map(e => e[1]), 1);
      if (entries.length === 0) {
        salesEl.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">Sin datos</p>';
      } else {
        salesEl.innerHTML = `<div style="display:flex;align-items:flex-end;gap:4px;height:180px">
          ${entries.map(([day, val]) => `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
              <span style="font-size:0.65rem;color:var(--text-tertiary)">${fmtPrice(val)}</span>
              <div style="width:100%;background:var(--primary-blue);border-radius:4px 4px 0 0;height:${Math.max(4, (val / maxVal) * 150)}px;transition:height 0.3s"></div>
              <span style="font-size:0.6rem;color:var(--text-tertiary);white-space:nowrap">${day}</span>
            </div>
          `).join('')}
        </div>`;
      }
    }

    // Top selling products
    if (topEl) {
      const productSales = {};
      filtered.forEach(o => {
        const items = o.items || [];
        items.forEach(item => {
          const pid = item.productId || item.product_id;
          productSales[pid] = (productSales[pid] || 0) + (item.quantity || 1);
        });
      });
      const sorted = Object.entries(productSales)
        .map(([pid, qty]) => ({ product: products.find(p => p.id === pid), qty }))
        .filter(e => e.product)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10);

      if (sorted.length === 0) {
        topEl.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">Sin datos</p>';
      } else {
        const maxQty = sorted[0].qty;
        topEl.innerHTML = sorted.map((e, i) => `
          <div style="display:flex;align-items:center;gap:var(--spacing-sm);margin-bottom:8px">
            <span style="font-size:0.75rem;font-weight:700;color:var(--text-tertiary);width:20px">${i + 1}</span>
            <div style="flex:1">
              <div style="font-size:0.8rem;font-weight:600;margin-bottom:2px">${escapeHTML(e.product.name)}</div>
              <div style="height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${(e.qty / maxQty) * 100}%;background:var(--primary-blue);border-radius:3px"></div>
              </div>
            </div>
            <span style="font-size:0.8rem;font-weight:700;color:var(--text-primary)">${e.qty}</span>
          </div>
        `).join('');
      }
    }

    // Sales by category
    if (catEl) {
      const catSales = {};
      filtered.forEach(o => {
        (o.items || []).forEach(item => {
          const p = products.find(pr => pr.id === (item.productId || item.product_id));
          if (p) {
            const cat = p.category || 'Sin categoria';
            catSales[cat] = (catSales[cat] || 0) + (parseFloat(item.quantity || 1) * parseFloat(p.offerActive && p.offerPrice ? p.offerPrice : p.price));
          }
        });
      });
      const catEntries = Object.entries(catSales).sort((a, b) => b[1] - a[1]);
      const catTotal = catEntries.reduce((s, [, v]) => s + v, 0) || 1;
      const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

      if (catEntries.length === 0) {
        catEl.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">Sin datos</p>';
      } else {
        catEl.innerHTML = catEntries.map(([cat, val], i) => `
          <div style="display:flex;align-items:center;gap:var(--spacing-sm);margin-bottom:8px">
            <div style="width:12px;height:12px;border-radius:50%;background:${colors[i % colors.length]};flex-shrink:0"></div>
            <span style="font-size:0.8rem;flex:1">${escapeHTML(cat)}</span>
            <span style="font-size:0.8rem;font-weight:700">${fmtPrice(val)}</span>
            <span style="font-size:0.7rem;color:var(--text-tertiary)">${Math.round((val / catTotal) * 100)}%</span>
          </div>
        `).join('');
      }
    }

    // Orders by status
    if (statusEl) {
      const statusMap = {};
      filtered.forEach(o => { statusMap[o.status || 'pending'] = (statusMap[o.status || 'pending'] || 0) + 1; });
      const statusLabels = { pending: 'Pendiente', confirmed: 'Confirmado', shipped: 'Enviado', delivered: 'Entregado', completed: 'Completado', cancelled: 'Cancelado' };
      const statusColors = { pending: '#f59e0b', confirmed: '#3b82f6', shipped: '#8b5cf6', delivered: '#22c55e', completed: '#22c55e', cancelled: '#ef4444' };
      const statusEntries = Object.entries(statusMap).sort((a, b) => b[1] - a[1]);
      const maxStatus = Math.max(...statusEntries.map(e => e[1]), 1);

      if (statusEntries.length === 0) {
        statusEl.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">Sin datos</p>';
      } else {
        statusEl.innerHTML = statusEntries.map(([status, count]) => `
          <div style="display:flex;align-items:center;gap:var(--spacing-sm);margin-bottom:8px">
            <span style="font-size:0.8rem;width:90px;color:${statusColors[status] || '#666'};font-weight:600">${statusLabels[status] || status}</span>
            <div style="flex:1;height:20px;background:var(--bg-tertiary);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${(count / maxStatus) * 100}%;background:${statusColors[status] || '#666'};border-radius:4px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px">
                <span style="font-size:0.7rem;color:#fff;font-weight:700">${count}</span>
              </div>
            </div>
          </div>
        `).join('');
      }
    }

    // Recent activity
    if (activityEl) {
      const recent = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 15);
      if (recent.length === 0) {
        activityEl.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:1rem;">Sin actividad</p>';
      } else {
        activityEl.innerHTML = recent.map(o => {
          const date = new Date(o.created_at).toLocaleString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          const statusLabels2 = { pending: 'Pendiente', confirmed: 'Confirmado', shipped: 'Enviado', delivered: 'Entregado', completed: 'Completado', cancelled: 'Cancelado' };
          return `<div style="display:flex;align-items:center;gap:var(--spacing-sm);padding:8px 0;border-bottom:1px solid var(--border-light)">
            <span style="font-size:0.75rem;color:var(--text-tertiary);width:100px;flex-shrink:0">${date}</span>
            <span style="font-size:0.8rem;flex:1">${escapeHTML(o.customer_name || 'Cliente')} - $${Math.round(parseFloat(o.total) || 0).toLocaleString('es-CO')}</span>
            <span style="font-size:0.7rem;font-weight:600;color:var(--primary-blue)">${statusLabels2[o.status] || o.status}</span>
          </div>`;
        }).join('');
      }
    }
  }

  function initAnalyticsEvents() {
    document.getElementById('analyticsDateRange')?.addEventListener('change', renderAnalytics);
    document.getElementById('btnRefreshAnalytics')?.addEventListener('click', renderAnalytics);
  }



  return {

    init,

    _editVB: openVisualBannerForm,

    _deleteVB: (i) => { if (confirm('¿Eliminar este banner?')) { const b = getVisualBanners(); b.splice(i, 1); saveVisualBanners(b); syncToLegacyBanners(b); renderVisualBannersTable(); updatePagePreview(); showToast('Banner eliminado', 'info'); } },

    _moveVB: (i, dir) => { const b = getVisualBanners(); const j = i + dir; if (j < 0 || j >= b.length) return; [b[i], b[j]] = [b[j], b[i]]; saveVisualBanners(b); syncToLegacyBanners(b); renderVisualBannersTable(); },

    _changeUserPw: openUserPasswordModal,

    _deleteUser: handleDeleteUser,

    _editCoupon: editCoupon,

    _deleteCoupon: deleteCouponById

  };

})();

