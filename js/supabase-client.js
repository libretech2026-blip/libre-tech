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
  function toRow(p) {
    return {
      id:            p.id,
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
    if (error) throw error;
    await syncProducts();
    return mapRow(data);
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
    if ('colors'      in updates) partial.colors       = updates.colors;
    if ('specs'       in updates) partial.specs        = updates.specs;
    if ('offerActive' in updates) partial.offer_active = updates.offerActive;
    if ('offerPrice'  in updates) partial.offer_price  = updates.offerPrice;

    const { error } = await client.from('products').update(partial).eq('id', id);
    if (error) throw error;
    await syncProducts();
  }

  async function deleteProduct(id) {
    const { error } = await client.from('products').delete().eq('id', id);
    if (error) throw error;
    await syncProducts();
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
    const adminEmails = ['admin@libretechtienda.com'];
    if (user.email && adminEmails.includes(user.email.toLowerCase())) return true;
    return false;
  }

  function onAuthChange(callback) {
    if (!client) return { data: { subscription: { unsubscribe() {} } } };
    return client.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
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
    onAuthChange
  };
})();
