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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='images') THEN
    ALTER TABLE products ADD COLUMN images jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- 1a. Create Storage bucket for product images (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read, only authenticated users can upload
DO $$
BEGIN
  -- Public read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'product-images-public-read' AND tablename = 'objects') THEN
    CREATE POLICY "product-images-public-read" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
  END IF;
  -- Authenticated upload
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'product-images-auth-insert' AND tablename = 'objects') THEN
    CREATE POLICY "product-images-auth-insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');
  END IF;
  -- Authenticated update
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'product-images-auth-update' AND tablename = 'objects') THEN
    CREATE POLICY "product-images-auth-update" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
  END IF;
  -- Authenticated delete
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'product-images-auth-delete' AND tablename = 'objects') THEN
    CREATE POLICY "product-images-auth-delete" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
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
  created_at timestamptz DEFAULT now()
);

-- Add all columns to orders (safe if they already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='user_id') THEN
    ALTER TABLE orders ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_name') THEN
    ALTER TABLE orders ADD COLUMN customer_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_email') THEN
    ALTER TABLE orders ADD COLUMN customer_email text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='customer_phone') THEN
    ALTER TABLE orders ADD COLUMN customer_phone text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='method') THEN
    ALTER TABLE orders ADD COLUMN method text DEFAULT 'contraentrega';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='status') THEN
    ALTER TABLE orders ADD COLUMN status text DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='total') THEN
    ALTER TABLE orders ADD COLUMN total numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='items') THEN
    ALTER TABLE orders ADD COLUMN items jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

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
  created_at timestamptz DEFAULT now()
);

-- Add all columns to pqrs (safe if they already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pqrs' AND column_name='user_id') THEN
    ALTER TABLE pqrs ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pqrs' AND column_name='user_email') THEN
    ALTER TABLE pqrs ADD COLUMN user_email text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pqrs' AND column_name='type') THEN
    ALTER TABLE pqrs ADD COLUMN type text DEFAULT 'peticion';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pqrs' AND column_name='subject') THEN
    ALTER TABLE pqrs ADD COLUMN subject text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pqrs' AND column_name='message') THEN
    ALTER TABLE pqrs ADD COLUMN message text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pqrs' AND column_name='status') THEN
    ALTER TABLE pqrs ADD COLUMN status text DEFAULT 'open';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pqrs' AND column_name='admin_reply') THEN
    ALTER TABLE pqrs ADD COLUMN admin_reply text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pqrs' AND column_name='updated_at') THEN
    ALTER TABLE pqrs ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

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
  created_at timestamptz DEFAULT now()
);

-- Add all columns to reviews (safe if they already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='product_id') THEN
    ALTER TABLE reviews ADD COLUMN product_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='user_id') THEN
    ALTER TABLE reviews ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='user_name') THEN
    ALTER TABLE reviews ADD COLUMN user_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='rating') THEN
    ALTER TABLE reviews ADD COLUMN rating integer NOT NULL DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='comment') THEN
    ALTER TABLE reviews ADD COLUMN comment text DEFAULT '';
  END IF;
END $$;

-- Add check constraint for rating if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name='reviews' AND constraint_name='reviews_rating_check') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

-- ============================================================
-- 8. site_config — Store banners, social links, and other settings
--    key (text PK) → value (jsonb)
--    Keys used: 'visual_banners', 'social_links'
-- ============================================================
CREATE TABLE IF NOT EXISTS site_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read site config (public storefront needs banners/social)
DROP POLICY IF EXISTS "Anyone can read site_config" ON site_config;
CREATE POLICY "Anyone can read site_config"
  ON site_config FOR SELECT
  USING (true);

-- Only admin can insert
DROP POLICY IF EXISTS "Admin can insert site_config" ON site_config;
CREATE POLICY "Admin can insert site_config"
  ON site_config FOR INSERT
  TO authenticated
  WITH CHECK ( public.is_admin() );

-- Only admin can update
DROP POLICY IF EXISTS "Admin can update site_config" ON site_config;
CREATE POLICY "Admin can update site_config"
  ON site_config FOR UPDATE
  TO authenticated
  USING ( public.is_admin() );

-- ============================================================
-- 9. customer_profiles — User shipping/contact data for orders
-- ============================================================
CREATE TABLE IF NOT EXISTS customer_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text DEFAULT '',
  phone text DEFAULT '',
  document_type text DEFAULT 'CC',
  document_number text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  department text DEFAULT '',
  neighborhood text DEFAULT '',
  zip_code text DEFAULT '',
  notes text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS "Users can read own customer_profile" ON customer_profiles;
CREATE POLICY "Users can read own customer_profile"
  ON customer_profiles FOR SELECT
  TO authenticated
  USING ( user_id = auth.uid() OR public.is_admin() );

-- Users can insert their own profile
DROP POLICY IF EXISTS "Users can insert own customer_profile" ON customer_profiles;
CREATE POLICY "Users can insert own customer_profile"
  ON customer_profiles FOR INSERT
  TO authenticated
  WITH CHECK ( user_id = auth.uid() );

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own customer_profile" ON customer_profiles;
CREATE POLICY "Users can update own customer_profile"
  ON customer_profiles FOR UPDATE
  TO authenticated
  USING ( user_id = auth.uid() );

-- Allow anon reads of site_config (for non-logged-in users to see banners)
DROP POLICY IF EXISTS "Anon can read site_config" ON site_config;
CREATE POLICY "Anon can read site_config"
  ON site_config FOR SELECT
  TO anon
  USING (true);

-- Allow anon orders (guest checkout)
DROP POLICY IF EXISTS "Anon can insert orders" ON orders;
CREATE POLICY "Anon can insert orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

-- ============================================================
-- 10. coupons — Discount coupons management
-- ============================================================
CREATE TABLE IF NOT EXISTS coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'percentage',
  value numeric NOT NULL DEFAULT 0,
  min_purchase numeric DEFAULT 0,
  max_uses integer DEFAULT 0,
  current_uses integer DEFAULT 0,
  expires_at timestamptz,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can read coupons (for validation at checkout)
DROP POLICY IF EXISTS "Anyone can read coupons" ON coupons;
CREATE POLICY "Anyone can read coupons"
  ON coupons FOR SELECT
  USING (true);

-- Only admin can insert coupons
DROP POLICY IF EXISTS "Admin can insert coupons" ON coupons;
CREATE POLICY "Admin can insert coupons"
  ON coupons FOR INSERT
  TO authenticated
  WITH CHECK ( public.is_admin() );

-- Only admin can update coupons
DROP POLICY IF EXISTS "Admin can update coupons" ON coupons;
CREATE POLICY "Admin can update coupons"
  ON coupons FOR UPDATE
  TO authenticated
  USING ( public.is_admin() );

-- Only admin can delete coupons
DROP POLICY IF EXISTS "Admin can delete coupons" ON coupons;
CREATE POLICY "Admin can delete coupons"
  ON coupons FOR DELETE
  TO authenticated
  USING ( public.is_admin() );

-- Anon can read coupons for guest validation
DROP POLICY IF EXISTS "Anon can read coupons" ON coupons;
CREATE POLICY "Anon can read coupons"
  ON coupons FOR SELECT
  TO anon
  USING (true);
