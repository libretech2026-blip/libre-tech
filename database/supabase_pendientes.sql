-- ============================================================
-- LIBRE TECH — Todo lo pendiente en Supabase, en un solo archivo
--
-- Reune los tres cambios de base de datos de esta tanda:
--   1. Que un invitado pueda crear su pedido          (pedidos no se guardaban)
--   2. Funcion para descontar inventario              (stock no bajaba)
--   3. Borrado de pedidos desde el panel              (no se eliminaban)
--
-- Sustituye a fix_pedidos_y_stock.sql y fix_eliminar_pedidos.sql: si ya
-- ejecutaste alguno de esos, este no rompe nada — es idempotente y se puede
-- correr las veces que quieras.
--
-- COMO USARLO
--   Supabase -> tu proyecto -> SQL Editor -> New query -> pega todo -> Run.
--   Empieza por la PARTE 0 para ver que te falta; el resto lo arregla.
-- ============================================================


-- ------------------------------------------------------------
-- PARTE 0 — Diagnostico: que hay y que falta
-- Ejecutala sola primero si quieres ver el estado antes de cambiar nada.
-- ------------------------------------------------------------
SELECT 'Pedidos de invitado (INSERT para public)' AS requisito,
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'orders' AND cmd = 'INSERT'
            AND 'public' = ANY(roles::text[])
       ) THEN 'OK' ELSE 'FALTA' END AS estado
UNION ALL
SELECT 'Funcion decrement_stock_if_possible (SECURITY DEFINER)',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc
          WHERE proname = 'decrement_stock_if_possible'
            AND pronamespace = 'public'::regnamespace
            AND prosecdef
       ) THEN 'OK' ELSE 'FALTA' END
UNION ALL
SELECT 'Politica para borrar pedidos',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'orders' AND cmd = 'DELETE'
       ) THEN 'OK' ELSE 'FALTA' END
UNION ALL
SELECT 'is_admin() tambien mira los metadatos',
       CASE WHEN EXISTS (
         SELECT 1 FROM pg_proc
          WHERE proname = 'is_admin'
            AND pronamespace = 'public'::regnamespace
            AND pg_get_functiondef(oid) LIKE '%raw_user_meta_data%'
       ) THEN 'OK' ELSE 'FALTA' END
UNION ALL
SELECT 'Bucket product-images admite GIF',
       CASE WHEN EXISTS (
         SELECT 1 FROM storage.buckets
          WHERE id = 'product-images'
            AND (allowed_mime_types IS NULL OR 'image/gif' = ANY(allowed_mime_types))
       ) THEN 'OK' ELSE 'REVISAR' END;


-- ------------------------------------------------------------
-- PARTE 1 — Que un invitado pueda crear su pedido
--
-- "Pide y paga en casa" no obliga a iniciar sesion, asi que quien compra usa
-- el rol anon. La unica politica de insercion era para authenticated, y el
-- invitado chocaba contra RLS:
--   new row violates row-level security policy for table "orders"
--
-- Se abre UNICAMENTE la insercion. Leer, editar y borrar siguen restringidos
-- al dueno del pedido o al admin: nadie puede consultar datos de otros.
-- ------------------------------------------------------------
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public order inserts" ON orders;
CREATE POLICY "Allow public order inserts"
  ON orders FOR INSERT
  TO public
  WITH CHECK (true);


-- ------------------------------------------------------------
-- PARTE 2 — Descontar inventario desde un pedido de invitado
--
-- products solo deja actualizar al admin, y debe seguir asi: abrirlo al
-- publico permitiria que cualquiera cambiara nombres y precios.
-- SECURITY DEFINER hace que la funcion corra con los permisos de su dueno.
-- Solo toca la columna stock y nunca la deja por debajo de cero.
--
-- El sitio ya llamaba a esta funcion; simplemente no existia en la base.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrement_stock_if_possible(p_id uuid, p_qty integer)
RETURNS integer AS $$
DECLARE
  nuevo_stock integer;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RETURN NULL;
  END IF;

  UPDATE products
     SET stock = GREATEST(0, COALESCE(stock, 0) - p_qty)
   WHERE id = p_id
  RETURNING stock INTO nuevo_stock;

  RETURN nuevo_stock;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.decrement_stock_if_possible(uuid, integer) TO anon, authenticated;


-- ------------------------------------------------------------
-- PARTE 3 — Borrado de pedidos desde el panel
--
-- is_admin() solo miraba el correo, mientras que el frontend acepta ademas la
-- marca is_admin en los metadatos. Un admin marcado solo por metadatos pulsaba
-- "Eliminar" y la base borraba 0 filas SIN lanzar error (asi funciona RLS),
-- de modo que el pedido reaparecia al recargar.
--
-- SI TU CORREO NO ESTA EN LA LISTA, AGREGALO ABAJO.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  u record;
BEGIN
  SELECT email, raw_user_meta_data, raw_app_meta_data
    INTO u
    FROM auth.users
   WHERE id = auth.uid();

  IF u IS NULL THEN
    RETURN false;
  END IF;

  IF COALESCE(u.raw_user_meta_data->>'is_admin', '') = 'true'
     OR COALESCE(u.raw_app_meta_data->>'is_admin', '') = 'true' THEN
    RETURN true;
  END IF;

  RETURN lower(u.email) IN (
    'admin@libretechtienda.com',
    'libretechtienda@gmail.com',
    'libretech2026@gmail.com'
    -- , 'tu-correo@ejemplo.com'   <-- agrega aqui tu correo si hace falta
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Admin can delete orders" ON orders;
CREATE POLICY "Admin can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING ( public.is_admin() );

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING ( user_id = auth.uid() OR public.is_admin() );

DROP POLICY IF EXISTS "Admin can update orders" ON orders;
CREATE POLICY "Admin can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING ( public.is_admin() );


-- ------------------------------------------------------------
-- PARTE 4 — Comprobacion final
-- Vuelve a correr la PARTE 0: las cinco filas deben decir OK.
-- Y aqui quien es admin hoy y por que via:
-- ------------------------------------------------------------
SELECT email,
       COALESCE(raw_user_meta_data->>'is_admin', '') = 'true' AS admin_por_metadatos,
       lower(email) IN (
         'admin@libretechtienda.com',
         'libretechtienda@gmail.com',
         'libretech2026@gmail.com'
       ) AS admin_por_correo
  FROM auth.users
 ORDER BY email;


-- ============================================================
-- OPCIONALES — solo si te topas con el problema
-- ============================================================

-- A) Si al subir un GIF el panel avisa de formato o tamano no admitidos.
--    Ojo: si hoy allowed_mime_types esta en NULL, el bucket acepta TODO y no
--    hace falta tocarlo; esto lo restringiria a esos cuatro tipos.
-- UPDATE storage.buckets
--    SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'],
--        file_size_limit    = 8388608
--  WHERE id = 'product-images';

-- B) Marcar un usuario como admin por metadatos, en vez de tocar la lista de
--    correos de la PARTE 3. Hay que cerrar sesion y volver a entrar despues.
-- UPDATE auth.users
--    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
--                             || '{"is_admin": true}'::jsonb
--  WHERE email = 'tu-correo@ejemplo.com';

-- C) Prueba de humo del descuento de stock: descuenta 1 unidad y lo deshace.
--    Ejecuta el bloque completo de una vez.
-- BEGIN;
--   SELECT id, name, stock AS stock_antes FROM products WHERE stock > 0 LIMIT 1;
--   SELECT public.decrement_stock_if_possible(
--            (SELECT id FROM products WHERE stock > 0 LIMIT 1), 1
--          ) AS stock_despues;
-- ROLLBACK;
