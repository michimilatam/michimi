-- =====================================================================
-- Estadísticas para quien publica: visitas (únicas por día), compartidos,
-- favoritos, consultas y ofertas. Solo el dueño ve las de sus avisos.
-- =====================================================================
create table if not exists listing_events (
  listing_id uuid not null references listings(id) on delete cascade,
  kind       text not null check (kind in ('view','share')),
  viewer_key text not null,           -- usuario o identificador anónimo del navegador
  day        date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (listing_id, kind, viewer_key, day)
);
create index if not exists listing_events_by_listing on listing_events (listing_id, kind, day);
alter table listing_events enable row level security;   -- sin políticas: solo vía funciones

create or replace function record_listing_event(p_listing uuid, p_kind text, p_key text) returns void
language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_key text;
begin
  if p_kind not in ('view','share') then return; end if;
  select seller_id into v_seller from listings where id = p_listing and deleted_at is null;
  if v_seller is null or v_seller = auth.uid() then return; end if;   -- el dueño no suma visitas
  v_key := coalesce(auth.uid()::text, left(coalesce(p_key, 'anon'), 64));
  insert into listing_events (listing_id, kind, viewer_key) values (p_listing, p_kind, v_key)
  on conflict do nothing;
end $$;
grant execute on function record_listing_event(uuid, text, text) to anon, authenticated;

create or replace function my_listing_stats(p_ids uuid[]) returns table (
  listing_id uuid, views bigint, views_7d bigint, views_today bigint, shares bigint,
  favorites bigint, chats bigint, offers bigint
) language sql stable security definer set search_path = public as $$
  select l.id,
    (select count(*) from listing_events e where e.listing_id = l.id and e.kind = 'view'),
    (select count(*) from listing_events e where e.listing_id = l.id and e.kind = 'view' and e.day > current_date - 7),
    (select count(*) from listing_events e where e.listing_id = l.id and e.kind = 'view' and e.day = current_date),
    (select count(*) from listing_events e where e.listing_id = l.id and e.kind = 'share'),
    (select count(*) from favorites f where f.listing_id = l.id),
    (select count(*) from conversations c where c.listing_id = l.id),
    (select count(*) from offers o join conversations c on c.id = o.conversation_id where c.listing_id = l.id)
  from listings l where l.id = any(p_ids) and l.seller_id = auth.uid();
$$;
grant execute on function my_listing_stats(uuid[]) to authenticated;

create or replace function my_listing_daily(p_listing uuid) returns table (day date, views bigint)
language sql stable security definer set search_path = public as $$
  select d::date, (select count(*) from listing_events e where e.listing_id = p_listing and e.kind = 'view' and e.day = d::date)
  from generate_series(current_date - 13, current_date, interval '1 day') d
  where exists (select 1 from listings where id = p_listing and seller_id = auth.uid())
  order by 1;
$$;
grant execute on function my_listing_daily(uuid) to authenticated;
notify pgrst, 'reload schema';
