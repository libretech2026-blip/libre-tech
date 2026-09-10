/* ============================================================
   LIBRE TECH - Gifts Module (gifts.js)
   Obsequios / regalos asociados a un producto.

   Los obsequios se configuran desde el panel de administracion
   (formulario de producto -> "Obsequio incluido") y se persisten en
   site_config.visual_ui.productGifts = { [productId]: "texto" }.
   Se usa site_config en lugar de una columna nueva en `products` para
   no requerir migracion de la base de datos.
   ============================================================ */

const Gifts = (() => {
  'use strict';

  const UI_KEY = 'libretech_visual_ui';

  // El mapa se consulta una vez por tarjeta de producto: se memoriza el
  // parseo y solo se repite si cambió la cadena guardada.
  let _cache = { raw: null, map: {} };

  function getMap() {
    try {
      if (typeof Store !== 'undefined' && Store.getVisualUiConfig) {
        const fromStore = Store.getVisualUiConfig().productGifts;
        if (fromStore && typeof fromStore === 'object') return fromStore;
      }
      const raw = localStorage.getItem(UI_KEY) || '{}';
      if (raw !== _cache.raw) {
        const ui = JSON.parse(raw);
        _cache = { raw, map: ui && typeof ui.productGifts === 'object' && ui.productGifts ? ui.productGifts : {} };
      }
      return _cache.map;
    } catch {
      return {};
    }
  }

  /** Texto del obsequio de un producto, o '' si no tiene. */
  function forProduct(productId) {
    const gift = getMap()[productId];
    return typeof gift === 'string' ? gift.trim() : '';
  }

  function hasGift(productId) {
    return forProduct(productId).length > 0;
  }

  /**
   * Obsequios aplicables a una lista de items del carrito.
   * @param {Array<{productId:string, quantity:number}>} items
   * @returns {Array<{productId:string, name:string, gift:string, quantity:number}>}
   */
  function forItems(items) {
    const products = (typeof Cart !== 'undefined' && Cart.getProducts) ? Cart.getProducts() : [];
    return (items || []).reduce((acc, item) => {
      const gift = forProduct(item.productId);
      if (!gift) return acc;
      const product = products.find(p => p.id === item.productId);
      acc.push({
        productId: item.productId,
        name: product ? product.name : 'Producto',
        gift,
        quantity: item.quantity || 1
      });
      return acc;
    }, []);
  }

  return { getMap, forProduct, hasGift, forItems };
})();
