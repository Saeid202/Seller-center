-- Ensure shipping metrics columns exist for products and PostgREST cache reloads
alter table public.products
  add column if not exists seller_id uuid references auth.users(id) on delete cascade,
  add column if not exists status product_status not null default 'draft',
  add column if not exists slug text,
  add column if not exists inventory integer,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now()),
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists subcategory_id uuid references public.subcategories(id) on delete set null,
  add column if not exists hs_code text,
  add column if not exists min_order_quantity integer,
  add column if not exists lead_time_days integer,
  add column if not exists packaging_length_cm numeric(10, 2),
  add column if not exists packaging_width_cm numeric(10, 2),
  add column if not exists packaging_height_cm numeric(10, 2),
  add column if not exists packaging_weight_kg numeric(10, 2),
  add column if not exists moq integer not null default 1,
  add column if not exists cartons_per_moq numeric(12, 2),
  add column if not exists pallets_per_moq numeric(12, 2),
  add column if not exists containers_20ft_per_moq numeric(12, 2),
  add column if not exists containers_40ft_per_moq numeric(12, 2),
  add column if not exists shipping_notes text;

-- Backfill slug values where missing to satisfy not-null constraint
update public.products
set slug = coalesce(
  slug,
  regexp_replace(lower(coalesce(name, 'product')), '[^a-z0-9]+', '-', 'g') || '-' || substr(id::text, 1, 6)
)
where slug is null;

alter table public.products
  alter column slug set not null;

create unique index if not exists products_slug_key on public.products (slug);

alter table public.products
  alter column inventory drop not null;

create or replace function public.touch_products()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;

create trigger products_set_updated_at
before update on public.products
for each row
execute function public.touch_products();

-- Ensure product_images table exists with RLS policies for owner access
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists product_images_product_id_idx on public.product_images (product_id);

alter table public.product_images enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_images'
      and policyname = 'Product images are visible to owners'
  ) then
    execute '
      create policy "Product images are visible to owners"
        on public.product_images
        for select
        using (
          auth.uid() is not null and exists (
            select 1
            from public.products p
            where p.id = product_images.product_id
              and p.seller_id = auth.uid()
          )
        )
    ';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'product_images'
      and policyname = 'Product images can be managed by owners'
  ) then
    execute '
      create policy "Product images can be managed by owners"
        on public.product_images
        using (
          auth.uid() is not null and exists (
            select 1
            from public.products p
            where p.id = product_images.product_id
              and p.seller_id = auth.uid()
          )
        )
        with check (
          auth.uid() is not null and exists (
            select 1
            from public.products p
            where p.id = product_images.product_id
              and p.seller_id = auth.uid()
          )
        )
    ';
  end if;
end;
$$;

-- Force PostgREST to reload schema so the new columns are available immediately
do $$
begin
  perform pg_notify('pgrst', 'reload schema');
end;
$$;

