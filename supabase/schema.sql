-- =====================================================================
-- Pérez Muebles & Colchones — estructura de la base de datos (Supabase)
-- Ejecutar una vez en: Supabase -> SQL Editor -> New query -> Run
-- =====================================================================

-- Productos ------------------------------------------------------------
create table if not exists public.products (
  id           text primary key,
  code         text not null,
  name         text not null,
  description  text not null default '',
  category     text not null,
  subcategory  text,
  brand        text,
  size         text,          -- colchones: 1 plaza, 2 plazas, Queen...
  measure      text,          -- colchones: 140x190
  material     text,          -- colchones: resortes | espuma
  kind         text,          -- colchones: colchon | conjunto
  model        text,          -- agrupa el mismo modelo en distintas medidas
  colors       text[] not null default '{}',
  price_list   numeric,       -- precio de lista publicado (null = consultar)
  discount_pct numeric not null default 0,
  available    boolean not null default true,
  featured     boolean not null default false,
  images       text[] not null default '{}',
  sort         integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category, subcategory);

-- Configuración (un solo registro con id = 1) --------------------------
-- Guarda descuento en efectivo, planes de financiación con sus coeficientes y datos de la tienda.
create table if not exists public.settings (
  id   integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb
);
insert into public.settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;

-- Administradores --------------------------------------------------------
-- Solo los usuarios que estén en esta tabla pueden modificar la tienda.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Permisos (Row Level Security) -----------------------------------------
alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.admins   enable row level security;

drop policy if exists "catalogo publico" on public.products;
create policy "catalogo publico" on public.products for select using (true);
drop policy if exists "admins editan productos" on public.products;
create policy "admins editan productos" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "config publica" on public.settings;
create policy "config publica" on public.settings for select using (true);
drop policy if exists "admins editan config" on public.settings;
create policy "admins editan config" on public.settings for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "cada admin se ve a si mismo" on public.admins;
create policy "cada admin se ve a si mismo" on public.admins for select using (user_id = auth.uid());

-- Fotos de productos (Storage) -----------------------------------------
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = true;

drop policy if exists "fotos publicas" on storage.objects;
create policy "fotos publicas" on storage.objects for select using (bucket_id = 'productos');
drop policy if exists "admins suben fotos" on storage.objects;
create policy "admins suben fotos" on storage.objects for insert with check (bucket_id = 'productos' and public.is_admin());
drop policy if exists "admins editan fotos" on storage.objects;
create policy "admins editan fotos" on storage.objects for update using (bucket_id = 'productos' and public.is_admin());
drop policy if exists "admins borran fotos" on storage.objects;
create policy "admins borran fotos" on storage.objects for delete using (bucket_id = 'productos' and public.is_admin());
