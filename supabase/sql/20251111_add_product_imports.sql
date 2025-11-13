-- Product Import Staging Tables

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  marketplace text not null,
  query text,
  max_results integer,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  error text,
  started_at timestamptz default timezone('utc', now()),
  finished_at timestamptz
);

create table if not exists public.imported_products (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.import_jobs (id) on delete set null,
  marketplace text not null,
  source_url text not null,
  supplier_name text,
  supplier_rating numeric,
  supplier_review_count integer,
  category_trail text[],
  name text not null,
  description text,
  price_min numeric,
  price_max numeric,
  currency text,
  moq integer,
  lead_time_days integer,
  quality_overall integer not null default 0,
  quality_reasons text[] default '{}',
  quality_metrics jsonb default '{}'::jsonb,
  images text[] default '{}',
  normalized_payload jsonb not null,
  raw_payload jsonb,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  reviewer_id uuid references auth.users (id),
  reviewed_at timestamptz,
  category_id uuid references public.categories (id),
  subcategory_id uuid references public.subcategories (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists imported_products_status_idx on public.imported_products (review_status);
create index if not exists imported_products_job_idx on public.imported_products (job_id);

alter table public.imported_products enable row level security;
alter table public.import_jobs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'import_jobs' and policyname = 'import_jobs_owner'
  ) then
    execute '
      create policy import_jobs_owner
      on public.import_jobs
      for all
      using (auth.uid() is not null)
      with check (auth.uid() is not null)
    ';
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'imported_products' and policyname = 'imported_products_owner'
  ) then
    execute '
      create policy imported_products_owner
      on public.imported_products
      for all
      using (auth.uid() is not null)
      with check (auth.uid() is not null)
    ';
  end if;
end;
$$;

create or replace function public.touch_imported_products()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists imported_products_set_updated_at on public.imported_products;

create trigger imported_products_set_updated_at
before update on public.imported_products
for each row
execute function public.touch_imported_products();

