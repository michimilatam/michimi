-- =====================================================================
-- Favoritos, búsquedas guardadas y panel de administrador.
-- =====================================================================

-- ---------- Búsquedas guardadas ---------------------------------------
alter table saved_searches add column if not exists label text;
alter table saved_searches add column if not exists country text not null default 'PY';
alter table saved_searches add column if not exists notify boolean not null default true;
alter table saved_searches add column if not exists last_seen_at timestamptz not null default now();

-- Cuántas publicaciones nuevas coinciden con cada búsqueda guardada desde la última vez que la abrí.
create or replace function saved_search_counts() returns table (id uuid, nuevos bigint)
language sql stable security definer set search_path = public as $$
  select s.id, (
    select count(*) from listings l
    where l.status = 'activa' and l.country = s.country and l.created_at > s.last_seen_at and l.seller_id <> s.user_id
      and l.kind = coalesce(nullif(s.filters->>'tipo',''), 'producto')
      and (s.query is null or s.query = '' or l.search @@ websearch_to_tsquery('spanish', s.query))
      and (nullif(s.filters->>'cat','') is null or l.category = s.filters->>'cat')
      and (nullif(s.filters->>'sub','') is null or l.subcategory = s.filters->>'sub')
      and (nullif(s.filters->>'region','') is null or l.region = s.filters->>'region' or (s.filters->>'region') = any(l.coverage_regions))
      and (nullif(s.filters->>'cond','') is null or l.condition::text = s.filters->>'cond')
      and (nullif(s.filters->>'cur','') is null or l.currency = s.filters->>'cur')
  ) as nuevos
  from saved_searches s where s.user_id = auth.uid();
$$;
revoke execute on function saved_search_counts() from public, anon;
grant execute on function saved_search_counts() to authenticated;

-- ---------- Administradores --------------------------------------------
alter table profiles add column if not exists is_admin boolean not null default false;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;
grant execute on function is_admin() to anon, authenticated;

-- Nadie se da permisos de admin ni se verifica a sí mismo desde la API.
create or replace function protect_professional_status() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated','anon') then
    if new.is_admin is distinct from old.is_admin then new.is_admin := old.is_admin; end if;
    if new.professional_status is distinct from old.professional_status and not is_admin() then
      new.professional_status := old.professional_status;
    end if;
  end if;
  return new;
end $$;

-- Políticas de admin
drop policy if exists "admin ve verificaciones" on verification_requests;
create policy "admin ve verificaciones" on verification_requests for select using (is_admin());
drop policy if exists "admin resuelve verificaciones" on verification_requests;
create policy "admin resuelve verificaciones" on verification_requests for update using (is_admin());
grant update on verification_requests to authenticated;

drop policy if exists "admin ve denuncias" on reports;
create policy "admin ve denuncias" on reports for select using (is_admin());
drop policy if exists "admin resuelve denuncias" on reports;
create policy "admin resuelve denuncias" on reports for update using (is_admin());

drop policy if exists "admin modera publicaciones" on listings;
create policy "admin modera publicaciones" on listings for update using (is_admin());
drop policy if exists "admin ve todas las publicaciones" on listings;
create policy "admin ve todas las publicaciones" on listings for select using (is_admin());

drop policy if exists "admin ve documentos" on storage.objects;
create policy "admin ve documentos" on storage.objects for select to authenticated
  using (bucket_id = 'verificaciones' and is_admin());

notify pgrst, 'reload schema';
