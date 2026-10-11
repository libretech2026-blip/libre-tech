/**
 * Cloudflare Pages Middleware
 * 1. Redirige libre-tech.pages.dev (y subdominios de *.pages.dev) hacia https://libretechtienda.com con código 301.
 * 2. Redirige www.libretechtienda.com hacia https://libretechtienda.com con código 301.
 * 3. Preserva de manera íntegra y exacta la ruta (pathname) y todos los parámetros de búsqueda (search params como fbclid, utm_*, id, etc.).
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);

  const isPagesDev = url.hostname.endsWith('.pages.dev') || url.hostname === 'libre-tech.pages.dev';
  const isWww = url.hostname === 'www.libretechtienda.com';

  if (isPagesDev || isWww) {
    const destination = `https://libretechtienda.com${url.pathname}${url.search}`;
    return Response.redirect(destination, 301);
  }

  return context.next();
}
