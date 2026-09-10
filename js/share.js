/* ============================================================
   LIBRE TECH - Share Module (share.js)
   Compartir un producto por enlace directo o el catalogo completo.

   - El enlace de producto apunta a producto.html?id=<uuid>, que ya
     renderiza ese producto especifico (product-detail.js).
   - Tambien se aceptan enlaces cortos tipo index.html?product=<uuid>
     o ?p=<uuid>: resolveDeepLink() redirige a la ficha del producto.
   - Usa la Web Share API cuando esta disponible (movil) y cae a un
     modal propio con copiar enlace + redes en escritorio.
   ============================================================ */

const Share = (() => {
  'use strict';

  const BIZ = window.LIBRETECH || {};
  const SITE_NAME = BIZ.siteName || 'LIBRE TECH';

  /* ----------------------------------------------------------
     URLs
  ---------------------------------------------------------- */
  function baseUrl() {
    // Origen + carpeta actual (soporta subdirectorios y file://)
    const { origin, pathname } = window.location;
    const dir = pathname.replace(/[^/]*$/, '');
    if (origin && origin !== 'null') return origin + dir;
    return (BIZ.siteUrl || '') + '/';
  }

  function productUrl(productId) {
    return baseUrl() + 'producto.html?id=' + encodeURIComponent(productId);
  }

  function catalogUrl() {
    return baseUrl() + 'productos.html';
  }

  /* ----------------------------------------------------------
     Deep link: index.html?product=<id> -> producto.html?id=<id>
  ---------------------------------------------------------- */
  function resolveDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('product') || params.get('p');
    if (!id) return false;
    if (/producto\.html$/i.test(window.location.pathname)) return false;
    window.location.replace('producto.html?id=' + encodeURIComponent(id));
    return true;
  }

  /* ----------------------------------------------------------
     Payloads
  ---------------------------------------------------------- */
  function getProduct(productId) {
    const products = (typeof Cart !== 'undefined' && Cart.getProducts) ? Cart.getProducts() : [];
    return products.find(p => p.id === productId) || null;
  }

  function buildProductPayload(productId) {
    const p = getProduct(productId);
    const url = productUrl(productId);
    if (!p) {
      return { title: SITE_NAME, text: 'Mira este producto en ' + SITE_NAME, url };
    }
    const price = (typeof Cart !== 'undefined' && Cart.formatPrice)
      ? Cart.formatPrice(p.offerActive && p.offerPrice ? p.offerPrice : p.price)
      : '';
    return {
      title: p.name + ' | ' + SITE_NAME,
      text: `${p.name}${price ? ' - ' + price : ''}\nDisponible en ${SITE_NAME}:`,
      url,
      image: p.image || ''
    };
  }

  function buildCatalogPayload() {
    return {
      title: SITE_NAME + ' | Catalogo',
      text: `Mira el catalogo de ${SITE_NAME}: tecnologia con envio a todo Colombia.`,
      url: catalogUrl()
    };
  }

  /* ----------------------------------------------------------
     API publica de compartir
  ---------------------------------------------------------- */
  async function shareProduct(productId) {
    if (!productId) return;
    await share(buildProductPayload(productId));
  }

  async function shareCatalog() {
    await share(buildCatalogPayload());
  }

  async function share(payload) {
    // Web Share API (movil / navegadores compatibles)
    if (navigator.share) {
      try {
        await navigator.share({ title: payload.title, text: payload.text, url: payload.url });
        return;
      } catch (err) {
        // AbortError = el usuario cerro el selector: no abrimos el fallback
        if (err && err.name === 'AbortError') return;
      }
    }
    openShareModal(payload);
  }

  /* ----------------------------------------------------------
     Modal fallback
  ---------------------------------------------------------- */
  function ensureModal() {
    let overlay = document.getElementById('shareModal');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'share-modal-overlay';
    overlay.id = 'shareModal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Compartir');
    overlay.innerHTML = `
      <div class="share-modal">
        <div class="share-modal-header">
          <h3 id="shareModalTitle">Compartir</h3>
          <button type="button" class="share-modal-close" id="shareModalClose" aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <p class="share-modal-subtitle" id="shareModalSubtitle"></p>
        <div class="share-options" id="shareOptions"></div>
        <div class="share-link-row">
          <input type="text" class="share-link-input" id="shareLinkInput" readonly aria-label="Enlace para compartir">
          <button type="button" class="share-link-copy" id="shareLinkCopy">Copiar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) closeShareModal(); });
    overlay.querySelector('#shareModalClose').addEventListener('click', closeShareModal);
    overlay.querySelector('#shareLinkCopy').addEventListener('click', () => {
      copyLink(overlay.querySelector('#shareLinkInput').value);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) closeShareModal();
    });

    return overlay;
  }

  function networks(payload) {
    const u = encodeURIComponent(payload.url);
    const t = encodeURIComponent(payload.text + '\n' + payload.url);
    return [
      {
        key: 'whatsapp', label: 'WhatsApp', color: '#25D366',
        href: 'https://api.whatsapp.com/send?text=' + t,
        icon: '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'
      },
      {
        key: 'facebook', label: 'Facebook', color: '#1877F2',
        href: 'https://www.facebook.com/sharer/sharer.php?u=' + u,
        icon: '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/></svg>'
      },
      {
        key: 'telegram', label: 'Telegram', color: '#229ED9',
        href: 'https://t.me/share/url?url=' + u + '&text=' + encodeURIComponent(payload.text),
        icon: '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="M11.94 24c6.6 0 11.95-5.37 11.95-12S18.54 0 11.94 0 0 5.37 0 12s5.35 12 11.94 12zm5.4-16.9-1.9 9.02c-.14.64-.52.8-1.05.5l-2.9-2.15-1.4 1.36c-.16.16-.29.29-.58.29l.2-2.96 5.37-4.87c.24-.2-.05-.32-.36-.12l-6.63 4.2-2.86-.9c-.62-.2-.63-.62.13-.92l11.17-4.34c.52-.19.97.12.8.9z"/></svg>'
      },
      {
        key: 'x', label: 'X', color: '#0f1419',
        href: 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(payload.text) + '&url=' + u,
        icon: '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor"><path d="M18.9 2H22l-7.4 8.46L23 22h-6.5l-5.1-6.66L5.6 22H2.5l7.9-9.04L1.6 2h6.66l4.6 6.09L18.9 2zm-1.14 18.2h1.72L7.4 3.7H5.56L17.76 20.2z"/></svg>'
      },
      {
        key: 'email', label: 'Correo', color: '#6e6e73',
        href: 'mailto:?subject=' + encodeURIComponent(payload.title) + '&body=' + t,
        icon: '<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,6 12,13 2,6"/></svg>'
      }
    ];
  }

  function openShareModal(payload) {
    const overlay = ensureModal();
    overlay.querySelector('#shareModalTitle').textContent = 'Compartir';
    overlay.querySelector('#shareModalSubtitle').textContent = payload.title;
    overlay.querySelector('#shareLinkInput').value = payload.url;

    const options = overlay.querySelector('#shareOptions');
    options.innerHTML = networks(payload).map(n => `
      <a class="share-option" href="${n.href}" target="_blank" rel="noopener noreferrer" style="--share-color:${n.color}" data-network="${n.key}">
        <span class="share-option-icon">${n.icon}</span>
        <span class="share-option-label">${n.label}</span>
      </a>
    `).join('');

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Enfoque accesible tras la animacion de entrada
    setTimeout(() => overlay.querySelector('#shareLinkCopy')?.focus(), 220);
  }

  function closeShareModal() {
    const overlay = document.getElementById('shareModal');
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  async function copyLink(url) {
    const btn = document.getElementById('shareLinkCopy');
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // Fallback para contextos sin clipboard API (http, navegadores viejos)
      const input = document.getElementById('shareLinkInput');
      if (input) {
        input.select();
        input.setSelectionRange(0, 99999);
        try { ok = document.execCommand('copy'); } catch { ok = false; }
      }
    }
    if (btn) {
      btn.textContent = ok ? '¡Copiado!' : 'Copia manual';
      btn.classList.toggle('copied', ok);
      setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('copied'); }, 2000);
    }
    if (ok && typeof Cart !== 'undefined' && Cart.showToast) {
      Cart.showToast('Enlace copiado al portapapeles', 'success');
    }
  }

  /* ----------------------------------------------------------
     Delegacion global: cualquier [data-share] dispara el modal
       data-share="product" data-share-id="<uuid>"
       data-share="catalog"
  ---------------------------------------------------------- */
  function init() {
    document.addEventListener('click', e => {
      const trigger = e.target.closest('[data-share]');
      if (!trigger) return;
      e.preventDefault();
      e.stopPropagation();
      const type = trigger.dataset.share;
      if (type === 'catalog') shareCatalog();
      else if (type === 'product') shareProduct(trigger.dataset.shareId);
    });
  }

  return {
    init,
    share,
    shareProduct,
    shareCatalog,
    productUrl,
    catalogUrl,
    resolveDeepLink,
    closeShareModal
  };
})();

document.addEventListener('DOMContentLoaded', Share.init);
