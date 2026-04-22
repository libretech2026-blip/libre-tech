/* ============================================================
   LIBRE TECH — Supabase Client  (supabase-client.js)
   Inicializa el cliente y expone helpers reutilizables.
   Cargado ANTES de cart.js / auth.js / app.js / admin.js
   ============================================================ */

const SB = (() => {
  'use strict';

  const SUPABASE_URL  = 'https://ouhgtxeufkzbxjwuiosj.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aGd0eGV1Zmt6Ynhqd3Vpb3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzU5MzEsImV4cCI6MjA5MTkxMTkzMX0.fNYEt-LfcH3R4E0oHCRPhvc3Glh73zNJAIB9Njv1L0Q';

  const PRODUCTS_LS_KEY = 'libretech_products';

  // Supabase JS v2 CDN expone window.supabase.createClient
  const client = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON)
    : null;

  if (!client) console.error('[SB] Supabase JS library not loaded — include the CDN before this script.');

  // UUID v4 regex to validate IDs (must be before migrateProductIds)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /* ----------------------------------------------------------
     MIGRATE — Convert all prod-xxx IDs to UUID at startup
  ---------------------------------------------------------- */
  function migrateProductIds() {
    try {
      const raw = localStorage.getItem(PRODUCTS_LS_KEY);
      if (!raw) return;
      const products = JSON.parse(raw);
      let changed = false;
      for (const p of products) {
        if (p.id && !UUID_RE.test(p.id)) {
          p.id = crypto.randomUUID();
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(PRODUCTS_LS_KEY, JSON.stringify(products));
        console.log('[SB] Migrated', products.length, 'product IDs to UUID format');
      }
    } catch (e) {
      console.warn('[SB] migrateProductIds error:', e.message);
    }
  }
  // Run migration immediately
  migrateProductIds();

  /* ----------------------------------------------------------
     PRODUCTS — Fetch from Supabase → cache in localStorage
  ---------------------------------------------------------- */
  function mapRow(row) {
    return {
      id:           row.id,
      name:         row.name,
      price:        row.price,
      description:  row.description  || '',
      category:     row.category     || '',
      brand:        row.brand        || '',
      image:        row.image_url    || '',
      stock:        row.stock        ?? 0,
      active:       row.active       !== false,
      featured:     row.featured     === true,
      createdAt:    row.created_at   || '',
      colors:       row.colors       || [],
      specs:        row.specs        || [],
      images:       row.images       || [],
      offerActive:  row.offer_active === true,
      offerPrice:   row.offer_price  || null,
      offerPercent: row.offer_percent|| null
    };
  }

  // Reverse map: JS object → Supabase row
  // Track which columns the DB actually has (discovered on first error)
  let missingCols = new Set();

  function extractMissingCol(errorMsg) {
    const m = errorMsg && errorMsg.match(/Could not find the '(\w+)' column/);
    return m ? m[1] : null;
  }

  function ensureUUID(id) {
    if (UUID_RE.test(id)) return id;
    // Convert non-UUID id to a proper UUID via crypto
    return crypto.randomUUID();
  }

  function toRow(p) {
    const row = {
      id:            ensureUUID(p.id),
      name:          p.name,
      price:         p.price,
      description:   p.description   || '',
      category:      p.category      || '',
      brand:         p.brand         || '',
      image_url:     p.image         || '',
      images:        p.images        || [],
      stock:         p.stock         ?? 0,
      active:        p.active        !== false,
      featured:      p.featured      === true,
      colors:        p.colors        || [],
      specs:         p.specs         || [],
      offer_active:  p.offerActive   === true,
      offer_price:   p.offerPrice    || 0,
      offer_percent: p.offerPercent  || 0
    };
    // Strip columns known to be missing from the DB
    missingCols.forEach(c => delete row[c]);
    return row;
  }

  // Retry an insert/upsert, stripping the failing column each time (max 10 retries)
  async function resilientUpsert(row) {
    let attempts = 0;
    while (attempts < 10) {
      const { data, error } = await client.from('products').upsert(row, { onConflict: 'id' }).select().single();
      if (!error) return data;
      const col = extractMissingCol(error.message);
      if (col && !missingCols.has(col)) {
        console.warn('[SB] Column missing, will skip:', col);
        missingCols.add(col);
        delete row[col];
        attempts++;
      } else {
        throw error;
      }
    }
    throw new Error('Too many missing columns');
  }

  async function syncProducts() {
    if (!client) return getCachedProducts();
    try {
      const { data, error } = await client
        .from('products')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      const products = (data || []).map(mapRow);

      // Don't overwrite local cache with empty result if we already have products locally
      const cached = getCachedProducts();
      if (products.length === 0 && cached.length > 0) {
        console.warn('[SB] Supabase returned 0 products but localStorage has', cached.length, '— keeping local cache');
        return cached;
      }

      localStorage.setItem(PRODUCTS_LS_KEY, JSON.stringify(products));
      return products;
    } catch (e) {
      console.warn('[SB] syncProducts fell back to cache:', e.message);
      return getCachedProducts();
    }
  }

  function getCachedProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_LS_KEY) || '[]'); }
    catch { return []; }
  }

  /* ----------------------------------------------------------
     PRODUCT CRUD (admin)
  ---------------------------------------------------------- */
  async function insertProduct(product) {
    const row = toRow(product);
    const saved = await resilientUpsert(row);
    return saved ? mapRow(saved) : product;
  }

  async function updateProduct(id, updates) {
    const safeId = ensureUUID(id);
    const partial = {};
    if ('name'        in updates) partial.name         = updates.name;
    if ('price'       in updates) partial.price        = updates.price;
    if ('description' in updates) partial.description  = updates.description;
    if ('category'    in updates) partial.category     = updates.category;
    if ('brand'       in updates) partial.brand        = updates.brand;
    if ('image'       in updates) partial.image_url    = updates.image;
    if ('images'      in updates) partial.images       = updates.images;
    if ('stock'       in updates) partial.stock        = updates.stock;
    if ('active'      in updates) partial.active       = updates.active;
    if ('featured'    in updates) partial.featured     = updates.featured;
    if ('colors'      in updates) partial.colors       = updates.colors;
    if ('specs'       in updates) partial.specs        = updates.specs;
    if ('offerActive' in updates) partial.offer_active = updates.offerActive;
    if ('offerPrice'  in updates) partial.offer_price  = updates.offerPrice;
    if ('offerPercent'in updates) partial.offer_percent = updates.offerPercent;
    // Strip columns known to be missing
    missingCols.forEach(c => delete partial[c]);

    let attempts = 0;
    let current = { ...partial };
    while (attempts < 10) {
      const { error } = await client.from('products').update(current).eq('id', safeId);
      if (!error) return;
      const col = extractMissingCol(error.message);
      if (col && !missingCols.has(col)) {
        console.warn('[SB] Column missing in update, will skip:', col);
        missingCols.add(col);
        delete current[col];
        attempts++;
      } else {
        throw error;
      }
    }
  }

  async function deleteProduct(id) {
    const safeId = ensureUUID(id);
    const { error } = await client.from('products').delete().eq('id', safeId);
    if (error) throw error;
  }

  /* ----------------------------------------------------------
     STOCK — decrement after order
  ---------------------------------------------------------- */
  async function decrementStock(items) {
    // items = [{ productId, quantity }]
    for (const item of items) {
      await client.rpc('decrement_stock_if_possible', {
        p_id: item.productId,
        p_qty: item.quantity
      }).catch(() => {
        // Fallback: simple update
        client.from('products')
          .update({ stock: Math.max(0, (item.currentStock ?? 0) - item.quantity) })
          .eq('id', item.productId);
      });
    }
    await syncProducts();
  }

  /* ----------------------------------------------------------
     ORDERS
  ---------------------------------------------------------- */
  async function saveOrder(order) {
    const row = {
      user_id:        order.userId || null,
      customer_name:  order.customerName || '',
      customer_email: order.customerEmail || '',
      customer_phone: order.customerPhone || '',
      method:         order.method || 'contraentrega',
      status:         order.status || 'pending',
      total:          order.total  || 0,
      items:          order.items  || []
    };
    const { data, error } = await client.from('orders').insert(row).select().single();
    if (error) console.error('[SB] saveOrder error:', error.message);
    return data;
  }

  async function getOrders(userId) {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[SB] getOrders:', error.message); return []; }
    return (data || []).map(mapOrder);
  }

  async function getAllOrders() {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('[SB] getAllOrders:', error.message); return []; }
    return (data || []).map(mapOrder);
  }

  function mapOrder(o) {
    return {
      id: o.id,
      date: o.created_at,
      userId: o.user_id,
      customerName: o.customer_name || '',
      customerEmail: o.customer_email || '',
      customerPhone: o.customer_phone || '',
      method: o.method,
      status: o.status,
      total: o.total,
      items: o.items || []
    };
  }

  async function updateOrderStatus(orderId, status) {
    const { error } = await client.from('orders').update({ status }).eq('id', orderId);
    if (error) console.error('[SB] updateOrderStatus:', error.message);
  }

  /* ----------------------------------------------------------
     PQRs
  ---------------------------------------------------------- */
  async function submitPqr(pqr) {
    const row = {
      user_id:    pqr.userId,
      user_email: pqr.userEmail || '',
      type:       pqr.type || 'peticion',
      subject:    pqr.subject || '',
      message:    pqr.message || '',
      status:     'open'
    };
    const { data, error } = await client.from('pqrs').insert(row).select().single();
    if (error) throw error;
    return data;
  }

  async function getUserPqrs(userId) {
    const { data, error } = await client
      .from('pqrs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[SB] getUserPqrs:', error.message); return []; }
    return data || [];
  }

  async function getAllPqrs() {
    const { data, error } = await client
      .from('pqrs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('[SB] getAllPqrs:', error.message); return []; }
    return data || [];
  }

  async function replyPqr(pqrId, reply) {
    const { error } = await client.from('pqrs')
      .update({ admin_reply: reply, status: 'answered', updated_at: new Date().toISOString() })
      .eq('id', pqrId);
    if (error) throw error;
  }

  /* ----------------------------------------------------------
     REVIEWS
  ---------------------------------------------------------- */
  async function getProductReviews(productId) {
    const { data, error } = await client
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[SB] getProductReviews:', error.message); return []; }
    return data || [];
  }

  async function submitReview(review) {
    const row = {
      product_id: review.productId,
      user_id:    review.userId,
      user_name:  review.userName || '',
      rating:     review.rating,
      comment:    review.comment || ''
    };
    const { data, error } = await client.from('reviews').insert(row).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteReview(reviewId) {
    const { error } = await client.from('reviews').delete().eq('id', reviewId);
    if (error) throw error;
  }

  async function getAllReviews() {
    const { data, error } = await client
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('[SB] getAllReviews:', error.message); return []; }
    return data || [];
  }

  /* ----------------------------------------------------------
     STORAGE — Product images
  ---------------------------------------------------------- */
  async function uploadImage(file, productId) {
    const ext = file.name.split('.').pop() || 'webp';
    const path = `${productId}/${Date.now()}.${ext}`;
    const { error } = await client.storage
      .from('product-images')
      .upload(path, file, { cacheControl: '3600', upsert: true });
    if (error) throw error;
    const { data: urlData } = client.storage
      .from('product-images')
      .getPublicUrl(path);
    return urlData.publicUrl;
  }

  /* ----------------------------------------------------------
     AUTH helpers
  ---------------------------------------------------------- */
  async function getSession() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data?.session || null;
  }

  async function getUser() {
    const session = await getSession();
    return session?.user || null;
  }

  function isAdmin(user) {
    if (!user) return false;
    // Check user_metadata flag (set via Supabase Dashboard SQL)
    if (user.user_metadata?.is_admin === true) return true;
    if (user.app_metadata?.is_admin === true) return true;
    // Fallback: check admin email (update this list as needed)
    const adminEmails = ['admin@libretechtienda.com', 'libretech2026@gmail.com'];
    if (user.email && adminEmails.includes(user.email.toLowerCase())) return true;
    return false;
  }

  function onAuthChange(callback) {
    if (!client) return { data: { subscription: { unsubscribe() {} } } };
    return client.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
  }

  /* ----------------------------------------------------------
     BULK SYNC — Push all local products to Supabase
  ---------------------------------------------------------- */
  async function pushAllProducts(products) {
    if (!client) throw new Error('Supabase not available');
    let successCount = 0;
    let failCount = 0;
    let idsChanged = false;

    for (const p of products) {
      try {
        // Fix non-UUID IDs before pushing
        if (!UUID_RE.test(p.id)) {
          p.id = crypto.randomUUID();
          idsChanged = true;
        }
        const row = toRow(p);
        await resilientUpsert(row);
        successCount++;
      } catch (e) {
        failCount++;
        console.warn('[SB] pushAll fail:', p.id, e.message);
      }
    }

    // Persist fixed IDs back to localStorage
    if (idsChanged) {
      localStorage.setItem(PRODUCTS_LS_KEY, JSON.stringify(products));
    }

    return { successCount, failCount };
  }

  /* ----------------------------------------------------------
     USER MANAGEMENT (admin) — via auth.admin (requires service_role) 
     or via database functions
  ---------------------------------------------------------- */
  async function listUsers() {
    // Use a database view or function to list auth.users
    const { data, error } = await client.rpc('list_users');
    if (error) {
      console.warn('[SB] listUsers RPC not available:', error.message);
      // Fallback: try reading from profiles table
      const { data: profiles, error: e2 } = await client.from('profiles').select('*').order('created_at', { ascending: false });
      if (e2) { console.warn('[SB] profiles fallback failed:', e2.message); return []; }
      return profiles || [];
    }
    return data || [];
  }

  async function deleteUser(userId) {
    const { error } = await client.rpc('admin_delete_user', { target_user_id: userId });
    if (error) throw error;
  }

  async function updateUserPassword(userId, newPassword) {
    const { error } = await client.rpc('admin_update_password', { target_user_id: userId, new_password: newPassword });
    if (error) throw error;
  }
  /* ----------------------------------------------------------
     SITE CONFIG — key/value store for banners, social links, etc.
     Con caché en IndexedDB + stale-while-revalidate para
     sobrevivir a respuestas lentas de Supabase.
  ---------------------------------------------------------- */
  const _memCache = new Map();              // cache en memoria (instantáneo)
  const _inflight = new Map();              // deduplicar peticiones concurrentes
  const SITE_CONFIG_TTL = 10 * 60 * 1000;   // 10 minutos

  // Mini wrapper de IndexedDB para persistir entre recargas
  const _idb = (() => {
    const DB = 'librtech-cache';
    const STORE = 'site_config';
    let dbP = null;
    function open() {
      if (dbP) return dbP;
      dbP = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return dbP;
    }
    return {
      async get(key) {
        try {
          const db = await open();
          return await new Promise((res, rej) => {
            const tx = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
            tx.onsuccess = () => res(tx.result || null);
            tx.onerror = () => rej(tx.error);
          });
        } catch { return null; }
      },
      async set(key, value) {
        try {
          const db = await open();
          return await new Promise((res, rej) => {
            const tx = db.transaction(STORE, 'readwrite').objectStore(STORE).put({ value, ts: Date.now() }, key);
            tx.onsuccess = () => res();
            tx.onerror = () => rej(tx.error);
          });
        } catch { /* silencioso */ }
      },
      async del(key) {
        try {
          const db = await open();
          return await new Promise((res) => {
            const tx = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(key);
            tx.onsuccess = () => res();
            tx.onerror = () => res();
          });
        } catch { /* silencioso */ }
      }
    };
  })();

  async function _fetchSiteConfigFromSB(key) {
    if (!client) return null;
    // Deduplicar peticiones concurrentes
    if (_inflight.has(key)) return _inflight.get(key);
    const p = (async () => {
      try {
        const { data, error } = await client
          .from('site_config')
          .select('value')
          .eq('key', key)
          .maybeSingle();
        if (error) { console.warn('[SB] getSiteConfig error:', error.message); return null; }
        const value = data ? data.value : null;
        // Guardar en caché
        _memCache.set(key, { value, ts: Date.now() });
        _idb.set(key, value).catch(() => {});
        return value;
      } finally {
        _inflight.delete(key);
      }
    })();
    _inflight.set(key, p);
    return p;
  }

  async function getSiteConfig(key) {
    if (!client) return null;

    // 1. Memoria (instantáneo dentro de la misma sesión)
    const mem = _memCache.get(key);
    if (mem && Date.now() - mem.ts < SITE_CONFIG_TTL) {
      return mem.value;
    }

    // 2. IndexedDB (instantáneo entre recargas)
    const idb = await _idb.get(key);
    if (idb && idb.value !== undefined) {
      _memCache.set(key, { value: idb.value, ts: idb.ts });
      const age = Date.now() - (idb.ts || 0);
      // Stale-while-revalidate: devuelve el cache y refresca en background si es viejo
      if (age > SITE_CONFIG_TTL) {
        _fetchSiteConfigFromSB(key).catch(() => {});
      }
      return idb.value;
    }

    // 3. Primera vez: pedir a Supabase (única carga lenta)
    return _fetchSiteConfigFromSB(key);
  }

  async function setSiteConfig(key, value) {
    if (!client) throw new Error('Supabase not initialized');
    const { error } = await client
      .from('site_config')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
    // Invalidar caches locales para que la siguiente lectura traiga los valores frescos
    _memCache.set(key, { value, ts: Date.now() });
    _idb.set(key, value).catch(() => {});
  }




  /* ----------------------------------------------------------
     CUSTOMER PROFILES — shipping/contact data
  ---------------------------------------------------------- */
  async function getCustomerProfile(userId) {
    if (!client || !userId) return null;
    const { data, error } = await client
      .from('customer_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) { console.warn('[SB] getCustomerProfile error:', error.message); return null; }
    return data;
  }

  async function upsertCustomerProfile(userId, profile) {
    if (!client || !userId) throw new Error('Missing client or userId');
    const { error } = await client
      .from('customer_profiles')
      .upsert({
        user_id: userId,
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        document_type: profile.document_type || 'CC',
        document_number: profile.document_number || '',
        address: profile.address || '',
        city: profile.city || '',
        department: profile.department || '',
        neighborhood: profile.neighborhood || '',
        zip_code: profile.zip_code || '',
        notes: profile.notes || '',
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    if (error) throw error;
  }

  /* ----------------------------------------------------------
     COUPONS CRUD
  ---------------------------------------------------------- */
  async function getCoupons() {
    if (!client) return [];
    const { data, error } = await client.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function upsertCoupon(coupon) {
    if (!client) throw new Error('No Supabase client');
    const row = {
      code: (coupon.code || '').toUpperCase().trim(),
      type: coupon.type || 'percentage',
      value: coupon.value || 0,
      min_purchase: coupon.min_purchase || 0,
      max_uses: coupon.max_uses || 0,
      current_uses: coupon.current_uses || 0,
      expires_at: coupon.expires_at || null,
      active: coupon.active !== false
    };
    if (coupon.id) row.id = coupon.id;
    const { data, error } = await client.from('coupons').upsert(row, { onConflict: 'id' }).select().single();
    if (error) throw error;
    return data;
  }

  async function deleteCoupon(id) {
    if (!client) throw new Error('No Supabase client');
    const { error } = await client.from('coupons').delete().eq('id', id);
    if (error) throw error;
  }

  async function validateCoupon(code, cartTotal) {
    if (!client) throw new Error('No Supabase client');
    const { data, error } = await client.from('coupons').select('*').eq('code', code.toUpperCase().trim()).eq('active', true).single();
    if (error || !data) throw new Error('Cupon no encontrado o inactivo');
    if (data.expires_at && new Date(data.expires_at) < new Date()) throw new Error('Este cupon ha expirado');
    if (data.max_uses > 0 && data.current_uses >= data.max_uses) throw new Error('Este cupon ha alcanzado su limite de usos');
    if (data.min_purchase > 0 && cartTotal < data.min_purchase) throw new Error('La compra minima para este cupon es $' + data.min_purchase.toLocaleString('es-CO'));
    return data;
  }

  async function incrementCouponUse(id) {
    if (!client) return;
    const { data } = await client.from('coupons').select('current_uses').eq('id', id).single();
    if (data) {
      await client.from('coupons').update({ current_uses: (data.current_uses || 0) + 1 }).eq('id', id);
    }
  }

  // --- Public API ---
  return {
    client,
    // Products
    syncProducts,
    getCachedProducts,
    insertProduct,
    updateProduct,
    deleteProduct,
    decrementStock,
    pushAllProducts,
    toRow,
    mapRow,
    // Orders
    saveOrder,
    getOrders,
    getAllOrders,
    updateOrderStatus,
    // PQRs
    submitPqr,
    getUserPqrs,
    getAllPqrs,
    replyPqr,
    // Reviews
    getProductReviews,
    submitReview,
    deleteReview,
    getAllReviews,
    // Storage
    uploadImage,
    // Auth
    getSession,
    getUser,
    isAdmin,
    onAuthChange,
    // User management
    listUsers,
    deleteUser,
    updateUserPassword,
    // Site Config (banners, social links)
    getSiteConfig,
    setSiteConfig,
    // Customer Profiles
    getCustomerProfile,
    upsertCustomerProfile,
    // Coupons
    getCoupons,
    upsertCoupon,
    deleteCoupon,
    validateCoupon,
    incrementCouponUse
  };
})();
