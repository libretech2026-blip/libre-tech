-- ============================================================
-- LIBRE TECH — Supabase Setup SQL
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add ALL missing columns to products table
DO $$
BEGIN
  -- Base columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='description') THEN
    ALTER TABLE products ADD COLUMN description text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='category') THEN
    ALTER TABLE products ADD COLUMN category text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='brand') THEN
    ALTER TABLE products ADD COLUMN brand text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_url') THEN
    ALTER TABLE products ADD COLUMN image_url text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='stock') THEN
    ALTER TABLE products ADD COLUMN stock integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='active') THEN
    ALTER TABLE products ADD COLUMN active boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='featured') THEN
    ALTER TABLE products ADD COLUMN featured boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='created_at') THEN
    ALTER TABLE products ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
  -- Extended columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='colors') THEN
    ALTER TABLE products ADD COLUMN colors jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='specs') THEN
    ALTER TABLE products ADD COLUMN specs jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='offer_active') THEN
    ALTER TABLE products ADD COLUMN offer_active boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='offer_price') THEN
    ALTER TABLE products ADD COLUMN offer_price numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='offer_percent') THEN
    ALTER TABLE products ADD COLUMN offer_percent numeric DEFAULT 0;
  END IF;
END $$;

-- 1b. Helper: check if current user is admin (SECURITY DEFINER so it can read auth.users)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  user_email text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  RETURN user_email IN ('admin@libretechtienda.com', 'libretech2026@gmail.com');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 1c. RLS policies for products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Anyone can READ products (public storefront)
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone"
  ON products FOR SELECT
  USING (true);

-- Only admin can INSERT
DROP POLICY IF EXISTS "Admin can insert products" ON products;
CREATE POLICY "Admin can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK ( public.is_admin() );

-- Only admin can UPDATE
DROP POLICY IF EXISTS "Admin can update products" ON products;
CREATE POLICY "Admin can update products"
  ON products FOR UPDATE
  TO authenticated
  USING ( public.is_admin() );

-- Only admin can DELETE
DROP POLICY IF EXISTS "Admin can delete products" ON products;
CREATE POLICY "Admin can delete products"
  ON products FOR DELETE
  TO authenticated
  USING ( public.is_admin() );

-- 2. Create profiles table (mirrors auth.users for admin queries)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  last_sign_in_at timestamptz
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2b. Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text DEFAULT '',
  customer_email text DEFAULT '',
  customer_phone text DEFAULT '',
  method text DEFAULT 'contraentrega',
  status text DEFAULT 'pending',
  total numeric DEFAULT 0,
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can insert orders (placing an order)
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
CREATE POLICY "Users can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can see their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING ( user_id = auth.uid() OR public.is_admin() );

-- Admin can update orders (status changes)
DROP POLICY IF EXISTS "Admin can update orders" ON orders;
CREATE POLICY "Admin can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING ( public.is_admin() );

-- 2c. Create pqrs table
CREATE TABLE IF NOT EXISTS pqrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text DEFAULT '',
  type text DEFAULT 'peticion',
  subject text DEFAULT '',
  message text DEFAULT '',
  status text DEFAULT 'open',
  admin_reply text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pqrs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert pqrs" ON pqrs;
CREATE POLICY "Users can insert pqrs"
  ON pqrs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own pqrs" ON pqrs;
CREATE POLICY "Users can view own pqrs"
  ON pqrs FOR SELECT
  TO authenticated
  USING ( user_id = auth.uid() OR public.is_admin() );

DROP POLICY IF EXISTS "Admin can update pqrs" ON pqrs;
CREATE POLICY "Admin can update pqrs"
  ON pqrs FOR UPDATE
  TO authenticated
  USING ( public.is_admin() );

-- 2d. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text DEFAULT '',
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reviews" ON reviews;
CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert reviews" ON reviews;
CREATE POLICY "Users can insert reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin can delete reviews" ON reviews;
CREATE POLICY "Admin can delete reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING ( public.is_admin() );

-- Policy: anyone can read profiles (admin will use this)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Policy: users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 3. Trigger to auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, last_sign_in_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.created_at,
    NEW.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    last_sign_in_at = EXCLUDED.last_sign_in_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. RPC function: list all users (admin only)
CREATE OR REPLACE FUNCTION list_users()
RETURNS TABLE(id uuid, email text, full_name text, created_at timestamptz, last_sign_in_at timestamptz)
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = auth.uid()
    AND au.email IN ('admin@libretechtienda.com', 'libretech2026@gmail.com')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  RETURN QUERY
    SELECT u.id, u.email::text, 
           COALESCE(u.raw_user_meta_data->>'full_name', '')::text AS full_name,
           u.created_at, u.last_sign_in_at
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RPC function: admin delete user
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id uuid)
RETURNS void AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = auth.uid()
    AND au.email IN ('admin@libretechtienda.com', 'libretech2026@gmail.com')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Don't allow deleting self
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;

  -- Delete from auth.users (cascades to profiles)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC function: admin update user password
CREATE OR REPLACE FUNCTION admin_update_password(target_user_id uuid, new_password text)
RETURNS void AS $$
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = auth.uid()
    AND au.email IN ('admin@libretechtienda.com', 'libretech2026@gmail.com')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Update password via auth schema
  UPDATE auth.users 
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Populate profiles from existing users
INSERT INTO profiles (id, email, full_name, created_at, last_sign_in_at)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', ''), created_at, last_sign_in_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  last_sign_in_at = EXCLUDED.last_sign_in_at;
