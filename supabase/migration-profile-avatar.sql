-- Run this in Supabase SQL Editor if your project already had the older schema.
-- Adds display_name + avatar_url for admin profile pictures (Cloudinary URLs).

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;

-- Admins can already update profiles via "profiles admin write".
-- No extra policy required for avatar_url / display_name.
