-- ============================================================
-- LIBRE TECH — Arreglo: los pedidos no se guardan y el stock no baja
--
-- COMO USARLO
--   Supabase -> tu proyecto -> SQL Editor -> New query -> pega todo -> Run.
--   Es seguro ejecutarlo varias veces.
--
-- Acompana a los cambios ya hechos en js/supabase-client.js. Hacen falta los
-- dos lados: sin este SQL el sitio sigue sin poder guardar ni descontar.
-- ============================================================


-- ------------------------------------------------------------
-- PASO 1 — Permitir que un invitado cree su pedido
--
-- "Pide y paga en casa" no obliga a iniciar sesion, asi que quien compra usa
-- el rol anon. La unica politica de insercion que habia era para el rol
-- authenticated, de modo que el invitado chocaba contra RLS:
--   new row violates row-level security policy for table "orders"
--
-- El rol public abarca anon y authenticated.
--
-- OJO: esto abre UNICAMENTE la insercion. Leer, editar y borrar pedidos
-- siguen como estaban (solo el dueno del pedido o el admin), asi que nadie
-- puede consultar los datos de otros clientes.
-- ------------------------------------------------------------
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public order inserts" ON orders;
CREATE POLICY "Allow public order inserts"
  ON orders FOR INSERT
  TO public
  WITH CHECK (true);


-- ------------------------------------------------------------
-- PASO 2 — Descontar inventario desde un pedido de invitado
--
-- La tabla products solo deja actualizar al admin, y esta bien que siga asi:
-- abrirla al publico permitiria que cualquiera cambiara nombres y precios.
-- SECURITY DEFINER hace que esta funcion corra con los permisos de su dueno,
-- de modo que el descuento funcione sin tocar esas politicas.
--
-- Solo modifica la columna stock y nunca la deja por debajo de cero.
--
-- Esta funcion es la que el sitio ya intentaba llamar (por eso el nombre), y
-- que hasta ahora no existia en la base.
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
-- PASO 3 — Comprobaciones
-- ------------------------------------------------------------

-- 3a. Debe aparecer "Allow public order inserts" con cmd = INSERT
SELECT policyname, cmd, roles
  FROM pg_policies
 WHERE tablename = 'orders'
 ORDER BY cmd;

-- 3b. Debe devolver una fila con prosecdef = true (SECURITY DEFINER)
SELECT proname, prosecdef
  FROM pg_proc
 WHERE proname = 'decrement_stock_if_possible';


-- ------------------------------------------------------------
-- PASO 4 — Prueba de humo (opcional, se deshace sola)
--
-- Comprueba que la funcion descuenta bien sin dejar rastro: abre una
-- transaccion, descuenta 1 unidad del primer producto con stock y hace
-- ROLLBACK. Ejecuta el bloque completo de una vez.
-- ------------------------------------------------------------
-- BEGIN;
--   SELECT id, name, stock AS stock_antes FROM products WHERE stock > 0 LIMIT 1;
--   SELECT public.decrement_stock_if_possible(
--            (SELECT id FROM products WHERE stock > 0 LIMIT 1), 1
--          ) AS stock_despues;
-- ROLLBACK;


-- ------------------------------------------------------------
-- NOTA — Si los pedidos tampoco se BORRAN desde el panel, el arreglo de eso
-- es otro: database/fix_eliminar_pedidos.sql
-- ------------------------------------------------------------
