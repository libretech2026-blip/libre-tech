/**
 * Cloudflare Pages Function: Prerender Open Graph meta tags for /producto?id=<uuid>
 */
import { onRequest as handleProductoHtml } from './producto.html.js';

export async function onRequest(context) {
  return handleProductoHtml(context);
}
