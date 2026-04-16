-- ============================================================
-- LIBRE TECH — Supabase Database Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price       INTEGER NOT NULL CHECK (price >= 0),
  description TEXT DEFAULT '',
  category    TEXT DEFAULT '',
  brand       TEXT DEFAULT '',
  image_url   TEXT DEFAULT '',
  stock       INTEGER DEFAULT 0 CHECK (stock >= 0),
  active      BOOLEAN DEFAULT true,
  featured    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  colors      JSONB DEFAULT '[]',
  specs       JSONB DEFAULT '[]',
  offer_active  BOOLEAN DEFAULT false,
  offer_price   INTEGER DEFAULT 0,
  offer_percent INTEGER DEFAULT 0
);

-- 2. Tabla de pedidos
CREATE TABLE IF NOT EXISTS orders (
  id         TEXT PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  method     TEXT DEFAULT 'contraentrega',
  status     TEXT DEFAULT 'pending',
  total      INTEGER DEFAULT 0,
  items      JSONB DEFAULT '[]'
);

-- 3. Tabla de ratings / reseñas
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  product_id  TEXT REFERENCES products(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stars       INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  reviewer_name TEXT DEFAULT '',
  comment     TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabla de wishlist
CREATE TABLE IF NOT EXISTS wishlists (
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Products: todos leen, solo admin escribe
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_all" ON products
  FOR SELECT USING (true);

CREATE POLICY "products_admin_all" ON products
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- Orders: anon puede insertar, usuarios leen los suyos, admin todo
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_insert_anon" ON orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "orders_select_own" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "orders_admin_all" ON orders
  FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- Reviews: todos leen, autenticados insertan
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select_all" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert_auth" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wishlists: cada usuario gestiona la suya
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlists_own" ON wishlists
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Storage bucket para imágenes de productos
-- ============================================================
-- Crear manualmente en Supabase Dashboard > Storage:
--   Nombre: product-images
--   Public: Sí (para servir imágenes sin auth)
--
-- O ejecutar:
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política: cualquiera lee, admin sube/elimina
CREATE POLICY "product_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "product_images_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images'
    AND (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

CREATE POLICY "product_images_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images'
    AND (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true
  );

-- ============================================================
-- Seed: insertar los 66 productos iniciales
-- (Ejecutar solo la primera vez)
-- ============================================================
INSERT INTO products (id, name, price, description, category, brand, image_url, stock, active, featured, created_at, colors, specs) VALUES
('p01','Cargador 25W USB-C a Lightning',35000,'Cargador rápido de 25W con cable USB-C a Lightning integrado. Compatible con iPhone 8 en adelante.','Cargadores','Genérico','img/products/p01.svg',4,true,true,'2026-04-01','["Blanco"]','[{"key":"Potencia","value":"25W"},{"key":"Entrada","value":"USB-C"},{"key":"Salida","value":"Lightning"},{"key":"Carga rápida","value":"Sí"}]'),
('p02','Cargador 35W USB-C a USB-C',40000,'Cargador de 35W con cable USB-C a USB-C. Ideal para smartphones y tablets con puerto Type-C.','Cargadores','Genérico','img/products/p02.svg',3,true,true,'2026-04-01','["Blanco","Negro"]','[{"key":"Potencia","value":"35W"},{"key":"Conexión","value":"USB-C a USB-C"},{"key":"Carga rápida","value":"Sí"}]'),
('p03','Adaptador USB-C 20W',18000,'Adaptador de carga rápida USB-C de 20W. Compatible con iPhone y Android.','Adaptadores','Genérico','img/products/p03.svg',5,true,false,'2026-04-01','["Blanco"]','[{"key":"Potencia","value":"20W"},{"key":"Puerto","value":"USB-C"},{"key":"Carga rápida","value":"PD 3.0"}]'),
('p04','Adaptador USB-C 20W Original',45000,'Adaptador de carga original Apple de 20W USB-C. Carga rápida para iPhone y iPad.','Adaptadores','Apple','img/products/p04_apple_20w.jpg',1,true,true,'2026-04-01','["Blanco"]','[{"key":"Potencia","value":"20W"},{"key":"Puerto","value":"USB-C"},{"key":"Certificación","value":"Apple Original"},{"key":"Carga rápida","value":"PD"}]'),
('p05','Adaptador 5W',10000,'Adaptador de carga estándar de 5W con puerto USB-A. Compatible universal.','Adaptadores','Genérico','img/products/p05.svg',2,true,false,'2026-04-01','["Blanco"]','[{"key":"Potencia","value":"5W"},{"key":"Puerto","value":"USB-A"}]'),
('p06','Adaptador 30W USB-C',25000,'Adaptador de carga rápida de 30W con puerto USB-C. Ideal para dispositivos de carga rápida.','Adaptadores','Genérico','img/products/p06.svg',1,true,false,'2026-04-01','["Blanco"]','[{"key":"Potencia","value":"30W"},{"key":"Puerto","value":"USB-C"},{"key":"Carga rápida","value":"PD"}]'),
('p07','Cable Lightning a USB (1m)',15000,'Cable Lightning a USB de 1 metro. Compatible con iPhone, iPad y iPod.','Cables','Genérico','img/products/p07.svg',4,true,false,'2026-04-01','["Blanco"]','[{"key":"Longitud","value":"1 metro"},{"key":"Conector","value":"Lightning a USB-A"}]'),
('p08','Cable USB-C a Lightning',20000,'Cable USB-C a Lightning para carga rápida. Compatible con iPhone 8 en adelante.','Cables','Genérico','img/products/p08.svg',1,true,false,'2026-04-01','["Blanco"]','[{"key":"Longitud","value":"1 metro"},{"key":"Conector","value":"USB-C a Lightning"},{"key":"Carga rápida","value":"Sí"}]'),
('p09','Audífonos iPhone Lightning',12000,'Audífonos con cable y conector Lightning. Sonido nítido, micrófono integrado y control de volumen.','Audio','Genérico','img/products/p09.svg',9,true,true,'2026-04-01','["Blanco"]','[{"key":"Conector","value":"Lightning"},{"key":"Micrófono","value":"Sí"},{"key":"Control","value":"Volumen y llamadas"}]'),
('p10','Audífonos iPhone USB-C',15000,'Audífonos con cable y conector USB-C. Compatible con iPhone 15 y dispositivos USB-C.','Audio','Genérico','img/products/p10.svg',5,true,false,'2026-04-01','["Blanco"]','[{"key":"Conector","value":"USB-C"},{"key":"Micrófono","value":"Sí"},{"key":"Control","value":"Volumen y llamadas"}]'),
('p11','Wallets Tarjeteros',25000,'Tarjetero magnético MagSafe para iPhone. Guarda tus tarjetas en la parte trasera del celular.','Accesorios','Genérico','img/products/p11.svg',2,true,false,'2026-04-01','["Negro","Café"]','[{"key":"Tipo","value":"Tarjetero magnético"},{"key":"Capacidad","value":"Hasta 3 tarjetas"},{"key":"Compatibilidad","value":"MagSafe"}]'),
('p12','Audífonos Serie 4',85000,'Audífonos inalámbricos tipo AirPods Serie 4. Diseño compacto, buena calidad de sonido y estuche de carga.','Audio','Genérico','img/products/p12.svg',1,true,false,'2026-04-01','["Blanco"]','[{"key":"Tipo","value":"In-ear TWS"},{"key":"Bluetooth","value":"5.3"},{"key":"Batería","value":"Hasta 5 horas"}]'),
('p13','Audífonos Serie 3',55000,'Audífonos inalámbricos tipo AirPods Serie 3. Diseño ergonómico con estuche de carga.','Audio','Genérico','img/products/p13.svg',1,true,false,'2026-04-01','["Blanco"]','[{"key":"Tipo","value":"In-ear TWS"},{"key":"Bluetooth","value":"5.0"},{"key":"Batería","value":"Hasta 4 horas"}]'),
('p14','Audífonos Pro 2',120000,'Audífonos inalámbricos tipo AirPods Pro 2. Cancelación de ruido activa, sonido premium y estuche con carga.','Audio','Genérico','img/products/p14_pro2.jpg',2,true,true,'2026-04-01','["Blanco"]','[{"key":"Tipo","value":"In-ear TWS"},{"key":"ANC","value":"Cancelación activa"},{"key":"Bluetooth","value":"5.3"},{"key":"Batería","value":"Hasta 6 horas"},{"key":"Resistencia","value":"IPX4"}]'),
('p15','Audífonos Serie 1',35000,'Audífonos inalámbricos tipo AirPods Serie 1. Entrada económica al mundo TWS.','Audio','Genérico','img/products/p15.svg',1,true,false,'2026-04-01','["Blanco"]','[{"key":"Tipo","value":"In-ear TWS"},{"key":"Bluetooth","value":"5.0"},{"key":"Batería","value":"Hasta 3 horas"}]'),
('p16','Diadema P9',45000,'Diadema inalámbrica Bluetooth P9 con almohadillas acolchadas, sonido envolvente y micrófono integrado.','Audio','Genérico','img/products/p16.svg',1,true,false,'2026-04-01','["Negro","Blanco","Azul","Rosa"]','[{"key":"Tipo","value":"Over-ear"},{"key":"Bluetooth","value":"5.1"},{"key":"Batería","value":"Hasta 8 horas"},{"key":"Micrófono","value":"Sí"}]'),
('p17','Diadema Airmax Pequeña',55000,'Diadema tipo AirPods Max tamaño compacto. Diseño premium con almohadillas suaves.','Audio','Genérico','img/products/p17.svg',1,true,false,'2026-04-01','["Negro","Plateado"]','[{"key":"Tipo","value":"Over-ear compacto"},{"key":"Bluetooth","value":"5.2"},{"key":"Batería","value":"Hasta 10 horas"}]'),
('p18','Diadema Airmax Grande',75000,'Diadema tipo AirPods Max tamaño grande. Sonido Hi-Fi, cancelación de ruido y diseño premium.','Audio','Genérico','img/products/p18.svg',1,true,true,'2026-04-01','["Negro","Plateado","Azul"]','[{"key":"Tipo","value":"Over-ear"},{"key":"Bluetooth","value":"5.2"},{"key":"ANC","value":"Cancelación activa"},{"key":"Batería","value":"Hasta 20 horas"}]'),
('p19','Reloj Möbula Mini',65000,'Reloj inteligente Möbula Mini con pantalla táctil, monitor cardíaco, notificaciones y resistencia al agua.','Wearables','Möbula','img/products/p19.svg',1,true,false,'2026-04-01','["Negro","Rosa"]','[{"key":"Pantalla","value":"Táctil AMOLED"},{"key":"Sensores","value":"Ritmo cardíaco, SpO2"},{"key":"Resistencia","value":"IP68"},{"key":"Batería","value":"Hasta 7 días"}]'),
('p20','Micrófono SX31 Tipo C',30000,'Micrófono de solapa inalámbrico SX31 con conector USB-C. Ideal para grabación y streaming.','Accesorios','Genérico','img/products/p20.svg',1,true,false,'2026-04-01','["Negro"]','[{"key":"Tipo","value":"Lavalier inalámbrico"},{"key":"Conector","value":"USB-C"},{"key":"Alcance","value":"Hasta 10m"}]'),
('p21','Adaptador Lightning a Jack',12000,'Adaptador de Lightning a Jack 3.5mm. Conecta tus audífonos con cable a tu iPhone.','Adaptadores','Genérico','img/products/p21.svg',1,true,false,'2026-04-01','["Blanco"]','[{"key":"Entrada","value":"Lightning"},{"key":"Salida","value":"Jack 3.5mm"}]'),
('p22','Audífonos M10',28000,'Audífonos inalámbricos M10 TWS con estuche de carga LED, sonido estéreo HD y diseño deportivo.','Audio','Genérico','img/products/p22.svg',1,true,false,'2026-04-01','["Negro"]','[{"key":"Tipo","value":"In-ear TWS"},{"key":"Bluetooth","value":"5.1"},{"key":"Batería","value":"Hasta 4 horas"},{"key":"Estuche","value":"Con pantalla LED"}]'),
('p23','Power Bank 22.5W',55000,'Batería externa portátil con carga rápida de 22.5W, pantalla LED indicadora y doble puerto USB.','Power Banks','Genérico','img/products/p23.svg',1,true,false,'2026-04-01','["Negro","Blanco"]','[{"key":"Capacidad","value":"10000mAh"},{"key":"Carga rápida","value":"22.5W"},{"key":"Puertos","value":"USB-A + USB-C"},{"key":"Pantalla","value":"LED indicadora"}]'),
('p24','Power Bank 120W',95000,'Power Bank de alta potencia 120W con carga ultra rápida. Ideal para laptops y smartphones.','Power Banks','Genérico','img/products/p24.svg',1,true,true,'2026-04-01','["Negro"]','[{"key":"Capacidad","value":"20000mAh"},{"key":"Carga rápida","value":"120W"},{"key":"Puertos","value":"USB-A + USB-C PD"},{"key":"Pantalla","value":"Digital"}]'),
('p25','Máquina Vintage Patillera',50000,'Máquina cortadora de cabello y patillera estilo vintage. Cuchillas de precisión y diseño retro.','Belleza','Genérico','img/products/p25.svg',1,true,false,'2026-04-01','["Dorado"]','[{"key":"Tipo","value":"Patillera"},{"key":"Alimentación","value":"Recargable"},{"key":"Cuchillas","value":"Acero inoxidable"}]'),
('p26','Paneles de Luz',35000,'Paneles de luz LED modulares hexagonales táctiles. Decoración gaming y ambientación RGB.','Iluminación','Genérico','img/products/p26.svg',2,true,false,'2026-04-01','["Único"]','[{"key":"Tipo","value":"Hexagonal modular"},{"key":"Iluminación","value":"RGB 16 colores"},{"key":"Control","value":"Táctil"}]'),
('p27','Soporte Celular Carro',20000,'Soporte magnético para celular de carro. Montaje en rejilla de ventilación con rotación 360°.','Accesorios','Genérico','img/products/p27.svg',1,true,false,'2026-04-01','["Negro"]','[{"key":"Tipo","value":"Magnético"},{"key":"Montaje","value":"Rejilla ventilación"},{"key":"Rotación","value":"360°"}]'),
('p28','Audífonos Cable Bolsa',8000,'Audífonos con cable tipo bolsa con micrófono integrado. Universales con jack 3.5mm.','Audio','Genérico','img/products/p28.svg',2,true,false,'2026-04-01','["Negro","Blanco"]','[{"key":"Conector","value":"Jack 3.5mm"},{"key":"Micrófono","value":"Sí"}]'),
('p29','Audífonos GTA Cable',10000,'Audífonos con cable marca GTA. Sonido claro con micrófono y control en línea.','Audio','GTA','img/products/p29.svg',3,true,false,'2026-04-01','["Negro"]','[{"key":"Conector","value":"Jack 3.5mm"},{"key":"Micrófono","value":"Sí"},{"key":"Control","value":"En línea"}]'),
('p30','Audífonos JBL Cable',18000,'Audífonos con cable JBL. Sonido potente de graves profundos con micrófono integrado.','Audio','JBL','img/products/p30.svg',1,true,false,'2026-04-01','["Negro"]','[{"key":"Marca","value":"JBL"},{"key":"Conector","value":"Jack 3.5mm"},{"key":"Micrófono","value":"Sí"},{"key":"Driver","value":"8.6mm"}]'),
('p31','Cable USB TV',12000,'Cable USB para Smart TV. Conexión y alimentación de dispositivos por puerto USB.','Cables','Genérico','img/products/p31.svg',1,true,false,'2026-04-01','["Negro"]','[{"key":"Conector","value":"USB-A"},{"key":"Longitud","value":"1.5m"}]'),
('p32','Audífonos Inalámbricos Sport',35000,'Audífonos inalámbricos deportivos con ganchos para oreja, resistentes al sudor IPX5.','Audio','Genérico','img/products/p32.svg',1,true,false,'2026-04-01','["Negro","Rojo"]','[{"key":"Tipo","value":"In-ear deportivos"},{"key":"Bluetooth","value":"5.0"},{"key":"Resistencia","value":"IPX5"},{"key":"Batería","value":"Hasta 6 horas"}]'),
('p33','Topos de Puntilla',8000,'Topos/aretes de puntilla para mujer. Diseño elegante tipo diamante.','Accesorios','Genérico','img/products/p33.svg',3,true,false,'2026-04-01','["Plateado","Dorado"]','[{"key":"Material","value":"Acero inoxidable"},{"key":"Tipo","value":"Topos puntilla"}]'),
('p34','Audífonos Extra Bass Cable',15000,'Audífonos con cable Extra Bass. Graves potentes con aislamiento de ruido pasivo.','Audio','Genérico','img/products/p34.svg',2,true,false,'2026-04-01','["Negro"]','[{"key":"Conector","value":"Jack 3.5mm"},{"key":"Tipo","value":"In-ear Extra Bass"},{"key":"Micrófono","value":"Sí"}]'),
('p35','Parlante Magnético',40000,'Parlante portátil con base magnética. Sonido 360° con graves profundos y conexión Bluetooth.','Audio','Genérico','img/products/p35.svg',1,true,false,'2026-04-01','["Negro"]','[{"key":"Tipo","value":"Portátil magnético"},{"key":"Bluetooth","value":"5.0"},{"key":"Batería","value":"Hasta 6 horas"}]'),
('p36','Audífonos Cable Fivemax',12000,'Audífonos con cable marca Fivemax. Sonido balanceado con micrófono integrado.','Audio','Fivemax','img/products/p36.svg',1,true,false,'2026-04-01','["Negro"]','[{"key":"Conector","value":"Jack 3.5mm"},{"key":"Micrófono","value":"Sí"}]'),
('p37','Audífonos AKG Samsung',22000,'Audífonos AKG originales Samsung con cable USB-C. Sonido tuneado por AKG con graves equilibrados.','Audio','Samsung','img/products/p37.svg',1,true,false,'2026-04-01','["Negro"]','[{"key":"Marca","value":"AKG / Samsung"},{"key":"Conector","value":"USB-C"},{"key":"Micrófono","value":"Sí"},{"key":"Driver","value":"Dinámico de 2 vías"}]'),
('p38','Cargador Moto Edge 67W',65000,'Cargador original Motorola de 67W TurboPower. Compatible con Moto Edge y dispositivos con carga rápida.','Cargadores','Motorola','img/products/p38.svg',1,true,false,'2026-04-01','["Negro"]','[{"key":"Potencia","value":"67W"},{"key":"Tecnología","value":"TurboPower"},{"key":"Puerto","value":"USB-C"},{"key":"Marca","value":"Motorola"}]'),
('p39','Cargador Motorola 30W',40000,'Cargador Motorola TurboPower de 30W. Carga rápida para dispositivos Motorola y compatibles.','Cargadores','Motorola','img/products/p39.svg',2,true,false,'2026-04-01','["Negro"]','[{"key":"Potencia","value":"30W"},{"key":"Tecnología","value":"TurboPower"},{"key":"Puerto","value":"USB-C"}]'),
('p40','Cargador GTA 206',20000,'Cargador dual GTA modelo 206. Dos puertos USB para carga simultánea de dispositivos.','Cargadores','GTA','img/products/p40.svg',3,true,false,'2026-04-01','["Blanco"]','[{"key":"Modelo","value":"GTA 206"},{"key":"Puertos","value":"2x USB-A"},{"key":"Potencia","value":"12W"}]'),
('p41','Cargador GTA 207',22000,'Cargador GTA modelo 207 con puerto USB-C. Carga estándar con diseño compacto.','Cargadores','GTA','img/products/p41.svg',2,true,false,'2026-04-01','["Blanco"]','[{"key":"Modelo","value":"GTA 207"},{"key":"Puerto","value":"USB-C + USB-A"}]'),
('p42','Cargador GTA 201',18000,'Cargador GTA modelo 201 básico con puerto USB. Carga estándar para cualquier dispositivo.','Cargadores','GTA','img/products/p42.svg',2,true,false,'2026-04-01','["Blanco"]','[{"key":"Modelo","value":"GTA 201"},{"key":"Puerto","value":"USB-A"}]'),
('p43','Cargador GTA 205',20000,'Cargador GTA modelo 205 con carga rápida. Puerto USB-A con salida optimizada.','Cargadores','GTA','img/products/p43.svg',2,true,false,'2026-04-01','["Blanco"]','[{"key":"Modelo","value":"GTA 205"},{"key":"Puerto","value":"USB-A"},{"key":"Carga rápida","value":"QC 3.0"}]'),
('p44','Cargador Samsung 45W',55000,'Cargador original Samsung de 45W Super Fast Charging. Compatible con Galaxy S y Note series.','Cargadores','Samsung','img/products/p44.svg',4,true,true,'2026-04-01','["Negro","Blanco"]','[{"key":"Potencia","value":"45W"},{"key":"Tecnología","value":"Super Fast Charging 2.0"},{"key":"Puerto","value":"USB-C"},{"key":"Marca","value":"Samsung Original"},{"key":"Compatibilidad","value":"Galaxy S23/S24/S25 series"}]'),
('p45','Cargador Xiaomi 67W',50000,'Cargador original Xiaomi de 67W Turbo Charge. Carga completa en menos de 40 minutos.','Cargadores','Xiaomi','img/products/p45.svg',3,true,true,'2026-04-01','["Blanco"]','[{"key":"Potencia","value":"67W"},{"key":"Tecnología","value":"Turbo Charge"},{"key":"Puerto","value":"USB-C"},{"key":"Marca","value":"Xiaomi Original"}]'),
('p46','Cargador Xiaomi 33W',35000,'Cargador original Xiaomi de 33W. Carga rápida compatible con la línea Redmi y Mi.','Cargadores','Xiaomi','img/products/p46.svg',1,true,false,'2026-04-01','["Blanco"]','[{"key":"Potencia","value":"33W"},{"key":"Puerto","value":"USB-C"},{"key":"Marca","value":"Xiaomi Original"}]'),
('p47','Adaptador 25W Samsung',30000,'Adaptador de carga rápida Samsung de 25W. Super Fast Charging compatible.','Adaptadores','Samsung','img/products/p47.svg',2,true,false,'2026-04-01','["Negro","Blanco"]','[{"key":"Potencia","value":"25W"},{"key":"Puerto","value":"USB-C"},{"key":"Tecnología","value":"Super Fast Charging"}]'),
('p48','Adaptador 45W Samsung',48000,'Adaptador de carga ultra rápida Samsung de 45W. Carga completa en tiempo récord.','Adaptadores','Samsung','img/products/p48.svg',3,true,false,'2026-04-01','["Negro","Blanco"]','[{"key":"Potencia","value":"45W"},{"key":"Puerto","value":"USB-C"},{"key":"Tecnología","value":"Super Fast Charging 2.0"}]'),
('p49','Adaptador 203 GTA',15000,'Adaptador GTA modelo 203 con puerto USB-A. Carga básica para cualquier dispositivo.','Adaptadores','GTA','img/products/p49.svg',2,true,false,'2026-04-01','["Blanco"]','[{"key":"Modelo","value":"GTA 203"},{"key":"Puerto","value":"USB-A"}]'),
('p50','Cable Tipo C Samsung',18000,'Cable USB-C original Samsung. Alta calidad con transferencia de datos y carga rápida.','Cables','Samsung','img/products/p50.svg',3,true,false,'2026-04-01','["Negro","Blanco"]','[{"key":"Conector","value":"USB-C a USB-C"},{"key":"Longitud","value":"1 metro"},{"key":"Marca","value":"Samsung Original"}]'),
('p51','Cable Tipo C a Tipo C 4Play',15000,'Cable USB-C a USB-C marca 4Play. Resistente con transferencia de datos y carga.','Cables','4Play','img/products/p51.svg',2,true,false,'2026-04-01','["Negro"]','[{"key":"Conector","value":"USB-C a USB-C"},{"key":"Longitud","value":"1 metro"}]'),
('p52','Cable USB a Tipo C 4Play',12000,'Cable USB-A a USB-C marca 4Play. Compatible con cargadores y computadores USB-A.','Cables','4Play','img/products/p52.svg',3,true,false,'2026-04-01','["Negro"]','[{"key":"Conector","value":"USB-A a USB-C"},{"key":"Longitud","value":"1 metro"}]'),
('p53','Cable Tipo C a Tipo C GTA 502',14000,'Cable USB-C a USB-C GTA modelo 502. Cable reforzado para carga y datos.','Cables','GTA','img/products/p53.svg',2,true,false,'2026-04-01','["Blanco"]','[{"key":"Modelo","value":"GTA 502"},{"key":"Conector","value":"USB-C a USB-C"}]'),
('p54','Cable USB V8 GTA 501',10000,'Cable USB a Micro USB (V8) GTA modelo 501. Compatible con dispositivos con puerto micro USB.','Cables','GTA','img/products/p54.svg',2,true,false,'2026-04-01','["Blanco"]','[{"key":"Modelo","value":"GTA 501"},{"key":"Conector","value":"USB-A a Micro USB"}]'),
('p55','Cable USB a Tipo C GTA 506',14000,'Cable USB-A a USB-C GTA modelo 506. Cable resistente para carga diaria.','Cables','GTA','img/products/p55.svg',2,true,false,'2026-04-01','["Blanco"]','[{"key":"Modelo","value":"GTA 506"},{"key":"Conector","value":"USB-A a USB-C"}]'),
('p56','Cable USB a Tipo C GTA 504',14000,'Cable USB-A a USB-C GTA modelo 504. Diseño compacto y resistente.','Cables','GTA','img/products/p56.svg',2,true,false,'2026-04-01','["Blanco"]','[{"key":"Modelo","value":"GTA 504"},{"key":"Conector","value":"USB-A a USB-C"}]'),
('p57','Cable HAVIT USB a Tipo C',16000,'Cable USB-A a USB-C marca HAVIT. Cable trenzado de nylon de alta durabilidad.','Cables','HAVIT','img/products/p57.svg',6,true,false,'2026-04-01','["Negro"]','[{"key":"Marca","value":"HAVIT"},{"key":"Conector","value":"USB-A a USB-C"},{"key":"Material","value":"Nylon trenzado"}]'),
('p58','Adaptador Puntilla a Tipo C',8000,'Adaptador de Jack 3.5mm (puntilla) a USB-C. Conecta audífonos con cable a tu teléfono USB-C.','Adaptadores','Genérico','img/products/p58.svg',2,true,false,'2026-04-01','["Blanco"]','[{"key":"Entrada","value":"Jack 3.5mm"},{"key":"Salida","value":"USB-C"}]'),
('p59','Adaptador USB a Micro a Tipo C',6000,'Adaptador 3 en 1: USB, Micro USB y Tipo C. Convierte entre distintos tipos de conexión.','Adaptadores','Genérico','img/products/p59.svg',3,true,false,'2026-04-01','["Negro"]','[{"key":"Tipo","value":"Adaptador multi-conector"},{"key":"Conectores","value":"USB-A, Micro USB, USB-C"}]'),
('p60','Cable USB a Tipo C Motorola',18000,'Cable USB-A a USB-C original Motorola. Compatible con carga TurboPower.','Cables','Motorola','img/products/p60.svg',2,true,false,'2026-04-01','["Negro"]','[{"key":"Marca","value":"Motorola"},{"key":"Conector","value":"USB-A a USB-C"},{"key":"Carga rápida","value":"TurboPower"}]'),
('p61','Cable USB a Tipo C HARVIC',14000,'Cable USB-A a USB-C marca HARVIC. Cable reforzado con carga rápida.','Cables','HARVIC','img/products/p61.svg',3,true,false,'2026-04-01','["Negro"]','[{"key":"Marca","value":"HARVIC"},{"key":"Conector","value":"USB-A a USB-C"}]'),
('p62','Cargador Reloj Inteligente',20000,'Cargador magnético universal para relojes inteligentes. Compatible con múltiples marcas.','Accesorios','Genérico','img/products/p62.svg',3,true,false,'2026-04-01','["Blanco"]','[{"key":"Tipo","value":"Magnético"},{"key":"Compatibilidad","value":"Universal smartwatch"}]'),
('p63','Cable HARVIC Tipo C',16000,'Cable USB-C a USB-C marca HARVIC. Para carga rápida y transferencia de datos.','Cables','HARVIC','img/products/p63.svg',1,true,false,'2026-04-01','["Negro"]','[{"key":"Marca","value":"HARVIC"},{"key":"Conector","value":"USB-C a USB-C"}]'),
('p64','Cable HARVIC USB a V8',12000,'Cable USB-A a Micro USB marca HARVIC. Compatible con dispositivos Micro USB.','Cables','HARVIC','img/products/p64.svg',4,true,false,'2026-04-01','["Negro"]','[{"key":"Marca","value":"HARVIC"},{"key":"Conector","value":"USB-A a Micro USB"}]'),
('p65','Audífonos Xiaomi Buds 4 Lite',85000,'Audífonos inalámbricos Xiaomi Buds 4 Lite. Sonido Hi-Fi, cancelación de ruido y diseño ultraligero.','Audio','Xiaomi','img/products/p65.svg',2,true,true,'2026-04-01','["Blanco","Negro"]','[{"key":"Marca","value":"Xiaomi"},{"key":"Tipo","value":"In-ear TWS"},{"key":"Bluetooth","value":"5.3"},{"key":"ANC","value":"Cancelación de ruido IA"},{"key":"Batería","value":"Hasta 5.5 horas"},{"key":"Resistencia","value":"IP54"}]'),
('p66','Micrófono K8 GT',35000,'Micrófono de solapa inalámbrico K8 GT con receptor compacto. Ideal para TikTok, YouTube y grabaciones.','Accesorios','Genérico','img/products/p66.svg',1,true,false,'2026-04-01','["Negro"]','[{"key":"Tipo","value":"Lavalier inalámbrico"},{"key":"Alcance","value":"Hasta 15m"},{"key":"Compatibilidad","value":"USB-C / Lightning"},{"key":"Batería","value":"Hasta 6 horas"}]')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Crear usuario admin (ejecutar una sola vez)
-- ============================================================
-- Opción 1: Crear desde el Dashboard > Authentication > Users > "Create user"
--   Email: admin@libretechtienda.com
--   Password: LibreTech2026!
--   Luego ejecutar:
-- UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"is_admin": true}'::jsonb WHERE email = 'admin@libretechtienda.com';
