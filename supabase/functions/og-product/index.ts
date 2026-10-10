import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://ouhgtxeufkzbxjwuiosj.supabase.co';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91aGd0eGV1Zmt6Ynhqd3Vpb3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzU5MzEsImV4cCI6MjA5MTkxMTkzMX0.fNYEt-LfcH3R4E0oHCRPhvc3Glh73zNJAIB9Njv1L0Q';

serve(async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response('Missing id parameter', { status: 400 });
  }

  try {
    const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}&select=id,name,description,image_url,images,price&limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`
      }
    });

    const data = await sbRes.json();
    if (!Array.isArray(data) || data.length === 0) {
      return new Response('Product not found', { status: 404 });
    }

    const prod = data[0];
    const title = `${prod.name} | Libre Tech`;
    const desc = `${prod.name} — Cómpralo en Libre Tech con envío a todo Colombia. ${(prod.description || '').replace(/\s+/g, ' ').trim()}`.substring(0, 160);
    let img = prod.image_url || (prod.images && prod.images[0]) || 'https://libretechtienda.com/nuevos%20logos/JPG/Isotipo/1.jpg';
    if (img && !img.startsWith('http')) {
      img = 'https://libretechtienda.com/' + img.replace(/^\/+/, '');
    }
    const prodUrl = `https://libretechtienda.com/producto.html?id=${encodeURIComponent(id)}`;

    // Devolver HTML con los metatags prerenderizados para los bots
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <meta property="og:type" content="product">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${prodUrl}">
  <meta property="og:image" content="${img}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="1200">
  <meta property="og:site_name" content="Libre Tech">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <meta name="twitter:image" content="${img}">
  <meta http-equiv="refresh" content="0;url=${prodUrl}">
</head>
<body>
  <p>Redirigiendo a <a href="${prodUrl}">${title}</a>...</p>
</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (e) {
    return new Response('Error: ' + e.message, { status: 500 });
  }
});
