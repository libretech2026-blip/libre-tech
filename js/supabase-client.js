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

  // UUID v4 regex to validate IDs
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      id:      order.id,
      user_id: order.userId || null,
      method:  order.method || 'contraentrega',
      status:  order.status || 'pending',
      total:   order.total  || 0,
      items:   order.items  || []
    };
    const { error } = await client.from('orders').insert(row);
    if (error) console.error('[SB] saveOrder error:', error.message);
  }

  async function getOrders(userId) {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) { console.error('[SB] getOrders:', error.message); return []; }
    return (data || []).map(o => ({
      id: o.id,
      date: o.created_at,
      method: o.method,
      status: o.status,
      total: o.total,
      items: o.items || []
    }));
  }

  async function getAllOrders() {
    const { data, error } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('[SB] getAllOrders:', error.message); return []; }
    return (data || []).map(o => ({
      id: o.id,
      date: o.created_at,
      userId: o.user_id,
      method: o.method,
      status: o.status,
      total: o.total,
      items: o.items || []
    }));
  }

  async function updateOrderStatus(orderId, status) {
    const { error } = await client.from('orders').update({ status }).eq('id', orderId);
    if (error) console.error('[SB] updateOrderStatus:', error.message);
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
    updateUserPassword
  };
})();
