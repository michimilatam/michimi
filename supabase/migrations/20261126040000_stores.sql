-- Piloto de comercios: tienda gratis sobre el perfil + invitación para reclamarla.

alter table profiles add column if not exists is_store boolean not null default false;
alter table profiles add column if not exists store_slug text unique;
alter table profiles add column if not exists store_website text;
alter table profiles add column if not exists store_instagram text;
alter table profiles add column if not exists store_phone text;

-- is_store y store_slug solo los cambia Michimi (admin o el RPC de reclamo).
create or replace function protect_professional_status() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated','anon') and not coalesce((select is_admin from profiles where id = auth.uid()), false) then
    if new.professional_status is distinct from old.professional_status then new.professional_status := old.professional_status; end if;
    if new.is_store is distinct from old.is_store then new.is_store := old.is_store; end if;
    if new.store_slug is distinct from old.store_slug then new.store_slug := old.store_slug; end if;
  end if;
  return new;
end $$;

create table if not exists store_invites (
  code        text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  name        text not null,
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  contact     text,
  website     text,
  instagram   text,
  phone       text,
  city        text,
  note        text,
  status      text not null default 'creada' check (status in ('creada','enviada','reclamada','descartada')),
  claimed_by  uuid references profiles(id) on delete set null,
  claimed_at  timestamptz,
  created_at  timestamptz not null default now()
);
alter table store_invites enable row level security;
drop policy if exists "admin invitaciones" on store_invites;
create policy "admin invitaciones" on store_invites for all using (is_admin()) with check (is_admin());

-- Vista pública mínima para la página /reclamar/<code> (sin datos de contacto).
create or replace function store_invite_info(p_code text)
returns table (name text, slug text, status text)
language sql security definer set search_path = public stable as $$
  select name, slug, status from store_invites where code = p_code;
$$;
grant execute on function store_invite_info(text) to anon, authenticated;

create or replace function claim_store(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare v store_invites; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Tenés que ingresar para reclamar la tienda'; end if;
  select * into v from store_invites where code = p_code for update;
  if v.code is null then raise exception 'Código inválido'; end if;
  if v.status = 'reclamada' and v.claimed_by is distinct from v_uid then raise exception 'Esta tienda ya fue reclamada'; end if;
  if v.status = 'descartada' then raise exception 'Esta invitación ya no está vigente'; end if;
  if exists (select 1 from profiles where store_slug = v.slug and id <> v_uid) then raise exception 'La dirección de la tienda ya está en uso'; end if;

  update profiles set
    is_store = true,
    store_slug = v.slug,
    display_name = v.name,
    store_website = coalesce(store_website, v.website),
    store_instagram = coalesce(store_instagram, v.instagram),
    store_phone = coalesce(store_phone, v.phone),
    city = coalesce(city, v.city)
  where id = v_uid;

  update store_invites set status = 'reclamada', claimed_by = v_uid, claimed_at = coalesce(claimed_at, now()) where code = p_code;
  return v.slug;
end $$;
grant execute on function claim_store(text) to authenticated;

-- Comercios en el piloto: sin límite de cuenta nueva para subir su catálogo.
create or replace function guard_listing() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_created timestamptz; n int;
begin
  if coalesce((select is_admin or is_store from profiles where id = new.seller_id), false) then return new; end if;
  select created_at into v_created from profiles where id = new.seller_id;
  select count(*) into n from listings where seller_id = new.seller_id and created_at > now() - interval '24 hours';
  if v_created > now() - interval '48 hours' and n >= 5 then
    raise exception 'Las cuentas nuevas pueden publicar hasta 5 avisos por día. Probá mañana.';
  end if;
  if n >= 40 then raise exception 'Llegaste al límite de 40 publicaciones por día.'; end if;
  return new;
end $$;

notify pgrst, 'reload schema';
