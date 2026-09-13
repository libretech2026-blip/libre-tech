-- ============================================================
-- LIBRE TECH — Arreglo: "no se eliminan los pedidos"
--
-- COMO USARLO
--   Supabase → tu proyecto → SQL Editor → New query → pega todo → Run.
--   Es seguro ejecutarlo varias veces.
--
-- POR QUE PASA
--   La tabla `orders` tiene RLS activo. Si falta la politica de DELETE, o si
--   public.is_admin() devuelve false para tu usuario, el borrado NO lanza
--   error: simplemente afecta a 0 filas. El pedido desaparece de la pantalla
--   (se borro la copia local) y reaparece al recargar, porque en la base
--   sigue estando.
-- ============================================================


-- ------------------------------------------------------------
-- PASO 1 — Quien es administrador
--
-- Debe coincidir con SB.isAdmin() de js/supabase-client.js: vale la marca
-- is_admin en los metadatos O estar en la lista de correos.
-- Si tu correo no es ninguno de los tres, agregalo a la lista de abajo.
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


-- ------------------------------------------------------------
-- PASO 2 — Politicas de la tabla orders
-- ------------------------------------------------------------
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Esta es la que suele faltar: sin ella no se puede borrar nada
DROP POLICY IF EXISTS "Admin can delete orders" ON orders;
CREATE POLICY "Admin can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING ( public.is_admin() );

-- El admin tambien debe poder verlos y cambiarles el estado
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
-- PASO 3 — Comprobaciones
-- ------------------------------------------------------------

-- 3a. Deben aparecer las politicas de SELECT, UPDATE y DELETE sobre orders
SELECT policyname, cmd
  FROM pg_policies
 WHERE tablename = 'orders'
 ORDER BY cmd;

-- 3b. Correos que hoy son administradores por lista o por metadatos
SELECT email,
       COALESCE(raw_user_meta_data->>'is_admin', '') = 'true' AS admin_por_metadatos,
       lower(email) IN (
         'admin@libretechtienda.com',
         'libretechtienda@gmail.com',
         'libretech2026@gmail.com'
       ) AS admin_por_correo
  FROM auth.users
 ORDER BY email;


-- ------------------------------------------------------------
-- OPCIONAL — Marcar un usuario como admin por metadatos
-- (alternativa a tocar la lista de correos del PASO 1)
-- ------------------------------------------------------------
-- UPDATE auth.users
--    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
--                             || '{"is_admin": true}'::jsonb
--  WHERE email = 'tu-correo@ejemplo.com';
--
-- Despues de cambiar los metadatos hay que cerrar sesion y volver a entrar
-- para que el token traiga la marca nueva.


-- ------------------------------------------------------------
-- NOTA sobre el bucket de imagenes (GIFs animados)
-- Si al subir un GIF el panel avisa de un error de formato o de tamano,
-- ejecuta tambien esto:
-- ------------------------------------------------------------
-- UPDATE storage.buckets
--    SET allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'],
--        file_size_limit    = 8388608
--  WHERE id = 'product-images';
