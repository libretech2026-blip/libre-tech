/* ============================================================
   LIBRE TECH - Shipping Module (shipping.js)
   Calculadora de costo de envio + envio gratis por monto.

   ESTRUCTURA PREPARADA:
   La logica de cotizacion vive por completo en quote(). Hoy resuelve
   con una tabla de zonas configurable desde el panel de administracion
   (Calculadora de envio). Cuando se defina la tarifa real (o se integre
   una transportadora), basta con reemplazar el cuerpo de
   resolveZone()/quote() — el resto de la tienda ya consume el
   resultado a traves de la misma interfaz.

   FORMA DE UNA ZONA:
     { name, departments: ['Atlantico', ...], cities: ['Barranquilla', ...],
       cost: 8000, eta: '1 a 2 dias habiles' }
   Se acepta ademas el formato antiguo { match: 'ciudad1, ciudad2' } para no
   romper configuraciones ya guardadas.
   ============================================================ */

const Shipping = (() => {
  'use strict';

  const UI_KEY = 'libretech_visual_ui';

  const DEFAULTS = {
    // Envio gratis desde este monto (subtotal despues de descuentos)
    freeThreshold: (window.LIBRETECH && window.LIBRETECH.freeShippingThreshold) || 150000,
    // Costo cuando la ciudad no coincide con ninguna zona
    defaultCost: 15000,
    defaultEta: '3 a 5 días hábiles',
    // Gana la primera zona que coincida: ciudad exacta > departamento > texto libre
    zones: [
      {
        name: 'Barranquilla y área metropolitana',
        departments: [],
        cities: ['Barranquilla', 'Soledad', 'Malambo', 'Puerto Colombia', 'Galapa'],
        cost: 8000,
        eta: '1 a 2 días hábiles'
      },
      {
        name: 'Ciudades principales',
        departments: [],
        cities: ['Bogotá D.C.', 'Medellín', 'Cali', 'Cartagena', 'Bucaramanga', 'Santa Marta', 'Pereira', 'Manizales', 'Cúcuta', 'Ibagué'],
        cost: 12000,
        eta: '2 a 4 días hábiles'
      }
    ],
    note: 'El valor del envío es un estimado. Te confirmamos el costo final por WhatsApp antes de despachar.'
  };

  /* --- Configuracion (guardada en site_config.visual_ui.shipping) --- */
  function getConfig() {
    let cfg = null;
    try {
      if (typeof Store !== 'undefined' && Store.getVisualUiConfig) {
        cfg = Store.getVisualUiConfig().shipping;
      }
      if (!cfg) {
        const ui = JSON.parse(localStorage.getItem(UI_KEY) || '{}');
        cfg = ui && ui.shipping;
      }
    } catch { /* usa defaults */ }

    if (!cfg || typeof cfg !== 'object') return { ...DEFAULTS };

    return {
      freeThreshold: Number.isFinite(+cfg.freeThreshold) && +cfg.freeThreshold > 0 ? +cfg.freeThreshold : DEFAULTS.freeThreshold,
      defaultCost: Number.isFinite(+cfg.defaultCost) ? +cfg.defaultCost : DEFAULTS.defaultCost,
      defaultEta: cfg.defaultEta || DEFAULTS.defaultEta,
      zones: Array.isArray(cfg.zones) && cfg.zones.length ? cfg.zones : DEFAULTS.zones,
      note: typeof cfg.note === 'string' ? cfg.note : DEFAULTS.note
    };
  }

  function getFreeThreshold() {
    return getConfig().freeThreshold;
  }

  /* --- Progreso hacia el envio gratis --- */
  function getFreeShippingProgress(subtotal) {
    const threshold = getFreeThreshold();
    const amount = Math.max(0, Number(subtotal) || 0);
    const missing = Math.max(0, threshold - amount);
    return {
      threshold,
      amount,
      missing,
      reached: missing === 0,
      percent: threshold > 0 ? Math.min(100, Math.round((amount / threshold) * 100)) : 100
    };
  }

  /* --- Normalizacion de texto para comparar ciudades --- */
  function normalize(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Zona aplicable a una ubicación.
   * Prioridad: coincidencia por ciudad > por departamento > por texto libre
   * (formato antiguo `match`). Así una tarifa de ciudad siempre gana sobre
   * la tarifa general del departamento al que pertenece.
   */
  function resolveZone(city, department) {
    const cfg = getConfig();
    const nCity = normalize(city);
    const nDept = normalize(department);
    if (!nCity && !nDept) return null;

    const listHas = (list, value) =>
      Array.isArray(list) && value && list.some(item => normalize(item) === value);

    if (nCity) {
      const byCity = cfg.zones.find(z => listHas(z.cities, nCity));
      if (byCity) return byCity;
    }

    if (nDept) {
      const byDept = cfg.zones.find(z => listHas(z.departments, nDept));
      if (byDept) return byDept;
    }

    // La ciudad puede venir escrita a mano o con un calificativo entre
    // paréntesis, p. ej. "bogota" contra "Bogotá D.C." o "Patía (El Bordo)"
    // contra "Patía". Se compara el nombre sin el paréntesis y, si uno es
    // prefijo del otro, solo vale cuando corta en frontera de palabra:
    // con `includes` a secas, "Calima (Darién)" cobraba la tarifa de "Cali".
    const baseName = value => value.replace(/\s*\(.*$/, '').replace(/\s+d\.?\s*c\.?$/, '').trim();

    const looseEquals = (a, b) => {
      if (!a || !b) return false;
      if (a === b) return true;

      const sa = baseName(a);
      const sb = baseName(b);
      if (sa === sb) return true;

      const [longer, shorter] = sa.length >= sb.length ? [sa, sb] : [sb, sa];
      if (!shorter || !longer.startsWith(shorter)) return false;
      return [' ', '.', ',', '-'].includes(longer.charAt(shorter.length));
    };

    const partial = (list, value) =>
      Array.isArray(list) && value && list.some(item => looseEquals(normalize(item), value));

    if (nCity) {
      const byPartial = cfg.zones.find(z => partial(z.cities, nCity));
      if (byPartial) return byPartial;
    }
    if (nDept) {
      const byPartial = cfg.zones.find(z => partial(z.departments, nDept));
      if (byPartial) return byPartial;
    }

    // Compatibilidad con zonas guardadas con el campo de texto `match`
    const haystack = (nCity + ' ' + nDept).trim();
    return cfg.zones.find(zone => {
      const terms = String(zone.match || '').split(',').map(normalize).filter(Boolean);
      return terms.some(term => haystack.includes(term));
    }) || null;
  }

  /**
   * Cotiza el envio.
   * @param {{city?: string, department?: string, subtotal?: number}} params
   * @returns {{free:boolean, cost:number, eta:string, zoneName:string, resolved:boolean, note:string, threshold:number}}
   */
  function quote({ city = '', department = '', subtotal = 0 } = {}) {
    const cfg = getConfig();
    const progress = getFreeShippingProgress(subtotal);
    const zone = resolveZone(city, department);
    const resolved = !!zone || !!normalize(city);

    const baseCost = zone ? Number(zone.cost) || 0 : cfg.defaultCost;
    const eta = zone ? (zone.eta || cfg.defaultEta) : cfg.defaultEta;

    return {
      free: progress.reached,
      cost: progress.reached ? 0 : baseCost,
      baseCost,
      eta,
      zoneName: zone ? zone.name : 'Resto del país',
      resolved,
      note: cfg.note,
      threshold: cfg.freeThreshold
    };
  }

  return {
    getConfig,
    getFreeThreshold,
    getFreeShippingProgress,
    resolveZone,
    quote,
    DEFAULTS
  };
})();
