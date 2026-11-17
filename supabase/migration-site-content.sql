-- Run this in Supabase SQL Editor if your project already ran the older schema.
-- Adds the site_content table + RLS so the admin panel can edit the homepage
-- "Our Story" image (uploaded to Cloudinary) and blog/paragraphs.

create table if not exists public.site_content (
  id           uuid primary key default gen_random_uuid(),
  section      text not null unique default 'our-story',
  image_url    text,
  established  text not null default '',
  heading      text not null default '',
  paragraphs   jsonb not null default '[]'::jsonb,
  updated_at   timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- Public read so the storefront (anon key) can show the section;
-- admin-only write via the is_admin() helper used by the other tables.
drop policy if exists "site_content public read" on public.site_content;
drop policy if exists "site_content admin write" on public.site_content;
create policy "site_content public read"
  on public.site_content for select using (true);
create policy "site_content admin write"
  on public.site_content for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_content_touch on public.site_content;
create trigger site_content_touch before update on public.site_content
  for each row execute function public.touch_updated_at();

-- Seed the default Our Story content, matching what the homepage used to
-- hardcode. image_url starts as the bundled prototype image; change it from
-- the admin panel (Our Story → change photo).
insert into public.site_content (section, image_url, established, heading, paragraphs)
values (
  'our-story',
  'images/quality2.jpg',
  'Established 27 May 2022',
  'OG Edibles — where relaxation meets the clouds',
  '["We created this space for the dreamers, the hustlers, and anyone who wants to clock out from the noise for a while. Our passion is connecting you with the finest cannabis products — crafted with care, delivered with discretion.",
    "Whether you''re after relief from stress, a creative spark, or just a chill evening — we''ve got something for you. From premium flower to artisan edibles and infused beverages, everything is hand-picked for quality and consistency.",
    "Our mission is simple: elevated experiences, every time. Real vibes. Good energy. No compromise."]'::jsonb
)
on conflict (section) do nothing;