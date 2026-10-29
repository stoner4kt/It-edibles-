-- ============================================================
-- OG EDIBLES1738 – Supabase schema (replaces Firebase/Firestore)
-- Run this in the Supabase SQL Editor against your project.
--
-- After running:
--   1. Create an admin user in Authentication → Users
--   2. Copy their UUID and run:
--        INSERT INTO public.profiles (id, email, is_admin)
--        VALUES ('<user-uuid>', '<admin@example.com>', true);
--   3. Create the `product-images` storage bucket (Storage → New bucket,
--      public, file size limit 5 MB) and apply the storage policy below.
--   4. Enable email + password AND email-only providers in auth settings
--      (for admin auth-by-magic-link). If you want password logins only,
--      keep email/password enabled and set ENABLE_PASSWORD_LOGIN = true
--      when calling the admin function.
-- ============================================================

-- ─── Tables ──────────────────────────────────────────────────
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price       numeric not null check (price >= 0),
  stock       integer not null default 0 check (stock >= 0),
  category    text not null default '',
  description text not null default '',
  image_url   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  order_id     text not null,
  customer_name text not null,
  total_amount numeric not null check (total_amount >= 0),
  items        jsonb not null default '[]'::jsonb,
  whatsapp     text not null default '',
  email        text not null default '',
  address      text not null default '',
  notes        text not null default '',
  status       text not null default 'pending'
               check (status in ('pending','confirmed','delivered','cancelled')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─── Reviews ─────────────────────────────────────────────────
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  rating     integer not null check (rating between 1 and 5),
  comment    text not null,
  created_at timestamptz not null default now()
);

-- ─── Profiles (admin flags) ──────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders   enable row level security;
alter table public.reviews  enable row level security;
alter table public.profiles enable row level security;

-- ─── Admin helper (defined before any policy that calls it) ──
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- ─── Policies ────────────────────────────────────────────────
drop policy if exists "products public read"  on public.products;
drop policy if exists "products admin write"  on public.products;
create policy "products public read"
  on public.products for select using (true);
create policy "products admin write"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- Orders are admin-only at every level.
drop policy if exists "orders public insert" on public.orders;
drop policy if exists "orders admin read"    on public.orders;
drop policy if exists "orders admin update"  on public.orders;
drop policy if exists "orders admin delete"  on public.orders;
-- No insert policy on purpose: orders are written by the checkout Netlify
-- function using the service_role key, which bypasses RLS. Letting the public
-- anon key insert would allow forged orders.
create policy "orders admin read"
  on public.orders for select using (public.is_admin());
create policy "orders admin update"
  on public.orders for update
  using (public.is_admin()) with check (public.is_admin());
create policy "orders admin delete"
  on public.orders for delete using (public.is_admin());

drop policy if exists "reviews public read"   on public.reviews;
drop policy if exists "reviews public insert" on public.reviews;
create policy "reviews public read"
  on public.reviews for select using (true);
create policy "reviews public insert"
  on public.reviews for insert with check (true);

drop policy if exists "profiles self read"   on public.profiles;
drop policy if exists "profiles admin write" on public.profiles;
create policy "profiles self read"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles admin write"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (new.id, new.email, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ─── Storage: product images ─────────────────────────────────
-- Run this from the SQL editor as well; it allows public read of
-- the product-images bucket and authenticated uploads.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "product-images public read" on storage.objects;
drop policy if exists "product-images auth upload" on storage.objects;
drop policy if exists "product-images auth update" on storage.objects;
drop policy if exists "product-images auth delete" on storage.objects;

create policy "product-images public read"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "product-images auth upload"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "product-images auth update"
  on storage.objects for update
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "product-images auth delete"
  on storage.objects for delete
  using (bucket_id = 'product-images' and auth.role() = 'authenticated');