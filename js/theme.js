/* ============================================================
   LIBRE TECH - Theme Module (theme.js)
   Tema claro / oscuro, único para toda la tienda.

   Antes cada página repetía su propio script inline: unas enlazaban
   #themeToggle (que no existía), otras enlazaban #btnThemeProfile al mismo
   tiempo que auth.js — dos manejadores que se anulaban entre sí — y el
   botón solo aparecía dentro del menú de usuario, así que un visitante sin
   sesión nunca lo veía. Ahora hay un único botón en la cabecera, presente
   en todas las páginas, y este módulo es el único que lo maneja.

   La preferencia vive en localStorage['libretech_theme'] ('light' | 'dark').
   El <head> de cada página aplica el valor guardado antes de pintar para
   que no haya un parpadeo claro al cargar en modo oscuro.
   ============================================================ */

const Theme = (() => {
  'use strict';

  const KEY = 'libretech_theme';

  /* Botones que alternan el tema en cualquier página de la tienda o del panel */
  const TOGGLE_IDS = ['btnThemeToggle', 'btnThemeProfile', 'adminThemeToggle'];

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function get() {
    return isDark() ? 'dark' : 'light';
  }

  function set(mode) {
    const dark = mode === 'dark';
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');

    try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); }
    catch { /* modo privado: el tema vale solo para esta visita */ }

    syncControls();
    document.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: get() } }));
  }

  function toggle() {
    set(isDark() ? 'light' : 'dark');
  }

  /**
   * Deja los botones coherentes con el tema activo: se ve el sol cuando el
   * tema es claro (pulsar lleva a oscuro) y la luna cuando es oscuro.
   */
  function syncControls() {
    const dark = isDark();
    const label = dark ? 'Tema claro' : 'Tema oscuro';

    document.querySelectorAll('.theme-icon-sun, .admin-sun-icon')
      .forEach(el => { el.style.display = dark ? 'none' : ''; });
    document.querySelectorAll('.theme-icon-moon, .admin-moon-icon')
      .forEach(el => { el.style.display = dark ? '' : 'none'; });

    TOGGLE_IDS.forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('title', label);
      btn.setAttribute('aria-label', label);
    });

    const text = document.getElementById('themeTextProfile');
    if (text) text.textContent = label;
  }

  function bind() {
    TOGGLE_IDS.forEach(id => {
      const btn = document.getElementById(id);
      // dataset evita enlazar dos veces si init() se llama más de una vez
      if (!btn || btn.dataset.themeBound) return;
      btn.dataset.themeBound = '1';
      btn.addEventListener('click', e => {
        e.preventDefault();
        toggle();
      });
    });
    syncControls();
  }

  function init() {
    // El <head> ya aplicó la preferencia guardada; aquí solo se reconcilia
    // por si la página no llevaba ese snippet. Sin preferencia, tema claro.
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch { /* sin acceso */ }

    const wantsDark = saved === 'dark';
    if (wantsDark !== isDark()) {
      if (wantsDark) document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
    }

    bind();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { get, set, toggle, init, bind, syncControls };
})();

/* Compatibilidad: algunas vistas antiguas llamaban a toggleTheme() global */
function toggleTheme() { Theme.toggle(); }
