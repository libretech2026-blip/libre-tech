/* ============================================================
   LIBRE TECH - WhatsApp Bubble (whatsapp-bubble.js)
   Burbuja flotante arrastrable con posición persistente.

   Sustituye a los scripts en línea que había en cada página (index.html
   llegó a tener dos a la vez, con orígenes distintos —uno anclaba por
   `bottom` y el otro por `top`— lo que hacía saltar la burbuja en el
   primer arrastre).

   Claves del comportamiento:
   - El arrastre parte de la posición REAL renderizada (getBoundingClientRect),
     así que nunca da un salto inicial aunque la burbuja esté colocada por CSS.
   - Movimiento sincronizado con requestAnimationFrame para que sea fluido.
   - Un umbral de 5 px separa "clic" de "arrastre": mover no abre WhatsApp.
   ============================================================ */

(() => {
  'use strict';

  const STORAGE_KEY = 'libretech_wa_bubble_pos';
  const DRAG_THRESHOLD = 5; // px antes de considerarlo arrastre
  const MARGIN = 8;         // separación mínima con el borde de la ventana

  function init() {
    const bubble = document.getElementById('whatsappBubble');
    if (!bubble) return;

    let dragging = false;
    let moved = false;
    let pointerId = null;
    let grabX = 0, grabY = 0;      // posición del cursor dentro de la burbuja
    let startX = 0, startY = 0;    // dónde empezó el gesto
    let nextX = 0, nextY = 0;      // destino pendiente de pintar
    let placedX = null, placedY = null; // última posición aplicada por place()
    let frame = null;

    /* --- Posición --- */
    function clamp(x, y) {
      const w = bubble.offsetWidth || 60;
      const h = bubble.offsetHeight || 60;
      return {
        x: Math.max(MARGIN, Math.min(x, window.innerWidth - w - MARGIN)),
        y: Math.max(MARGIN, Math.min(y, window.innerHeight - h - MARGIN))
      };
    }

    /** Fija la burbuja por left/top y libera bottom/right. */
    function place(x, y) {
      const pos = clamp(x, y);
      bubble.style.left = pos.x + 'px';
      bubble.style.top = pos.y + 'px';
      bubble.style.right = 'auto';
      bubble.style.bottom = 'auto';
      placedX = pos.x;
      placedY = pos.y;
      return pos;
    }

    function paint() {
      frame = null;
      place(nextX, nextY);
    }

    function loadPosition() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
          place(saved.x, saved.y);
        }
      } catch {
        // Sin posición guardada: se queda donde la deja el CSS
      }
    }

    /**
     * Guarda la posición aplicada, no la del rect: al arrastrar la burbuja
     * lleva un scale() de feedback y getBoundingClientRect() lo incluye,
     * lo que iría desplazándola unos píxeles en cada arrastre.
     */
    function savePosition() {
      if (placedX === null) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: placedX, y: placedY }));
      } catch {
        // Almacenamiento no disponible: la posición solo dura la sesión
      }
    }

    /* --- Gesto --- */
    function onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return; // solo botón principal

      // Punto de partida = posición real en pantalla, venga de CSS o de un arrastre previo
      const rect = bubble.getBoundingClientRect();
      grabX = e.clientX - rect.left;
      grabY = e.clientY - rect.top;
      startX = e.clientX;
      startY = e.clientY;

      dragging = true;
      moved = false;
      pointerId = e.pointerId;
      bubble.classList.add('dragging');
      bubble.setPointerCapture?.(e.pointerId);
    }

    function onPointerMove(e) {
      if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;

      if (!moved) {
        const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
        if (dist < DRAG_THRESHOLD) return; // aún puede ser un clic
        moved = true;
      }

      e.preventDefault();
      nextX = e.clientX - grabX;
      nextY = e.clientY - grabY;
      if (!frame) frame = requestAnimationFrame(paint);
    }

    function onPointerUp(e) {
      if (!dragging || (pointerId !== null && e.pointerId !== pointerId)) return;

      dragging = false;
      pointerId = null;
      bubble.classList.remove('dragging');
      bubble.releasePointerCapture?.(e.pointerId);

      if (frame) { cancelAnimationFrame(frame); paint(); }
      if (moved) savePosition();
    }

    function openWhatsApp() {
      const biz = window.LIBRETECH || {};
      const number = biz.whatsapp || '573176134822';
      const text = 'Hola, tengo una consulta sobre sus productos';
      window.open('https://wa.me/' + number + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
    }

    bubble.addEventListener('pointerdown', onPointerDown);
    bubble.addEventListener('pointermove', onPointerMove);
    bubble.addEventListener('pointerup', onPointerUp);
    bubble.addEventListener('pointercancel', onPointerUp);

    bubble.addEventListener('click', e => {
      if (moved) { e.preventDefault(); moved = false; return; } // fue un arrastre
      openWhatsApp();
    });

    bubble.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openWhatsApp();
      }
    });

    // Al cambiar el tamaño de la ventana la burbuja podría quedar fuera de vista
    window.addEventListener('resize', () => {
      if (placedX === null) return; // sigue anclada por CSS
      place(placedX, placedY);
    }, { passive: true });

    loadPosition();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
