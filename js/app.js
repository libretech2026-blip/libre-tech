/* ============================================================
   LIBRE TECH - Store App (app.js)
   Renderizado de productos, búsqueda, filtros, carrusel, ratings
   ============================================================ */

const Store = (() => {
  'use strict';

  const PRODUCTS_KEY = 'libretech_products';
  const RATINGS_KEY  = 'libretech_ratings';
  const WISHLIST_KEY = 'libretech_wishlist';
  const SOCIAL_KEY   = 'libretech_social_links';

  // Productos reales del inventario
  const SEED_PRODUCTS = [
    { id:'p01', name:'Cargador 25W USB-C a Lightning', price:35000, description:'Cargador rápido de 25W con cable USB-C a Lightning integrado. Compatible con iPhone 8 en adelante.', category:'Cargadores', brand:'Genérico', image:'img/products/p01.svg', stock:4, active:true, featured:true, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Potencia',value:'25W'},{key:'Entrada',value:'USB-C'},{key:'Salida',value:'Lightning'},{key:'Carga rápida',value:'Sí'}] },
    { id:'p02', name:'Cargador 35W USB-C a USB-C', price:40000, description:'Cargador de 35W con cable USB-C a USB-C. Ideal para smartphones y tablets con puerto Type-C.', category:'Cargadores', brand:'Genérico', image:'img/products/p02.svg', stock:3, active:true, featured:true, createdAt:'2026-04-01', colors:['Blanco','Negro'], specs:[{key:'Potencia',value:'35W'},{key:'Conexión',value:'USB-C a USB-C'},{key:'Carga rápida',value:'Sí'}] },
    { id:'p03', name:'Adaptador USB-C 20W', price:18000, description:'Adaptador de carga rápida USB-C de 20W. Compatible con iPhone y Android.', category:'Adaptadores', brand:'Genérico', image:'img/products/p03.svg', stock:5, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Potencia',value:'20W'},{key:'Puerto',value:'USB-C'},{key:'Carga rápida',value:'PD 3.0'}] },
    { id:'p04', name:'Adaptador USB-C 20W Original', price:45000, description:'Adaptador de carga original Apple de 20W USB-C. Carga rápida para iPhone y iPad.', category:'Adaptadores', brand:'Apple', image:'img/products/p04_apple_20w.jpg', stock:1, active:true, featured:true, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Potencia',value:'20W'},{key:'Puerto',value:'USB-C'},{key:'Certificación',value:'Apple Original'},{key:'Carga rápida',value:'PD'}] },
    { id:'p05', name:'Adaptador 5W', price:10000, description:'Adaptador de carga estándar de 5W con puerto USB-A. Compatible universal.', category:'Adaptadores', brand:'Genérico', image:'img/products/p05.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Potencia',value:'5W'},{key:'Puerto',value:'USB-A'}] },
    { id:'p06', name:'Adaptador 30W USB-C', price:25000, description:'Adaptador de carga rápida de 30W con puerto USB-C. Ideal para dispositivos de carga rápida.', category:'Adaptadores', brand:'Genérico', image:'img/products/p06.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Potencia',value:'30W'},{key:'Puerto',value:'USB-C'},{key:'Carga rápida',value:'PD'}] },
    { id:'p07', name:'Cable Lightning a USB (1m)', price:15000, description:'Cable Lightning a USB de 1 metro. Compatible con iPhone, iPad y iPod.', category:'Cables', brand:'Genérico', image:'img/products/p07.svg', stock:4, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Longitud',value:'1 metro'},{key:'Conector',value:'Lightning a USB-A'}] },
    { id:'p08', name:'Cable USB-C a Lightning', price:20000, description:'Cable USB-C a Lightning para carga rápida. Compatible con iPhone 8 en adelante.', category:'Cables', brand:'Genérico', image:'img/products/p08.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Longitud',value:'1 metro'},{key:'Conector',value:'USB-C a Lightning'},{key:'Carga rápida',value:'Sí'}] },
    { id:'p09', name:'Audífonos iPhone Lightning', price:12000, description:'Audífonos con cable y conector Lightning. Sonido nítido, micrófono integrado y control de volumen.', category:'Audio', brand:'Genérico', image:'img/products/p09.svg', stock:9, active:true, featured:true, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Conector',value:'Lightning'},{key:'Micrófono',value:'Sí'},{key:'Control',value:'Volumen y llamadas'}] },
    { id:'p10', name:'Audífonos iPhone USB-C', price:15000, description:'Audífonos con cable y conector USB-C. Compatible con iPhone 15 y dispositivos USB-C.', category:'Audio', brand:'Genérico', image:'img/products/p10.svg', stock:5, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Conector',value:'USB-C'},{key:'Micrófono',value:'Sí'},{key:'Control',value:'Volumen y llamadas'}] },
    { id:'p11', name:'Wallets Tarjeteros', price:25000, description:'Tarjetero magnético MagSafe para iPhone. Guarda tus tarjetas en la parte trasera del celular.', category:'Accesorios', brand:'Genérico', image:'img/products/p11.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro','Café'], specs:[{key:'Tipo',value:'Tarjetero magnético'},{key:'Capacidad',value:'Hasta 3 tarjetas'},{key:'Compatibilidad',value:'MagSafe'}] },
    { id:'p12', name:'Audífonos Serie 4', price:85000, description:'Audífonos inalámbricos tipo AirPods Serie 4. Diseño compacto, buena calidad de sonido y estuche de carga.', category:'Audio', brand:'Genérico', image:'img/products/p12.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Tipo',value:'In-ear TWS'},{key:'Bluetooth',value:'5.3'},{key:'Batería',value:'Hasta 5 horas'}] },
    { id:'p13', name:'Audífonos Serie 3', price:55000, description:'Audífonos inalámbricos tipo AirPods Serie 3. Diseño ergonómico con estuche de carga.', category:'Audio', brand:'Genérico', image:'img/products/p13.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Tipo',value:'In-ear TWS'},{key:'Bluetooth',value:'5.0'},{key:'Batería',value:'Hasta 4 horas'}] },
    { id:'p14', name:'Audífonos Pro 2', price:120000, description:'Audífonos inalámbricos tipo AirPods Pro 2. Cancelación de ruido activa, sonido premium y estuche con carga.', category:'Audio', brand:'Genérico', image:'img/products/p14_pro2.jpg', stock:2, active:true, featured:true, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Tipo',value:'In-ear TWS'},{key:'ANC',value:'Cancelación activa'},{key:'Bluetooth',value:'5.3'},{key:'Batería',value:'Hasta 6 horas'},{key:'Resistencia',value:'IPX4'}] },
    { id:'p15', name:'Audífonos Serie 1', price:35000, description:'Audífonos inalámbricos tipo AirPods Serie 1. Entrada económica al mundo TWS.', category:'Audio', brand:'Genérico', image:'img/products/p15.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Tipo',value:'In-ear TWS'},{key:'Bluetooth',value:'5.0'},{key:'Batería',value:'Hasta 3 horas'}] },
    { id:'p16', name:'Diadema P9', price:45000, description:'Diadema inalámbrica Bluetooth P9 con almohadillas acolchadas, sonido envolvente y micrófono integrado.', category:'Audio', brand:'Genérico', image:'img/products/p16.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro','Blanco','Azul','Rosa'], specs:[{key:'Tipo',value:'Over-ear'},{key:'Bluetooth',value:'5.1'},{key:'Batería',value:'Hasta 8 horas'},{key:'Micrófono',value:'Sí'}] },
    { id:'p17', name:'Diadema Airmax Pequeña', price:55000, description:'Diadema tipo AirPods Max tamaño compacto. Diseño premium con almohadillas suaves.', category:'Audio', brand:'Genérico', image:'img/products/p17.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro','Plateado'], specs:[{key:'Tipo',value:'Over-ear compacto'},{key:'Bluetooth',value:'5.2'},{key:'Batería',value:'Hasta 10 horas'}] },
    { id:'p18', name:'Diadema Airmax Grande', price:75000, description:'Diadema tipo AirPods Max tamaño grande. Sonido Hi-Fi, cancelación de ruido y diseño premium.', category:'Audio', brand:'Genérico', image:'img/products/p18.svg', stock:1, active:true, featured:true, createdAt:'2026-04-01', colors:['Negro','Plateado','Azul'], specs:[{key:'Tipo',value:'Over-ear'},{key:'Bluetooth',value:'5.2'},{key:'ANC',value:'Cancelación activa'},{key:'Batería',value:'Hasta 20 horas'}] },
    { id:'p19', name:'Reloj Möbula Mini', price:65000, description:'Reloj inteligente Möbula Mini con pantalla táctil, monitor cardíaco, notificaciones y resistencia al agua.', category:'Wearables', brand:'Möbula', image:'img/products/p19.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro','Rosa'], specs:[{key:'Pantalla',value:'Táctil AMOLED'},{key:'Sensores',value:'Ritmo cardíaco, SpO2'},{key:'Resistencia',value:'IP68'},{key:'Batería',value:'Hasta 7 días'}] },
    { id:'p20', name:'Micrófono SX31 Tipo C', price:30000, description:'Micrófono de solapa inalámbrico SX31 con conector USB-C. Ideal para grabación y streaming.', category:'Accesorios', brand:'Genérico', image:'img/products/p20.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Tipo',value:'Lavalier inalámbrico'},{key:'Conector',value:'USB-C'},{key:'Alcance',value:'Hasta 10m'}] },
    { id:'p21', name:'Adaptador Lightning a Jack', price:12000, description:'Adaptador de Lightning a Jack 3.5mm. Conecta tus audífonos con cable a tu iPhone.', category:'Adaptadores', brand:'Genérico', image:'img/products/p21.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Entrada',value:'Lightning'},{key:'Salida',value:'Jack 3.5mm'}] },
    { id:'p22', name:'Audífonos M10', price:28000, description:'Audífonos inalámbricos M10 TWS con estuche de carga LED, sonido estéreo HD y diseño deportivo.', category:'Audio', brand:'Genérico', image:'img/products/p22.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Tipo',value:'In-ear TWS'},{key:'Bluetooth',value:'5.1'},{key:'Batería',value:'Hasta 4 horas'},{key:'Estuche',value:'Con pantalla LED'}] },
    { id:'p23', name:'Power Bank 22.5W', price:55000, description:'Batería externa portátil con carga rápida de 22.5W, pantalla LED indicadora y doble puerto USB.', category:'Power Banks', brand:'Genérico', image:'img/products/p23.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro','Blanco'], specs:[{key:'Capacidad',value:'10000mAh'},{key:'Carga rápida',value:'22.5W'},{key:'Puertos',value:'USB-A + USB-C'},{key:'Pantalla',value:'LED indicadora'}] },
    { id:'p24', name:'Power Bank 120W', price:95000, description:'Power Bank de alta potencia 120W con carga ultra rápida. Ideal para laptops y smartphones.', category:'Power Banks', brand:'Genérico', image:'img/products/p24.svg', stock:1, active:true, featured:true, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Capacidad',value:'20000mAh'},{key:'Carga rápida',value:'120W'},{key:'Puertos',value:'USB-A + USB-C PD'},{key:'Pantalla',value:'Digital'}] },
    { id:'p25', name:'Máquina Vintage Patillera', price:50000, description:'Máquina cortadora de cabello y patillera estilo vintage. Cuchillas de precisión y diseño retro.', category:'Belleza', brand:'Genérico', image:'img/products/p25.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Dorado'], specs:[{key:'Tipo',value:'Patillera'},{key:'Alimentación',value:'Recargable'},{key:'Cuchillas',value:'Acero inoxidable'}] },
    { id:'p26', name:'Paneles de Luz', price:35000, description:'Paneles de luz LED modulares hexagonales táctiles. Decoración gaming y ambientación RGB.', category:'Iluminación', brand:'Genérico', image:'img/products/p26.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Único'], specs:[{key:'Tipo',value:'Hexagonal modular'},{key:'Iluminación',value:'RGB 16 colores'},{key:'Control',value:'Táctil'}] },
    { id:'p27', name:'Soporte Celular Carro', price:20000, description:'Soporte magnético para celular de carro. Montaje en rejilla de ventilación con rotación 360°.', category:'Accesorios', brand:'Genérico', image:'img/products/p27.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Tipo',value:'Magnético'},{key:'Montaje',value:'Rejilla ventilación'},{key:'Rotación',value:'360°'}] },
    { id:'p28', name:'Audífonos Cable Bolsa', price:8000, description:'Audífonos con cable tipo bolsa con micrófono integrado. Universales con jack 3.5mm.', category:'Audio', brand:'Genérico', image:'img/products/p28.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro','Blanco'], specs:[{key:'Conector',value:'Jack 3.5mm'},{key:'Micrófono',value:'Sí'}] },
    { id:'p29', name:'Audífonos GTA Cable', price:10000, description:'Audífonos con cable marca GTA. Sonido claro con micrófono y control en línea.', category:'Audio', brand:'GTA', image:'img/products/p29.svg', stock:3, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Conector',value:'Jack 3.5mm'},{key:'Micrófono',value:'Sí'},{key:'Control',value:'En línea'}] },
    { id:'p30', name:'Audífonos JBL Cable', price:18000, description:'Audífonos con cable JBL. Sonido potente de graves profundos con micrófono integrado.', category:'Audio', brand:'JBL', image:'img/products/p30.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Marca',value:'JBL'},{key:'Conector',value:'Jack 3.5mm'},{key:'Micrófono',value:'Sí'},{key:'Driver',value:'8.6mm'}] },
    { id:'p31', name:'Cable USB TV', price:12000, description:'Cable USB para Smart TV. Conexión y alimentación de dispositivos por puerto USB.', category:'Cables', brand:'Genérico', image:'img/products/p31.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Conector',value:'USB-A'},{key:'Longitud',value:'1.5m'}] },
    { id:'p32', name:'Audífonos Inalámbricos Sport', price:35000, description:'Audífonos inalámbricos deportivos con ganchos para oreja, resistentes al sudor IPX5.', category:'Audio', brand:'Genérico', image:'img/products/p32.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro','Rojo'], specs:[{key:'Tipo',value:'In-ear deportivos'},{key:'Bluetooth',value:'5.0'},{key:'Resistencia',value:'IPX5'},{key:'Batería',value:'Hasta 6 horas'}] },
    { id:'p33', name:'Topos de Puntilla', price:8000, description:'Topos/aretes de puntilla para mujer. Diseño elegante tipo diamante.', category:'Accesorios', brand:'Genérico', image:'img/products/p33.svg', stock:3, active:true, featured:false, createdAt:'2026-04-01', colors:['Plateado','Dorado'], specs:[{key:'Material',value:'Acero inoxidable'},{key:'Tipo',value:'Topos puntilla'}] },
    { id:'p34', name:'Audífonos Extra Bass Cable', price:15000, description:'Audífonos con cable Extra Bass. Graves potentes con aislamiento de ruido pasivo.', category:'Audio', brand:'Genérico', image:'img/products/p34.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Conector',value:'Jack 3.5mm'},{key:'Tipo',value:'In-ear Extra Bass'},{key:'Micrófono',value:'Sí'}] },
    { id:'p35', name:'Parlante Magnético', price:40000, description:'Parlante portátil con base magnética. Sonido 360° con graves profundos y conexión Bluetooth.', category:'Audio', brand:'Genérico', image:'img/products/p35.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Tipo',value:'Portátil magnético'},{key:'Bluetooth',value:'5.0'},{key:'Batería',value:'Hasta 6 horas'}] },
    { id:'p36', name:'Audífonos Cable Fivemax', price:12000, description:'Audífonos con cable marca Fivemax. Sonido balanceado con micrófono integrado.', category:'Audio', brand:'Fivemax', image:'img/products/p36.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Conector',value:'Jack 3.5mm'},{key:'Micrófono',value:'Sí'}] },
    { id:'p37', name:'Audífonos AKG Samsung', price:22000, description:'Audífonos AKG originales Samsung con cable USB-C. Sonido tuneado por AKG con graves equilibrados.', category:'Audio', brand:'Samsung', image:'img/products/p37.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Marca',value:'AKG / Samsung'},{key:'Conector',value:'USB-C'},{key:'Micrófono',value:'Sí'},{key:'Driver',value:'Dinámico de 2 vías'}] },
    { id:'p38', name:'Cargador Moto Edge 67W', price:65000, description:'Cargador original Motorola de 67W TurboPower. Compatible con Moto Edge y dispositivos con carga rápida.', category:'Cargadores', brand:'Motorola', image:'img/products/p38.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Potencia',value:'67W'},{key:'Tecnología',value:'TurboPower'},{key:'Puerto',value:'USB-C'},{key:'Marca',value:'Motorola'}] },
    { id:'p39', name:'Cargador Motorola 30W', price:40000, description:'Cargador Motorola TurboPower de 30W. Carga rápida para dispositivos Motorola y compatibles.', category:'Cargadores', brand:'Motorola', image:'img/products/p39.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Potencia',value:'30W'},{key:'Tecnología',value:'TurboPower'},{key:'Puerto',value:'USB-C'}] },
    { id:'p40', name:'Cargador GTA 206', price:20000, description:'Cargador dual GTA modelo 206. Dos puertos USB para carga simultánea de dispositivos.', category:'Cargadores', brand:'GTA', image:'img/products/p40.svg', stock:3, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Modelo',value:'GTA 206'},{key:'Puertos',value:'2x USB-A'},{key:'Potencia',value:'12W'}] },
    { id:'p41', name:'Cargador GTA 207', price:22000, description:'Cargador GTA modelo 207 con puerto USB-C. Carga estándar con diseño compacto.', category:'Cargadores', brand:'GTA', image:'img/products/p41.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Modelo',value:'GTA 207'},{key:'Puerto',value:'USB-C + USB-A'}] },
    { id:'p42', name:'Cargador GTA 201', price:18000, description:'Cargador GTA modelo 201 básico con puerto USB. Carga estándar para cualquier dispositivo.', category:'Cargadores', brand:'GTA', image:'img/products/p42.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Modelo',value:'GTA 201'},{key:'Puerto',value:'USB-A'}] },
    { id:'p43', name:'Cargador GTA 205', price:20000, description:'Cargador GTA modelo 205 con carga rápida. Puerto USB-A con salida optimizada.', category:'Cargadores', brand:'GTA', image:'img/products/p43.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Modelo',value:'GTA 205'},{key:'Puerto',value:'USB-A'},{key:'Carga rápida',value:'QC 3.0'}] },
    { id:'p44', name:'Cargador Samsung 45W', price:55000, description:'Cargador original Samsung de 45W Super Fast Charging. Compatible con Galaxy S y Note series.', category:'Cargadores', brand:'Samsung', image:'img/products/p44.svg', stock:4, active:true, featured:true, createdAt:'2026-04-01', colors:['Negro','Blanco'], specs:[{key:'Potencia',value:'45W'},{key:'Tecnología',value:'Super Fast Charging 2.0'},{key:'Puerto',value:'USB-C'},{key:'Marca',value:'Samsung Original'},{key:'Compatibilidad',value:'Galaxy S23/S24/S25 series'}] },
    { id:'p45', name:'Cargador Xiaomi 67W', price:50000, description:'Cargador original Xiaomi de 67W Turbo Charge. Carga completa en menos de 40 minutos.', category:'Cargadores', brand:'Xiaomi', image:'img/products/p45.svg', stock:3, active:true, featured:true, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Potencia',value:'67W'},{key:'Tecnología',value:'Turbo Charge'},{key:'Puerto',value:'USB-C'},{key:'Marca',value:'Xiaomi Original'}] },
    { id:'p46', name:'Cargador Xiaomi 33W', price:35000, description:'Cargador original Xiaomi de 33W. Carga rápida compatible con la línea Redmi y Mi.', category:'Cargadores', brand:'Xiaomi', image:'img/products/p46.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Potencia',value:'33W'},{key:'Puerto',value:'USB-C'},{key:'Marca',value:'Xiaomi Original'}] },
    { id:'p47', name:'Adaptador 25W Samsung', price:30000, description:'Adaptador de carga rápida Samsung de 25W. Super Fast Charging compatible.', category:'Adaptadores', brand:'Samsung', image:'img/products/p47.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro','Blanco'], specs:[{key:'Potencia',value:'25W'},{key:'Puerto',value:'USB-C'},{key:'Tecnología',value:'Super Fast Charging'}] },
    { id:'p48', name:'Adaptador 45W Samsung', price:48000, description:'Adaptador de carga ultra rápida Samsung de 45W. Carga completa en tiempo récord.', category:'Adaptadores', brand:'Samsung', image:'img/products/p48.svg', stock:3, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro','Blanco'], specs:[{key:'Potencia',value:'45W'},{key:'Puerto',value:'USB-C'},{key:'Tecnología',value:'Super Fast Charging 2.0'}] },
    { id:'p49', name:'Adaptador 203 GTA', price:15000, description:'Adaptador GTA modelo 203 con puerto USB-A. Carga básica para cualquier dispositivo.', category:'Adaptadores', brand:'GTA', image:'img/products/p49.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Modelo',value:'GTA 203'},{key:'Puerto',value:'USB-A'}] },
    { id:'p50', name:'Cable Tipo C Samsung', price:18000, description:'Cable USB-C original Samsung. Alta calidad con transferencia de datos y carga rápida.', category:'Cables', brand:'Samsung', image:'img/products/p50.svg', stock:3, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro','Blanco'], specs:[{key:'Conector',value:'USB-C a USB-C'},{key:'Longitud',value:'1 metro'},{key:'Marca',value:'Samsung Original'}] },
    { id:'p51', name:'Cable Tipo C a Tipo C 4Play', price:15000, description:'Cable USB-C a USB-C marca 4Play. Resistente con transferencia de datos y carga.', category:'Cables', brand:'4Play', image:'img/products/p51.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Conector',value:'USB-C a USB-C'},{key:'Longitud',value:'1 metro'}] },
    { id:'p52', name:'Cable USB a Tipo C 4Play', price:12000, description:'Cable USB-A a USB-C marca 4Play. Compatible con cargadores y computadores USB-A.', category:'Cables', brand:'4Play', image:'img/products/p52.svg', stock:3, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Conector',value:'USB-A a USB-C'},{key:'Longitud',value:'1 metro'}] },
    { id:'p53', name:'Cable Tipo C a Tipo C GTA 502', price:14000, description:'Cable USB-C a USB-C GTA modelo 502. Cable reforzado para carga y datos.', category:'Cables', brand:'GTA', image:'img/products/p53.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Modelo',value:'GTA 502'},{key:'Conector',value:'USB-C a USB-C'}] },
    { id:'p54', name:'Cable USB V8 GTA 501', price:10000, description:'Cable USB a Micro USB (V8) GTA modelo 501. Compatible con dispositivos con puerto micro USB.', category:'Cables', brand:'GTA', image:'img/products/p54.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Modelo',value:'GTA 501'},{key:'Conector',value:'USB-A a Micro USB'}] },
    { id:'p55', name:'Cable USB a Tipo C GTA 506', price:14000, description:'Cable USB-A a USB-C GTA modelo 506. Cable resistente para carga diaria.', category:'Cables', brand:'GTA', image:'img/products/p55.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Modelo',value:'GTA 506'},{key:'Conector',value:'USB-A a USB-C'}] },
    { id:'p56', name:'Cable USB a Tipo C GTA 504', price:14000, description:'Cable USB-A a USB-C GTA modelo 504. Diseño compacto y resistente.', category:'Cables', brand:'GTA', image:'img/products/p56.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Modelo',value:'GTA 504'},{key:'Conector',value:'USB-A a USB-C'}] },
    { id:'p57', name:'Cable HAVIT USB a Tipo C', price:16000, description:'Cable USB-A a USB-C marca HAVIT. Cable trenzado de nylon de alta durabilidad.', category:'Cables', brand:'HAVIT', image:'img/products/p57.svg', stock:6, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Marca',value:'HAVIT'},{key:'Conector',value:'USB-A a USB-C'},{key:'Material',value:'Nylon trenzado'}] },
    { id:'p58', name:'Adaptador Puntilla a Tipo C', price:8000, description:'Adaptador de Jack 3.5mm (puntilla) a USB-C. Conecta audífonos con cable a tu teléfono USB-C.', category:'Adaptadores', brand:'Genérico', image:'img/products/p58.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Entrada',value:'Jack 3.5mm'},{key:'Salida',value:'USB-C'}] },
    { id:'p59', name:'Adaptador USB a Micro a Tipo C', price:6000, description:'Adaptador 3 en 1: USB, Micro USB y Tipo C. Convierte entre distintos tipos de conexión.', category:'Adaptadores', brand:'Genérico', image:'img/products/p59.svg', stock:3, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Tipo',value:'Adaptador multi-conector'},{key:'Conectores',value:'USB-A, Micro USB, USB-C'}] },
    { id:'p60', name:'Cable USB a Tipo C Motorola', price:18000, description:'Cable USB-A a USB-C original Motorola. Compatible con carga TurboPower.', category:'Cables', brand:'Motorola', image:'img/products/p60.svg', stock:2, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Marca',value:'Motorola'},{key:'Conector',value:'USB-A a USB-C'},{key:'Carga rápida',value:'TurboPower'}] },
    { id:'p61', name:'Cable USB a Tipo C HARVIC', price:14000, description:'Cable USB-A a USB-C marca HARVIC. Cable reforzado con carga rápida.', category:'Cables', brand:'HARVIC', image:'img/products/p61.svg', stock:3, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Marca',value:'HARVIC'},{key:'Conector',value:'USB-A a USB-C'}] },
    { id:'p62', name:'Cargador Reloj Inteligente', price:20000, description:'Cargador magnético universal para relojes inteligentes. Compatible con múltiples marcas.', category:'Accesorios', brand:'Genérico', image:'img/products/p62.svg', stock:3, active:true, featured:false, createdAt:'2026-04-01', colors:['Blanco'], specs:[{key:'Tipo',value:'Magnético'},{key:'Compatibilidad',value:'Universal smartwatch'}] },
    { id:'p63', name:'Cable HARVIC Tipo C', price:16000, description:'Cable USB-C a USB-C marca HARVIC. Para carga rápida y transferencia de datos.', category:'Cables', brand:'HARVIC', image:'img/products/p63.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Marca',value:'HARVIC'},{key:'Conector',value:'USB-C a USB-C'}] },
    { id:'p64', name:'Cable HARVIC USB a V8', price:12000, description:'Cable USB-A a Micro USB marca HARVIC. Compatible con dispositivos Micro USB.', category:'Cables', brand:'HARVIC', image:'img/products/p64.svg', stock:4, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Marca',value:'HARVIC'},{key:'Conector',value:'USB-A a Micro USB'}] },
    { id:'p65', name:'Audífonos Xiaomi Buds 4 Lite', price:85000, description:'Audífonos inalámbricos Xiaomi Buds 4 Lite. Sonido Hi-Fi, cancelación de ruido y diseño ultraligero.', category:'Audio', brand:'Xiaomi', image:'img/products/p65.svg', stock:2, active:true, featured:true, createdAt:'2026-04-01', colors:['Blanco','Negro'], specs:[{key:'Marca',value:'Xiaomi'},{key:'Tipo',value:'In-ear TWS'},{key:'Bluetooth',value:'5.3'},{key:'ANC',value:'Cancelación de ruido IA'},{key:'Batería',value:'Hasta 5.5 horas'},{key:'Resistencia',value:'IP54'}] },
    { id:'p66', name:'Micrófono K8 GT', price:35000, description:'Micrófono de solapa inalámbrico K8 GT con receptor compacto. Ideal para TikTok, YouTube y grabaciones.', category:'Accesorios', brand:'Genérico', image:'img/products/p66.svg', stock:1, active:true, featured:false, createdAt:'2026-04-01', colors:['Negro'], specs:[{key:'Tipo',value:'Lavalier inalámbrico'},{key:'Alcance',value:'Hasta 15m'},{key:'Compatibilidad',value:'USB-C / Lightning'},{key:'Batería',value:'Hasta 6 horas'}] }
  ];

  let currentCategory = 'all';
  let currentBrand = 'all';
  let searchQuery = '';
  let showAll = false;
  let carouselInterval = null;
  let carouselIndex = 0;

  // --- Inicialización ---
  function init() {
    seedProducts();
    seedReviews();
    renderCategories();
    renderFeaturedProducts();
    renderTopCategories();
    renderPromoBanners();
    initHeroCarousel();
    bindEvents();
    initHeaderScroll();
    updateHeroStats();
    updateWishlistBadge();
    renderSocialLinks();
    renderPromoPhotoBanners();
  }

  function updateHeroStats() {
    const el = document.getElementById('heroProductCount');
    if (el) {
      const count = getActiveProducts().length;
      el.textContent = count + '+';
    }
  }

  // --- Sembrar productos iniciales ---
  function seedProducts() {
    try {
      const existing = localStorage.getItem(PRODUCTS_KEY);
      const parsed = existing ? JSON.parse(existing) : [];
      // Replace if empty, has old prod-XXX IDs, or missing images
      const needsReseed = !existing || parsed.length === 0
        || (parsed[0] && parsed[0].id && parsed[0].id.startsWith('prod-'))
        || (parsed.length > 0 && parsed.filter(p => !p.image).length > 5);
      if (needsReseed) {
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(SEED_PRODUCTS));
      }
    } catch {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(SEED_PRODUCTS));
    }
  }

  // --- Sembrar reseñas de ejemplo con nombres reales ---
  function seedReviews() {
    try {
      const existing = localStorage.getItem(RATINGS_KEY);
      if (existing) {
        const parsed = JSON.parse(existing);
        // If old prod-XXX keys exist, clear and re-seed
        const keys = Object.keys(parsed);
        if (keys.length > 0 && keys[0].startsWith('prod-')) {
          localStorage.removeItem(RATINGS_KEY);
          localStorage.removeItem('libretech_reviews');
        } else {
          return; // Already seeded with new product IDs
        }
      }
    } catch { /* continue */ }

    const REVIEWS = {
      'p01': [
        {star:5,name:'Carlos Mendoza',comment:'Carga super rápido mi iPhone, excelente calidad.'},
        {star:4,name:'Laura Gómez',comment:'Buen cargador, cumple su función perfectamente.'},
        {star:5,name:'Andrés Ríos',comment:'Lo mejor que he comprado, carga completa en menos de 1 hora.'}
      ],
      'p02': [
        {star:5,name:'María Fernanda López',comment:'Potente y compacto, carga mi Samsung y iPad al tiempo.'},
        {star:4,name:'Juan Esteban Vargas',comment:'Muy bueno, aunque el cable no viene incluido.'}
      ],
      'p04': [
        {star:5,name:'Valentina Castaño',comment:'Original Apple, se nota la diferencia en calidad.'},
        {star:5,name:'Diego Herrera',comment:'Carga rapidísimo mi iPhone 14, vale cada peso.'}
      ],
      'p09': [
        {star:5,name:'Sofía Martínez',comment:'Muy buen sonido para el precio, el micrófono funciona perfecto.'},
        {star:4,name:'Camilo Restrepo',comment:'Buenos audífonos, cómodos y se escucha bien.'},
        {star:5,name:'Daniela Ocampo',comment:'Los uso todos los días, excelente relación calidad-precio.'}
      ],
      'p14': [
        {star:5,name:'Santiago Muñoz',comment:'La cancelación de ruido es increíble para el precio.'},
        {star:5,name:'Isabella Torres',comment:'Parecen AirPods Pro originales, super recomendados.'},
        {star:4,name:'Mateo Gutiérrez',comment:'Muy buenos, la batería dura bastante bien.'}
      ],
      'p18': [
        {star:5,name:'Juliana Pérez',comment:'Sonido espectacular, se ven premium y se sienten cómodos.'},
        {star:4,name:'Felipe Cardona',comment:'Excelente calidad de construcción, muy cómodos para largas sesiones.'}
      ],
      'p24': [
        {star:5,name:'Alejandro Rojas',comment:'120W es una locura de potencia, carga todo al instante.'},
        {star:5,name:'Natalia Ramírez',comment:'La uso para mi laptop y celular, es genial.'}
      ],
      'p44': [
        {star:5,name:'David Osorio',comment:'Cargador original Samsung, carga mi S24 Ultra completo en 30 min.'},
        {star:5,name:'Andrea Salazar',comment:'Lo mejor de Samsung, super rápido.'},
        {star:4,name:'Nicolás Quintero',comment:'Excelente cargador, funciona igual que el que trae la caja.'}
      ],
      'p45': [
        {star:5,name:'Mariana Gil',comment:'67W reales, mi Xiaomi 13 carga al 100% en 35 minutos.'},
        {star:4,name:'Sebastián Castro',comment:'Carga super rápido, calidad Xiaomi original.'}
      ],
      'p65': [
        {star:5,name:'Paula Andrea Mejía',comment:'Sonido increíble, la cancelación de ruido funciona muy bien.'},
        {star:5,name:'Tomás Londoño',comment:'Los mejores audífonos relación calidad-precio que he tenido.'},
        {star:4,name:'Catalina Vélez',comment:'Muy cómodos y livianos, el sonido es bien balanceado.'}
      ],
      'p30': [
        {star:5,name:'Esteban Arango',comment:'Sonido JBL de verdad, graves potentes para el precio.'},
        {star:4,name:'Gabriela Duque',comment:'Buenos audífonos, se siente la calidad JBL.'}
      ],
      'p37': [
        {star:5,name:'Ricardo Morales',comment:'Son los que vienen con el Samsung, excelente sonido AKG.'},
        {star:4,name:'Luisa Fernanda Ospina',comment:'Muy buenos para llamadas y música, micrófono nítido.'}
      ]
    };

    const seedRatings = {};
    Object.entries(REVIEWS).forEach(([pid, reviews]) => {
      seedRatings[pid] = reviews.map(r => r.star);
    });

    localStorage.setItem(RATINGS_KEY, JSON.stringify(seedRatings));
    localStorage.setItem('libretech_reviews', JSON.stringify(REVIEWS));
  }

  // --- Obtener productos ---
  function getProducts() {
    try { return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]'); }
    catch { return []; }
  }

  function getActiveProducts() {
    return getProducts().filter(p => p.active !== false);
  }

  // --- Ratings ---
  function getRatings() {
    try { return JSON.parse(localStorage.getItem(RATINGS_KEY) || '{}'); }
    catch { return {}; }
  }

  function getProductRating(productId) {
    const ratings = getRatings();
    const arr = ratings[productId] || [];
    if (arr.length === 0) return { avg: 0, count: 0 };
    const sum = arr.reduce((a, b) => a + b, 0);
    return { avg: sum / arr.length, count: arr.length };
  }

  function renderStars(avg, count) {
    let html = '<div class="star-rating">';
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(avg)) html += '<span class="star filled">★</span>';
      else if (i - 0.5 <= avg) html += '<span class="star half">★</span>';
      else html += '<span class="star">☆</span>';
    }
    if (count > 0) html += `<span class="rating-count">(${count})</span>`;
    html += '</div>';
    return html;
  }

  // --- Filtrar productos ---
  function getFilteredProducts() {
    let products = getActiveProducts();
    if (currentCategory !== 'all') products = products.filter(p => p.category === currentCategory);
    if (currentBrand !== 'all') products = products.filter(p => (p.brand || '').toLowerCase() === currentBrand.toLowerCase());
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
      );
    }
    return products;
  }

  // --- Renderizar categorías ---
  function renderCategories() {
    const bar = document.getElementById('filtersBar');
    if (!bar) return;
    const products = getActiveProducts();
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
    bar.querySelectorAll('.filter-chip:not([data-category="all"])').forEach(el => el.remove());
    bar.querySelector('.products-count')?.remove();

    categories.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.dataset.category = cat;
      chip.textContent = cat;
      bar.appendChild(chip);
    });

    const count = document.createElement('span');
    count.className = 'products-count';
    count.id = 'productsCount';
    bar.appendChild(count);
    updateProductsCount();
  }

  // --- Brand dropdown (replaces old fixed sub-bar) ---
  function showBrandDropdown(category, anchorEl) {
    const dropdown = document.getElementById('brandDropdown');
    const content = document.getElementById('brandDropdownContent');
    if (!dropdown || !content) return;

    if (category === 'all') { dropdown.style.display = 'none'; return; }

    const products = getActiveProducts().filter(p => p.category === category);
    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
    if (brands.length === 0) { dropdown.style.display = 'none'; return; }

    content.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.className = 'brand-dd-item' + (currentBrand === 'all' ? ' active' : '');
    allBtn.dataset.brand = 'all';
    allBtn.textContent = 'Todas las marcas';
    content.appendChild(allBtn);

    brands.forEach(brand => {
      const btn = document.createElement('button');
      btn.className = 'brand-dd-item' + (currentBrand === brand ? ' active' : '');
      btn.dataset.brand = brand;
      btn.textContent = brand;
      content.appendChild(btn);
    });

    // Position below the anchor chip
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      const bar = document.getElementById('filtersBar');
      const barRect = bar ? bar.getBoundingClientRect() : rect;
      dropdown.style.left = (rect.left - barRect.left) + 'px';
    }
    dropdown.style.display = 'block';
  }

  function updateProductsCount() {
    const countEl = document.getElementById('productsCount');
    if (!countEl) return;
    const filtered = getFilteredProducts();
    countEl.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`;
  }

  // --- Renderizar productos destacados ---
  function renderFeaturedProducts() {
    const grid = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');
    if (!grid) return;

    let products = getFilteredProducts();

    if (!showAll) {
      // Show only featured when no search/filter
      if (currentCategory === 'all' && !searchQuery.trim()) {
        products = products.filter(p => p.featured === true);
      }
    }

    grid.innerHTML = '';
    if (products.length === 0) {
      if (noResults) noResults.style.display = 'block';
      updateProductsCount();
      return;
    }
    if (noResults) noResults.style.display = 'none';

    products.forEach(product => grid.appendChild(createProductCard(product)));
    updateProductsCount();

    // Show/hide "Ver todos" button
    const btnViewAll = document.getElementById('btnViewAll');
    if (btnViewAll) {
      if (showAll || currentCategory !== 'all' || searchQuery.trim()) {
        btnViewAll.style.display = 'none';
      } else {
        const totalActive = getActiveProducts().length;
        const featuredCount = getActiveProducts().filter(p => p.featured === true).length;
        btnViewAll.style.display = totalActive > featuredCount ? '' : 'none';
        btnViewAll.textContent = 'Ver todos los productos';
      }
    }
  }

  // Alias for external calls
  function renderProducts() { renderFeaturedProducts(); }

  // --- Render top categories section ---
  function renderTopCategories() {
    const container = document.getElementById('topCategoriesContainer');
    if (!container) return;

    const products = getActiveProducts();
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

    container.innerHTML = '';

    categories.forEach(cat => {
      const catProducts = products.filter(p => p.category === cat);
      // Sort by average rating desc
      catProducts.sort((a, b) => {
        const ra = getProductRating(a.id).avg;
        const rb = getProductRating(b.id).avg;
        return rb - ra;
      });

      // Show top 4
      const topProducts = catProducts.slice(0, 4);
      if (topProducts.length === 0) return;

      const section = document.createElement('div');
      section.className = 'top-category-block';
      section.innerHTML = `<h3 class="top-category-title">${Cart.escapeHTML(cat)}</h3>`;

      const grid = document.createElement('div');
      grid.className = 'products-grid';
      topProducts.forEach(p => grid.appendChild(createProductCard(p)));
      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  // --- Crear tarjeta de producto ---
  function createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.productId = product.id;

    const isNew = isRecentProduct(product.createdAt);
    const detailLink = `producto.html?id=${encodeURIComponent(product.id)}`;
    const rating = getProductRating(product.id);
    const stock = product.stock ?? 0;
    const isOutOfStock = stock <= 0;
    const inWishlist = isInWishlist(product.id);

    card.innerHTML = `
      <a href="${detailLink}" class="product-card-link">
        <div class="product-card-image">
          ${isOutOfStock ? '<span class="product-badge out-of-stock">Agotado</span>' : ''}
          ${!isOutOfStock && isNew ? '<span class="product-badge new">Nuevo</span>' : ''}
          ${product.featured ? '<span class="product-badge featured">★ Destacado</span>' : ''}
          ${product.offerActive && product.offerPrice ? '<span class="product-badge sale">Oferta</span>' : ''}
          ${isOutOfStock ? '<div class="product-sold-out-overlay"></div>' : ''}
          ${product.image
            ? `<img src="${Cart.escapeAttr(product.image)}" alt="${Cart.escapeAttr(product.name)}" loading="lazy" width="260" height="260">`
            : `<div class="product-no-image">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
              </div>`
          }
        </div>
        <div class="product-card-body">
          <span class="product-category">${Cart.escapeHTML(product.category || '')}</span>
          <h3 class="product-name">${Cart.escapeHTML(product.name)}</h3>
          ${renderStars(rating.avg, rating.count)}
          <p class="product-description">${Cart.escapeHTML(product.description || '')}</p>
          <div class="product-price-row">
            ${product.offerActive && product.offerPrice
              ? `<span class="product-price offer-price">${Cart.formatPrice(product.offerPrice)}</span><span class="product-price-original">${Cart.formatPrice(product.price)}</span>`
              : `<span class="product-price">${Cart.formatPrice(product.price)}</span>`
            }
          </div>
        </div>
      </a>
      <button class="btn-wishlist-card${inWishlist ? ' active' : ''}" data-wishlist-id="${product.id}" title="${inWishlist ? 'Quitar de favoritos' : 'Agregar a favoritos'}" aria-label="Favoritos">
        <svg viewBox="0 0 24 24" fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
      </button>
      ${isOutOfStock
        ? `<button class="btn-add-cart disabled" disabled title="Agotado" aria-label="Producto agotado">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>`
        : `<button class="btn-add-cart" data-product-id="${product.id}" title="Agregar al carrito" aria-label="Agregar ${Cart.escapeAttr(product.name)} al carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>`
      }
    `;
    return card;
  }

  function isRecentProduct(dateStr) {
    if (!dateStr) return false;
    const diffDays = (new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  }

  // --- Hero carousel ---
  // --- Render promo banners alongside sections ---
  function renderPromoBanners() {
    const products = getActiveProducts();

    // --- Left banner (featured section): pick a product on offer or a top category ---
    const bannerLeft = document.getElementById('promoBannerFeatured');
    if (bannerLeft) {
      // Find a product with an active offer
      const offerProduct = products.find(p => p.offerActive && p.offerPrice);
      if (offerProduct) {
        const discount = Math.round((1 - offerProduct.offerPrice / offerProduct.price) * 100);
        bannerLeft.innerHTML = `
          <a href="producto.html?id=${encodeURIComponent(offerProduct.id)}" class="promo-banner-link promo-banner--offer-style">
            <div class="promo-banner-badge">🔥 OFERTA</div>
            <div class="promo-banner-img">
              ${offerProduct.image ? `<img src="${Cart.escapeAttr(offerProduct.image)}" alt="${Cart.escapeAttr(offerProduct.name)}" loading="lazy">` : ''}
            </div>
            <div class="promo-banner-body">
              <span class="promo-banner-discount">-${discount}%</span>
              <h4 class="promo-banner-title">${Cart.escapeHTML(offerProduct.name)}</h4>
              <div class="promo-banner-prices">
                <span class="promo-banner-new-price">${Cart.formatPrice(offerProduct.offerPrice)}</span>
                <span class="promo-banner-old-price">${Cart.formatPrice(offerProduct.price)}</span>
              </div>
              <span class="promo-banner-cta">Ver producto →</span>
            </div>
          </a>`;
      } else {
        // Fallback: audio category promo
        const audioProd = products.filter(p => p.category === 'Audio' && p.featured).slice(0, 1)[0]
          || products.filter(p => p.category === 'Audio').slice(0, 1)[0];
        bannerLeft.innerHTML = `
          <a href="${audioProd ? 'producto.html?id=' + encodeURIComponent(audioProd.id) : '#'}" class="promo-banner-link promo-banner--category-style">
            <div class="promo-banner-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </div>
            <h4 class="promo-banner-title">Audio Premium</h4>
            <p class="promo-banner-desc">Descubre nuestra selección de audífonos y parlantes</p>
            <span class="promo-banner-cta">Explorar →</span>
          </a>`;
      }
    }

    // --- Right banner (top categories section): category lifestyle or specific product ---
    const bannerRight = document.getElementById('promoBannerCategories');
    if (bannerRight) {
      // Pick a popular/featured power bank or wearable
      const promoProd = products.find(p => p.featured && (p.category === 'Power Banks' || p.category === 'Wearables'))
        || products.find(p => p.category === 'Cargadores' && p.featured);
      if (promoProd) {
        bannerRight.innerHTML = `
          <a href="producto.html?id=${encodeURIComponent(promoProd.id)}" class="promo-banner-link promo-banner--highlight-style">
            <div class="promo-banner-tag">⚡ DESTACADO</div>
            <div class="promo-banner-img">
              ${promoProd.image ? `<img src="${Cart.escapeAttr(promoProd.image)}" alt="${Cart.escapeAttr(promoProd.name)}" loading="lazy">` : ''}
            </div>
            <div class="promo-banner-body">
              <h4 class="promo-banner-title">${Cart.escapeHTML(promoProd.name)}</h4>
              <p class="promo-banner-desc">${Cart.escapeHTML((promoProd.description || '').substring(0, 80))}${(promoProd.description || '').length > 80 ? '…' : ''}</p>
              <span class="promo-banner-price">${Cart.formatPrice(promoProd.offerActive && promoProd.offerPrice ? promoProd.offerPrice : promoProd.price)}</span>
              <span class="promo-banner-cta">Comprar ahora →</span>
            </div>
          </a>`;
      } else {
        // Fallback: Cargadores category promo
        bannerRight.innerHTML = `
          <div class="promo-banner-link promo-banner--category-style">
            <div class="promo-banner-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/></svg>
            </div>
            <h4 class="promo-banner-title">Carga Rápida</h4>
            <p class="promo-banner-desc">Cargadores y power banks de alta potencia</p>
            <span class="promo-banner-cta">Ver todos →</span>
          </div>`;
      }
    }
  }

  function initHeroCarousel() {
    const track = document.getElementById('heroCarouselTrack');
    const dotsC = document.getElementById('heroCarouselDots');
    if (!track || !dotsC) return;

    const featured = getActiveProducts().filter(p => p.featured === true).slice(0, 6);
    if (featured.length === 0) {
      // fallback: show all products
      featured.push(...getActiveProducts().slice(0, 4));
    }
    if (featured.length === 0) return;

    track.innerHTML = featured.map(p => {
      const hasOffer = p.offerActive && p.offerPrice;
      const discountPercent = hasOffer ? Math.round((1 - p.offerPrice / p.price) * 100) : 0;
      return `
      <a href="producto.html?id=${encodeURIComponent(p.id)}" class="hero-slide${hasOffer ? ' hero-slide--offer' : ''}">
        ${hasOffer ? `<div class="hero-slide-discount-badge">-${discountPercent}%</div>` : ''}
        <div class="hero-slide-image">
          ${p.image
            ? `<img src="${Cart.escapeAttr(p.image)}" alt="${Cart.escapeAttr(p.name)}" loading="lazy">`
            : `<div class="hero-slide-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
              </div>`
          }
        </div>
        <div class="hero-slide-info">
          <span class="hero-slide-cat">${Cart.escapeHTML(p.category || '')}</span>
          <h3 class="hero-slide-name">${Cart.escapeHTML(p.name)}</h3>
          ${hasOffer
            ? `<div class="hero-slide-prices">
                <span class="hero-slide-price hero-slide-price--offer">${Cart.formatPrice(p.offerPrice)}</span>
                <span class="hero-slide-price--original">${Cart.formatPrice(p.price)}</span>
              </div>`
            : `<span class="hero-slide-price">${Cart.formatPrice(p.price)}</span>`
          }
        </div>
      </a>
    `}).join('');

    // Dots
    dotsC.innerHTML = featured.map((_, i) =>
      `<button class="carousel-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Ir a producto ${i + 1}"></button>`
    ).join('');

    carouselIndex = 0;
    const slideCount = featured.length;

    dotsC.addEventListener('click', e => {
      const dot = e.target.closest('.carousel-dot');
      if (!dot) return;
      carouselIndex = parseInt(dot.dataset.index, 10);
      updateCarousel();
      resetCarouselTimer();
    });

    function updateCarousel() {
      const slideWidth = track.parentElement.offsetWidth;
      track.style.transform = `translateX(-${carouselIndex * slideWidth}px)`;
      dotsC.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === carouselIndex));
    }

    function nextSlide() {
      carouselIndex = (carouselIndex + 1) % slideCount;
      updateCarousel();
    }

    function resetCarouselTimer() {
      clearInterval(carouselInterval);
      carouselInterval = setInterval(nextSlide, 4000);
    }

    resetCarouselTimer();
    window.addEventListener('resize', updateCarousel);
  }

  // --- Eventos ---
  function bindEvents() {
    // Smooth scroll for hero CTA
    document.getElementById('heroCtaBtn')?.addEventListener('click', e => {
      e.preventDefault();
      const target = document.getElementById('productos');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // Add to cart from grids (featured + top categories)
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn-add-cart');
      if (!btn) return;
      const productId = btn.dataset.productId;
      Cart.addItem(productId);
      btn.classList.add('added');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
      setTimeout(() => {
        btn.classList.remove('added');
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
      }, 1200);
    });

    // Wishlist toggle from product cards
    document.addEventListener('click', e => {
      const btn = e.target.closest('.btn-wishlist-card');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(btn.dataset.wishlistId);
    });

    // Wishlist sidebar events
    document.getElementById('btnOpenWishlist')?.addEventListener('click', openWishlist);
    document.getElementById('btnCloseWishlist')?.addEventListener('click', closeWishlist);
    document.getElementById('wishlistOverlay')?.addEventListener('click', closeWishlist);

    // Wishlist item actions (add to cart, remove)
    document.getElementById('wishlistItems')?.addEventListener('click', e => {
      const cartBtn = e.target.closest('.wishlist-item-cart');
      if (cartBtn) {
        e.preventDefault();
        Cart.addItem(cartBtn.dataset.productId);
      }
      const removeBtn = e.target.closest('.wishlist-item-remove');
      if (removeBtn) {
        e.preventDefault();
        toggleWishlist(removeBtn.dataset.wishlistRemove);
      }
    });

    // Category filter chips
    document.getElementById('filtersBar')?.addEventListener('click', e => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.dataset.category;
      currentBrand = 'all';
      showBrandDropdown(currentCategory, chip);
      showAll = currentCategory !== 'all';
      renderFeaturedProducts();
    });

    // Brand dropdown items
    document.getElementById('brandDropdown')?.addEventListener('click', e => {
      const item = e.target.closest('.brand-dd-item');
      if (!item) return;
      document.querySelectorAll('.brand-dd-item').forEach(b => b.classList.remove('active'));
      item.classList.add('active');
      currentBrand = item.dataset.brand;
      renderFeaturedProducts();
    });

    // Close brand dropdown on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#brandDropdown') && !e.target.closest('.filter-chip')) {
        const dd = document.getElementById('brandDropdown');
        if (dd) dd.style.display = 'none';
      }
    });

    // View all products
    document.getElementById('btnViewAll')?.addEventListener('click', e => {
      e.preventDefault();
      showAll = true;
      renderFeaturedProducts();
    });

    // Search with debounce
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          searchQuery = searchInput.value;
          showAll = !!searchQuery.trim();
          renderFeaturedProducts();
          renderSearchDropdown(searchInput.value);
        }, 300);
      });
      document.addEventListener('click', e => {
        if (!e.target.closest('.search-wrapper')) {
          const dd = document.getElementById('searchDropdown');
          if (dd) dd.classList.remove('active');
        }
      });
      searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim()) renderSearchDropdown(searchInput.value);
      });
    }
  }

  // --- Live search dropdown ---
  function renderSearchDropdown(query) {
    const dropdown = document.getElementById('searchDropdown');
    if (!dropdown) return;
    const q = (query || '').toLowerCase().trim();
    if (!q) { dropdown.classList.remove('active'); dropdown.innerHTML = ''; return; }

    const products = getActiveProducts().filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    ).slice(0, 8);

    if (products.length === 0) {
      dropdown.innerHTML = '<div class="search-dropdown-empty">No se encontraron productos</div>';
      dropdown.classList.add('active');
      return;
    }

    dropdown.innerHTML = products.map(p => `
      <a href="producto.html?id=${encodeURIComponent(p.id)}" class="search-dropdown-item">
        <div class="search-dropdown-thumb">
          ${p.image
            ? `<img src="${Cart.escapeAttr(p.image)}" alt="${Cart.escapeAttr(p.name)}" loading="lazy">`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`
          }
        </div>
        <div class="search-dropdown-info">
          <div class="search-dropdown-name">${Cart.escapeHTML(p.name)}</div>
          <div class="search-dropdown-meta">${Cart.escapeHTML(p.category || '')}</div>
        </div>
        <span class="search-dropdown-price">${Cart.formatPrice(p.price)}</span>
      </a>
    `).join('');
    dropdown.classList.add('active');
  }

  // --- Header scroll effect ---
  function initHeaderScroll() {
    const header = document.getElementById('siteHeader');
    if (!header) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          header.classList.toggle('scrolled', window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ===================== WISHLIST =====================
  function getWishlist() {
    try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); } catch { return []; }
  }

  function saveWishlist(list) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  }

  function isInWishlist(productId) {
    return getWishlist().includes(productId);
  }

  function toggleWishlist(productId) {
    let list = getWishlist();
    const idx = list.indexOf(productId);
    if (idx > -1) {
      list.splice(idx, 1);
      Cart.showToast('Eliminado de favoritos', 'info');
    } else {
      list.push(productId);
      Cart.showToast('Agregado a favoritos', 'success');
    }
    saveWishlist(list);
    updateWishlistBadge();
    renderWishlistSidebar();
    // Update heart icons on cards
    document.querySelectorAll('.btn-wishlist-card').forEach(btn => {
      const id = btn.dataset.wishlistId;
      const active = list.includes(id);
      btn.classList.toggle('active', active);
      btn.title = active ? 'Quitar de favoritos' : 'Agregar a favoritos';
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', active ? 'currentColor' : 'none');
    });
  }

  function updateWishlistBadge() {
    const badge = document.getElementById('wishlistBadge');
    if (!badge) return;
    const count = getWishlist().length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  function renderWishlistSidebar() {
    const container = document.getElementById('wishlistItems');
    const emptyEl = document.getElementById('wishlistEmpty');
    const countEl = document.getElementById('wishlistItemsCount');
    if (!container) return;

    const list = getWishlist();
    const products = getActiveProducts();

    if (countEl) countEl.textContent = list.length > 0 ? `(${list.length})` : '';
    if (list.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      // Remove all items except empty
      container.querySelectorAll('.wishlist-item').forEach(el => el.remove());
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    // Remove old items
    container.querySelectorAll('.wishlist-item').forEach(el => el.remove());

    list.forEach(pid => {
      const p = products.find(x => x.id === pid);
      if (!p) return;
      const div = document.createElement('div');
      div.className = 'wishlist-item';
      div.innerHTML = `
        <a href="producto.html?id=${encodeURIComponent(p.id)}" class="wishlist-item-link">
          <div class="wishlist-item-img">
            ${p.image ? `<img src="${Cart.escapeAttr(p.image)}" alt="${Cart.escapeAttr(p.name)}" loading="lazy">` : '<div class="product-no-image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/></svg></div>'}
          </div>
          <div class="wishlist-item-info">
            <div class="wishlist-item-name">${Cart.escapeHTML(p.name)}</div>
            <div class="wishlist-item-price">${p.offerActive && p.offerPrice ? Cart.formatPrice(p.offerPrice) : Cart.formatPrice(p.price)}</div>
          </div>
        </a>
        <div class="wishlist-item-actions">
          <button class="wishlist-item-cart" data-product-id="${p.id}" title="Agregar al carrito">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
          </button>
          <button class="wishlist-item-remove" data-wishlist-remove="${p.id}" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
      container.appendChild(div);
    });
  }

  function openWishlist() {
    document.getElementById('wishlistSidebar')?.classList.add('active');
    document.getElementById('wishlistOverlay')?.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderWishlistSidebar();
  }

  function closeWishlist() {
    document.getElementById('wishlistSidebar')?.classList.remove('active');
    document.getElementById('wishlistOverlay')?.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ===================== SOCIAL MEDIA (FOOTER) =====================
  const SOCIAL_ICONS = {
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.05a8.16 8.16 0 004.76 1.52V7.12a4.84 4.84 0 01-1-.43z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29.94 29.94 0 001 11.75a30 30 0 00.46 5.33A2.78 2.78 0 003.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2c.312-1.732.466-3.49.46-5.25a29.94 29.94 0 00-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'
  };

  function getSocialLinks() {
    try { return JSON.parse(localStorage.getItem(SOCIAL_KEY) || '{}'); } catch { return {}; }
  }

  function renderSocialLinks() {
    const container = document.getElementById('footerSocialLinks');
    const wrapper = document.getElementById('footerSocial');
    if (!container) return;
    const links = getSocialLinks();
    const entries = Object.entries(links).filter(([, url]) => url && url.trim());
    if (entries.length === 0) {
      if (wrapper) wrapper.style.display = 'none';
      return;
    }
    if (wrapper) wrapper.style.display = '';
    container.innerHTML = entries.map(([platform, url]) => {
      const icon = SOCIAL_ICONS[platform] || SOCIAL_ICONS.instagram;
      const safeName = Cart.escapeHTML(platform.charAt(0).toUpperCase() + platform.slice(1));
      const safeUrl = Cart.escapeAttr(url);
      return `<a href="${safeUrl}" target="_blank" rel="noopener" class="footer-social-link" title="${safeName}">${icon}<span>${safeName}</span></a>`;
    }).join('');
  }

  // ===== PROMO PHOTO BANNERS =====
  const PROMO_PHOTOS_KEY = 'libretech_promo_photos';
  function getPromoPhotos() { try { return JSON.parse(localStorage.getItem(PROMO_PHOTOS_KEY) || '[]'); } catch { return []; } }

  function renderPromoPhotoBanners() {
    const slotMap = {
      'after-featured': 'promoPhotoAfterFeatured',
      'after-categories': 'promoPhotoAfterCategories',
      'before-footer': 'promoPhotoBeforeFooter'
    };
    // Clear all slots
    Object.values(slotMap).forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });

    const photos = getPromoPhotos().filter(p => p.active && p.image);
    photos.forEach(p => {
      const slotId = slotMap[p.position] || slotMap['after-featured'];
      const slot = document.getElementById(slotId);
      if (!slot) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'promo-photo-banner';
      if (p.link) {
        wrapper.innerHTML = `<a href="${Cart.escapeAttr(p.link)}" target="_blank" rel="noopener"><img src="${Cart.escapeAttr(p.image)}" alt="${Cart.escapeHTML(p.title || 'Promoción')}" loading="lazy"></a>`;
      } else {
        wrapper.innerHTML = `<img src="${Cart.escapeAttr(p.image)}" alt="${Cart.escapeHTML(p.title || 'Promoción')}" loading="lazy">`;
      }
      slot.appendChild(wrapper);
    });
  }

  return { init, renderProducts, renderCategories, getProductRating, renderStars, getActiveProducts, getProducts, isInWishlist, toggleWishlist, updateWishlistBadge, openWishlist, closeWishlist, renderWishlistSidebar, renderSocialLinks, renderPromoPhotoBanners };
})();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => Store.init());
