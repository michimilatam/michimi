-- Catálogo preliminar: productos tomados de la web pública del comercio.
-- NO son publicaciones: nadie los ve hasta que el comercio reclama su tienda,
-- revisa cada producto y lo publica él mismo.

create table if not exists store_products (
  id           uuid primary key default gen_random_uuid(),
  invite_code  text not null references store_invites(code) on delete cascade,
  external_id  text,
  title        text not null,
  description  text,
  price_amount bigint,
  currency     text not null default 'PYG',
  category     text not null default 'muebles',
  subcategory  text,
  image_urls   text[] not null default '{}',
  source_url   text,
  status       text not null default 'pendiente' check (status in ('pendiente','publicado','descartado')),
  listing_id   uuid references listings(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (invite_code, external_id)
);
create index if not exists store_products_invite_idx on store_products (invite_code, status);
alter table store_products enable row level security;

drop policy if exists "admin catalogo" on store_products;
create policy "admin catalogo" on store_products for all using (is_admin()) with check (is_admin());

drop policy if exists "dueño ve su catalogo" on store_products;
create policy "dueño ve su catalogo" on store_products for select
  using (exists (select 1 from store_invites i where i.code = invite_code and i.claimed_by = auth.uid()));
drop policy if exists "dueño actualiza su catalogo" on store_products;
create policy "dueño actualiza su catalogo" on store_products for update
  using (exists (select 1 from store_invites i where i.code = invite_code and i.claimed_by = auth.uid()))
  with check (exists (select 1 from store_invites i where i.code = invite_code and i.claimed_by = auth.uid()));

drop policy if exists "dueño ve su invitacion" on store_invites;
create policy "dueño ve su invitacion" on store_invites for select using (claimed_by = auth.uid());

-- La página de reclamo muestra cuántos productos hay preparados.
drop function if exists store_invite_info(text);
create or replace function store_invite_info(p_code text)
returns table (name text, slug text, status text, products int)
language sql security definer set search_path = public stable as $$
  select i.name, i.slug, i.status,
         (select count(*)::int from store_products p where p.invite_code = i.code and p.status = 'pendiente')
  from store_invites i where i.code = p_code;
$$;
grant execute on function store_invite_info(text) to anon, authenticated;

notify pgrst, 'reload schema';
