-- Fix RLS policies for signup to work
-- Run this in the Supabase SQL Editor

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to insert their own advocate profile
CREATE POLICY "Users can insert their own advocate profile"
ON advocate_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to read their own advocate profile
CREATE POLICY "Users can read their own advocate profile"
ON advocate_profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow authenticated users to insert their own brand profile
CREATE POLICY "Users can insert their own brand profile"
ON brand_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow authenticated users to read their own brand profile
CREATE POLICY "Users can read their own brand profile"
ON brand_profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);
