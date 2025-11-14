-- Ensure the "Pet Supply" category exists along with the "Accessory" subcategory
with upsert_category as (
  insert into public.categories (name, slug)
  values ('Pet Supply', 'pet-supply')
  on conflict (slug) do update
    set name = excluded.name
  returning id
)
insert into public.subcategories (category_id, name, slug)
select id, 'Accessory', 'accessory'
from upsert_category
on conflict (category_id, slug) do update
  set name = excluded.name;

