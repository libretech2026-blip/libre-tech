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
  // Extended columns that may not exist in every database setup
  const EXTENDED_COLS = ['colors', 'specs', 'offer_active', 'offer_price', 'offer_percent'];
  let schemaHasExtended = true; // optimistic; set to false on first failure

  function toRow(p, includeExtended) {
    const base = {
      id:            p.id,
      name:          p.name,
      price:         p.price,
      description:   p.description   || '',
      category:      p.category      || '',
      brand:         p.brand         || '',
      image_url:     p.image         || '',
      stock:         p.stock         ?? 0,
      active:        p.active        !== false,
      featured:      p.featured      === true
    };
    if (includeExtended !== false && schemaHasExtended) {
      base.colors        = p.colors      || [];
      base.specs         = p.specs       || [];
      base.offer_active  = p.offerActive === true;
      base.offer_price   = p.offerPrice  || 0;
      base.offer_percent = p.offerPercent|| 0;
    }
    return base;
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
    const { data, error } = await client.from('products').insert(row).select().single();
    if (error) {
      // If extended columns don't exist in the DB, retry without them
      if (schemaHasExtended && error.message && error.message.includes('column')) {
        console.warn('[SB] Extended columns missing, retrying without them:', error.message);
        schemaHasExtended = false;
        const baseRow = toRow(product, false);
        const { data: d2, error: e2 } = await client.from('products').insert(baseRow).select().single();
        if (e2) throw e2;
        return d2 ? mapRow(d2) : product;
      }
      throw error;
    }
    return data ? mapRow(data) : product;
  }

  async function updateProduct(id, updates) {
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
    if (schemaHasExtended) {
      if ('colors'      in updates) partial.colors       = updates.colors;
      if ('specs'       in updates) partial.specs        = updates.specs;
      if ('offerActive' in updates) partial.offer_active = updates.offerActive;
      if ('offerPrice'  in updates) partial.offer_price  = updates.offerPrice;
    }

    const { error } = await client.from('products').update(partial).eq('id', id);
    if (error) {
      if (schemaHasExtended && error.message && error.message.includes('column')) {
        console.warn('[SB] Extended columns missing in update, retrying:', error.message);
        schemaHasExtended = false;
        EXTENDED_COLS.forEach(c => delete partial[c]);
        const { error: e2 } = await client.from('products').update(partial).eq('id', id);
        if (e2) throw e2;
        return;
      }
      throw error;
    }
  }

  async function deleteProduct(id) {
    const { error } = await client.from('products').delete().eq('id', id);
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
    for (const p of products) {
      try {
        const row = toRow(p);
        const { error } = await client.from('products').upsert(row, { onConflict: 'id' });
        if (error) {
          if (schemaHasExtended && error.message && error.message.includes('column')) {
            schemaHasExtended = false;
            const baseRow = toRow(p, false);
            const { error: e2 } = await client.from('products').upsert(baseRow, { onConflict: 'id' });
            if (e2) { failCount++; console.warn('[SB] pushAll fail:', p.id, e2.message); }
            else successCount++;
          } else { failCount++; console.warn('[SB] pushAll fail:', p.id, error.message); }
        } else successCount++;
      } catch (e) { failCount++; }
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
