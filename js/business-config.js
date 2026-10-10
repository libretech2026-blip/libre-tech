/* ============================================================
   LIBRE TECH - Business Config (business-config.js)
   Fuente unica de verdad para los datos de contacto del negocio.
   Debe cargarse ANTES que el resto de los modulos JS.
   ============================================================ */

window.LIBRETECH = Object.freeze({
  /* --- Contacto --- */
  // Numero de WhatsApp en formato internacional (sin + ni espacios)
  whatsapp: '573176134822',
  // Como se muestra al usuario
  whatsappDisplay: '+57 317 613 4822',
  // Correo del negocio
  email: 'libretechtienda@gmail.com',

  /* --- Sitio --- */
  siteName: 'LIBRE TECH',
  siteUrl: 'https://libretechtienda.com',

  /* --- Envio --- */
  // Compras iguales o superiores a este monto tienen envio gratis
  freeShippingThreshold: 150000,

  /* --- Helpers --- */
  waLink(text) {
    const base = 'https://wa.me/' + this.whatsapp;
    return text ? base + '?text=' + encodeURIComponent(text) : base;
  }
});

/* --- Meta Pixel Helper --- */
function trackPixel(evento, datos) {
  if (typeof fbq !== 'function') return;
  const eventID = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  try {
    fbq('track', evento, datos || {}, { eventID });
  } catch (err) {
    console.warn('[Pixel] Error al registrar evento ' + evento + ':', err);
  }
}
window.trackPixel = trackPixel;

// 4) Contact: Al tocar enlaces de WhatsApp en el sitio
if (typeof document !== 'undefined') {
  document.addEventListener('click', function(e) {
    const waLink = e.target.closest && e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
    if (waLink) {
      window.trackPixel('Contact', {});
    }
  }, true);
}
