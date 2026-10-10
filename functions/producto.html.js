/**
 * Cloudflare Pages Function: Prerender Open Graph meta tags for social crawlers (WhatsApp, Facebook, Instagram, Twitter)
 * Intercepta peticiones a /producto.html?id=<uuid>, consulta Supabase REST API e inyecta
 * og:title, og:description, og:image y og:url con datos reales del producto en el HTML devuelto.
 */

const SUPABASE_URL = 'https://ouhgtxeufkzbxjwuiosj.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aGd0eGV1Zmt6Ynhqd3Vpb3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzU5MzEsImV4cCI6MjA5MTkxMTkzMX0.fNYEt-LfcH3R4E0oHCRPhvc3Glh73zNJAIB9Njv1L0Q';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  // Si no hay parámetro id, servir el HTML estático tal cual
  if (!id) {
    return context.next();
  }

  // Obtener la respuesta estática base
  const response = await context.next();
  let html = await response.text();

  try {
    // Consultar Supabase REST API para obtener los datos del producto
    const sbEndpoint = `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=id,name,description,image_url,images,price,offer_price,offer_active&limit=1`;
    const sbRes = await fetch(sbEndpoint, {
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`
      }
    });

    if (sbRes.ok) {
      const data = await sbRes.json();
      if (Array.isArray(data) && data.length > 0) {
        const prod = data[0];
        const title = `${prod.name} | Libre Tech`;
        const rawDesc = prod.description ? prod.description.replace(/\s+/g, ' ').trim() : '';
        const desc = `${prod.name} — Cómpralo en Libre Tech con envío a todo Colombia. ${rawDesc}`.substring(0, 160);

        let img = prod.image_url || (prod.images && prod.images[0]) || 'https://libretechtienda.com/nuevos%20logos/JPG/Isotipo/1.jpg';
        if (img && !img.startsWith('http')) {
          img = 'https://libretechtienda.com/' + img.replace(/^\/+/, '');
        }

        const fullUrl = `https://libretechtienda.com/producto.html?id=${encodeURIComponent(id)}`;

        // Reemplazar meta tags dinámicamente en el HTML de salida
        html = html
          .replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
          .replace(/<meta property="og:title" content=".*?"/i, `<meta property="og:title" content="${escapeAttr(title)}"`)
          .replace(/<meta property="og:description" content=".*?"/i, `<meta property="og:description" content="${escapeAttr(desc)}"`)
          .replace(/<meta property="og:url" content=".*?"/i, `<meta property="og:url" content="${escapeAttr(fullUrl)}"`)
          .replace(/<meta property="og:image" content=".*?"/i, `<meta property="og:image" content="${escapeAttr(img)}"`)
          .replace(/<meta property="og:image:secure_url" content=".*?"/i, `<meta property="og:image:secure_url" content="${escapeAttr(img)}"`)
          .replace(/<meta name="twitter:title" content=".*?"/i, `<meta name="twitter:title" content="${escapeAttr(title)}"`)
          .replace(/<meta name="twitter:description" content=".*?"/i, `<meta name="twitter:description" content="${escapeAttr(desc)}"`)
          .replace(/<meta name="twitter:image" content=".*?"/i, `<meta name="twitter:image" content="${escapeAttr(img)}"`)
          .replace(/<meta name="description" content=".*?"/i, `<meta name="description" content="${escapeAttr(desc)}"`);
      }
    }
  } catch (err) {
    // Si hay algún fallo con el backend de Supabase, retornar el HTML original sin romper la petición
  }

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
