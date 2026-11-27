-- =====================================================================
-- Comercios con equipo.
-- Un comercio (stores) es independiente de las cuentas: tiene un dueño y
-- miembros. Los miembros hacen todo (publicar, editar, chatear, ofertar,
-- confirmar entregas) menos borrar el comercio o manejar el equipo.
-- Las publicaciones del comercio tienen store_id; su seller_id es siempre
-- el dueño (la cuenta responsable ante compradores y calificaciones).
-- =====================================================================

create table if not exists stores (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name        text not null check (char_length(name) between 2 and 80),
  bio         text,
  avatar_url  text,
  website     text,
  instagram   text,
  phone       text,
  city        text,
  region      text,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table if not exists store_members (
  store_id   uuid not null references stores(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       text not null default 'miembro' check (role in ('dueño','miembro')),
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create unique index if not exists store_one_owner on store_members (store_id) where role = 'dueño';
create index if not exists store_members_user_idx on store_members (user_id);

alter table listings add column if not exists store_id uuid references stores(id);
create index if not exists listings_store_idx on listings (store_id, status, created_at desc) where store_id is not null;
alter table store_invites add column if not exists store_id uuid references stores(id);

-- ---------- helpers ----------
create or replace function is_store_member(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from store_members m join stores s on s.id = m.store_id
                 where m.store_id = p_store and m.user_id = auth.uid() and s.deleted_at is null);
$$;

create or replace function is_store_owner(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from store_members m join stores s on s.id = m.store_id
                 where m.store_id = p_store and m.user_id = auth.uid() and m.role = 'dueño' and s.deleted_at is null);
$$;

-- ¿Puedo manejar esta publicación? (propia o de un comercio donde soy miembro)
create or replace function can_manage_listing(p_listing uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from listings l where l.id = p_listing
                 and (l.seller_id = auth.uid() or (l.store_id is not null and is_store_member(l.store_id))));
$$;

-- ¿Estoy del lado vendedor de esta conversación/operación?
create or replace function acts_as_seller(p_seller uuid, p_listing uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_seller = auth.uid()
      or (p_listing is not null and exists (select 1 from listings l where l.id = p_listing and l.store_id is not null and is_store_member(l.store_id)));
$$;

grant execute on function is_store_member(uuid), is_store_owner(uuid), can_manage_listing(uuid), acts_as_seller(uuid, uuid) to authenticated, anon;

-- ---------- RLS de comercios ----------
alter table stores enable row level security;
alter table store_members enable row level security;
drop policy if exists "comercios públicos" on stores;
create policy "comercios públicos" on stores for select using (deleted_at is null or is_admin());
drop policy if exists "miembros editan el comercio" on stores;
create policy "miembros editan el comercio" on stores for update using (is_store_member(id)) with check (is_store_member(id));
drop policy if exists "ver equipo" on store_members;
create policy "ver equipo" on store_members for select using (is_store_member(store_id) or is_admin());
grant select on stores to anon, authenticated;
grant update (name, bio, avatar_url, website, instagram, phone, city, region) on stores to authenticated;
grant select on store_members to authenticated;

-- ---------- publicaciones ----------
-- El seller_id de una publicación de comercio es siempre el dueño.
create or replace function set_store_seller() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.store_id is not null then
    if not exists (select 1 from store_members where store_id = new.store_id and user_id = auth.uid())
       and current_user in ('authenticated','anon') then
      raise exception 'No sos parte de ese comercio';
    end if;
    select user_id into new.seller_id from store_members where store_id = new.store_id and role = 'dueño';
  end if;
  return new;
end $$;
drop trigger if exists set_store_seller on listings;
create trigger set_store_seller before insert or update of store_id on listings for each row execute function set_store_seller();

drop policy if exists "ver publicaciones" on listings;
create policy "ver publicaciones" on listings for select
  using (deleted_at is null and (status <> 'pausada' or seller_id = auth.uid() or (store_id is not null and is_store_member(store_id))));
drop policy if exists "crear mi publicación" on listings;
create policy "crear mi publicación" on listings for insert
  with check ((store_id is null and seller_id = auth.uid()) or (store_id is not null and is_store_member(store_id)));
drop policy if exists "editar mi publicación" on listings;
create policy "editar mi publicación" on listings for update
  using (seller_id = auth.uid() or (store_id is not null and is_store_member(store_id)));
drop policy if exists "borrar mi publicación" on listings;
create policy "borrar mi publicación" on listings for delete
  using ((seller_id = auth.uid() or (store_id is not null and is_store_member(store_id))) and status <> 'reservada');

drop policy if exists "mis fotos" on listing_photos;
create policy "mis fotos" on listing_photos for all
  using (can_manage_listing(listing_id)) with check (can_manage_listing(listing_id));

-- ---------- chat, ofertas y operaciones ----------
drop policy if exists "mis conversaciones" on conversations;
create policy "mis conversaciones" on conversations for select
  using (auth.uid() = buyer_id or acts_as_seller(seller_id, listing_id));

drop policy if exists "leer mensajes" on messages;
create policy "leer mensajes" on messages for select
  using (exists (select 1 from conversations c where c.id = conversation_id and (auth.uid() = c.buyer_id or acts_as_seller(c.seller_id, c.listing_id))));
drop policy if exists "enviar mensaje" on messages;
create policy "enviar mensaje" on messages for insert
  with check (sender_id = auth.uid() and kind = 'texto' and
    exists (select 1 from conversations c where c.id = conversation_id and (auth.uid() = c.buyer_id or acts_as_seller(c.seller_id, c.listing_id))));

drop policy if exists "leer ofertas" on offers;
create policy "leer ofertas" on offers for select
  using (exists (select 1 from conversations c where c.id = conversation_id and (auth.uid() = c.buyer_id or acts_as_seller(c.seller_id, c.listing_id))));

drop policy if exists "mis operaciones" on operations;
create policy "mis operaciones" on operations for select
  using (auth.uid() = buyer_id or acts_as_seller(seller_id, listing_id));

create or replace function unread_counts() returns table (conversation_id uuid, unread bigint)
language sql stable security invoker set search_path = public as $$
  select m.conversation_id, count(*)
  from messages m
  join conversations c on c.id = m.conversation_id
  left join conversation_reads r on r.conversation_id = m.conversation_id and r.user_id = auth.uid()
  where (auth.uid() = c.buyer_id or acts_as_seller(c.seller_id, c.listing_id))
    and m.sender_id is distinct from auth.uid()
    -- del lado comercio, lo que escribió un compañero no cuenta como "no leído"
    and not (auth.uid() <> c.buyer_id and m.sender_id is not null and m.sender_id <> c.buyer_id)
    and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
  group by m.conversation_id;
$$;

create or replace function start_conversation(p_listing uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_id uuid;
begin
  select seller_id into v_seller from listings where id = p_listing and status = 'activa' and deleted_at is null;
  if v_seller is null then raise exception 'Publicación no disponible'; end if;
  if can_manage_listing(p_listing) then raise exception 'Es tu propia publicación'; end if;
  select id into v_id from conversations where listing_id = p_listing and buyer_id = auth.uid();
  if v_id is null then
    insert into conversations (listing_id, buyer_id, seller_id) values (p_listing, auth.uid(), v_seller) returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function make_offer(p_conversation uuid, p_amount bigint, p_currency text, p_parent uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare c conversations; v_id uuid;
begin
  select * into c from conversations where id = p_conversation;
  if not (auth.uid() = c.buyer_id or acts_as_seller(c.seller_id, c.listing_id)) then raise exception 'Sin acceso'; end if;
  if p_parent is not null then
    update offers set status = 'contraofertada' where id = p_parent and status = 'pendiente';
  end if;
  insert into offers (conversation_id, created_by, amount, currency, parent_offer_id)
  values (p_conversation, auth.uid(), p_amount, p_currency, p_parent) returning id into v_id;
  insert into messages (conversation_id, sender_id, kind, body, offer_id)
  values (p_conversation, auth.uid(), 'oferta', 'Oferta', v_id);
  return v_id;
end $$;

create or replace function accept_offer(p_offer uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare o offers; c conversations; v_kind text; v_op uuid; v_msg text; v_me_buyer boolean; v_creator_buyer boolean;
begin
  select * into o from offers where id = p_offer for update;
  select * into c from conversations where id = o.conversation_id;
  if o.status <> 'pendiente' or o.expires_at < now() then raise exception 'La oferta ya no está vigente'; end if;
  if not (auth.uid() = c.buyer_id or acts_as_seller(c.seller_id, c.listing_id)) then raise exception 'Sin acceso'; end if;
  v_me_buyer := auth.uid() = c.buyer_id;
  v_creator_buyer := o.created_by = c.buyer_id;
  if v_me_buyer = v_creator_buyer then raise exception 'Solo la contraparte puede aceptar'; end if;
  update offers set status = 'aceptada' where id = p_offer;

  if c.request_id is not null then
    update service_requests set status = 'adjudicado' where id = c.request_id and status = 'abierto';
    if not found then raise exception 'El pedido ya fue adjudicado'; end if;
    v_msg := 'Presupuesto aceptado. El cliente tiene un PIN para confirmar el trabajo terminado.';
  else
    select kind into v_kind from listings where id = c.listing_id;
    if v_kind = 'servicio' then
      perform 1 from listings where id = c.listing_id and status = 'activa';
      if not found then raise exception 'El servicio ya no está disponible'; end if;
      v_msg := 'Contratación confirmada. El cliente tiene un PIN para confirmar el trabajo terminado.';
    else
      update listings set status = 'reservada' where id = c.listing_id and status = 'activa';
      if not found then raise exception 'La publicación ya no está disponible'; end if;
      v_msg := 'Oferta aceptada. Producto reservado. El comprador tiene un PIN de entrega en la operación.';
    end if;
  end if;

  insert into operations (listing_id, request_id, offer_id, buyer_id, seller_id, amount, currency)
  values (c.listing_id, c.request_id, p_offer, c.buyer_id, c.seller_id, o.amount, o.currency) returning id into v_op;
  insert into operation_pins values (v_op, lpad((floor(random()*1000000))::int::text, 6, '0'));
  insert into messages (conversation_id, kind, body) values (c.id, 'sistema', v_msg);
  return v_op;
end $$;

create or replace function complete_operation(p_operation uuid, p_pin text) returns void
language plpgsql security definer set search_path = public as $$
declare op operations;
begin
  select * into op from operations where id = p_operation for update;
  if not acts_as_seller(op.seller_id, op.listing_id) then raise exception 'Solo el vendedor o profesional confirma'; end if;
  if op.status <> 'reservada' then raise exception 'La operación no está abierta'; end if;
  if not exists (select 1 from operation_pins where operation_id = p_operation and pin = p_pin) then
    raise exception 'PIN incorrecto';
  end if;
  update operations set status = 'completada', completed_at = now() where id = p_operation;
  if op.request_id is not null then
    update service_requests set status = 'cerrado' where id = op.request_id;
  else
    update listings set status = 'vendida' where id = op.listing_id and kind = 'producto';
  end if;
end $$;

create or replace function cancel_operation(p_operation uuid) returns void
language plpgsql security definer set search_path = public as $$
declare op operations;
begin
  select * into op from operations where id = p_operation for update;
  if not (auth.uid() = op.buyer_id or acts_as_seller(op.seller_id, op.listing_id)) then raise exception 'Sin acceso'; end if;
  if op.status <> 'reservada' then raise exception 'La operación no está abierta'; end if;
  update operations set status = 'cancelada', cancelled_by = auth.uid() where id = p_operation;
  if op.request_id is not null then
    update service_requests set status = 'abierto' where id = op.request_id;
  else
    update listings set status = 'activa' where id = op.listing_id and kind = 'producto';
  end if;
end $$;

create or replace function delete_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from listings where id = p_listing and deleted_at is null) or not can_manage_listing(p_listing) then
    raise exception 'No podés borrar esta publicación';
  end if;
  if exists (select 1 from operations where listing_id = p_listing and status = 'reservada') then
    raise exception 'Tiene una operación en curso. Cancelala o terminala antes de borrar.';
  end if;
  update listings set deleted_at = now(), status = 'pausada' where id = p_listing;
  update offers set status = 'retirada' where status = 'pendiente'
    and conversation_id in (select id from conversations where listing_id = p_listing);
end $$;

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
  from listings l where l.id = any(p_ids) and can_manage_listing(l.id);
$$;

-- El equipo del comercio no suma visitas.
create or replace function record_listing_event(p_listing uuid, p_kind text, p_key text) returns void
language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_key text;
begin
  if p_kind not in ('view','share') then return; end if;
  select seller_id into v_seller from listings where id = p_listing and deleted_at is null;
  if v_seller is null or can_manage_listing(p_listing) then return; end if;
  v_key := coalesce(auth.uid()::text, left(coalesce(p_key, 'anon'), 64));
  insert into listing_events (listing_id, kind, viewer_key) values (p_listing, p_kind, v_key)
  on conflict do nothing;
end $$;

create or replace function my_listing_daily(p_listing uuid) returns table (day date, views bigint)
language sql stable security definer set search_path = public as $$
  select d::date, (select count(*) from listing_events e where e.listing_id = p_listing and e.kind = 'view' and e.day = d::date)
  from generate_series(current_date - 13, current_date, interval '1 day') d
  where can_manage_listing(p_listing)
  order by 1;
$$;

-- Los comercios no tienen el límite de cuenta nueva.
create or replace function guard_listing() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_created timestamptz; n int;
begin
  if new.store_id is not null or coalesce((select is_admin from profiles where id = new.seller_id), false) then return new; end if;
  select created_at into v_created from profiles where id = new.seller_id;
  select count(*) into n from listings where seller_id = new.seller_id and created_at > now() - interval '24 hours';
  if v_created > now() - interval '48 hours' and n >= 5 then
    raise exception 'Las cuentas nuevas pueden publicar hasta 5 avisos por día. Probá mañana.';
  end if;
  if n >= 40 then raise exception 'Llegaste al límite de 40 publicaciones por día.'; end if;
  return new;
end $$;

-- ---------- reclamar: ahora crea el comercio y te hace dueño ----------
create or replace function claim_store(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare v store_invites; v_uid uuid := auth.uid(); v_store uuid;
begin
  if v_uid is null then raise exception 'Tenés que ingresar para reclamar la tienda'; end if;
  select * into v from store_invites where code = p_code for update;
  if v.code is null then raise exception 'Código inválido'; end if;
  if v.status = 'descartada' then raise exception 'Esta invitación ya no está vigente'; end if;
  if v.status = 'reclamada' then
    if exists (select 1 from store_members where store_id = v.store_id and user_id = v_uid) then return v.slug; end if;
    raise exception 'Esta tienda ya fue reclamada. Pedile al dueño que te sume al equipo.';
  end if;
  if exists (select 1 from stores where slug = v.slug) then raise exception 'La dirección de la tienda ya está en uso'; end if;
  insert into stores (slug, name, website, instagram, phone, city)
  values (v.slug, v.name, v.website, v.instagram, v.phone, v.city) returning id into v_store;
  insert into store_members (store_id, user_id, role) values (v_store, v_uid, 'dueño');
  update store_invites set status = 'reclamada', claimed_by = v_uid, claimed_at = now(), store_id = v_store where code = p_code;
  return v.slug;
end $$;

-- Catálogo preparado: lo ve y lo publica cualquier miembro del comercio.
drop policy if exists "dueño ve su catalogo" on store_products;
create policy "dueño ve su catalogo" on store_products for select
  using (exists (select 1 from store_invites i where i.code = invite_code and i.store_id is not null and is_store_member(i.store_id)));
drop policy if exists "dueño actualiza su catalogo" on store_products;
create policy "dueño actualiza su catalogo" on store_products for update
  using (exists (select 1 from store_invites i where i.code = invite_code and i.store_id is not null and is_store_member(i.store_id)))
  with check (exists (select 1 from store_invites i where i.code = invite_code and i.store_id is not null and is_store_member(i.store_id)));
drop policy if exists "dueño ve su invitacion" on store_invites;
create policy "dueño ve su invitacion" on store_invites for select using (store_id is not null and is_store_member(store_id));

-- ---------- equipo ----------
create or replace function add_store_member(p_store uuid, p_email text) returns text
language plpgsql security definer set search_path = public, auth as $$
declare v_user uuid; v_name text;
begin
  if not is_store_owner(p_store) then raise exception 'Solo el dueño suma personas al equipo'; end if;
  select u.id into v_user from auth.users u join profiles p on p.id = u.id
   where lower(u.email) = lower(trim(p_email)) and p.deleted_at is null;
  if v_user is null then raise exception 'No hay una cuenta de Michimi con ese email. Pedile que se registre primero.'; end if;
  insert into store_members (store_id, user_id, role) values (p_store, v_user, 'miembro') on conflict do nothing;
  select display_name into v_name from profiles where id = v_user;
  return v_name;
end $$;

create or replace function remove_store_member(p_store uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (is_store_owner(p_store) or p_user = auth.uid()) then raise exception 'Solo el dueño saca personas del equipo'; end if;
  if exists (select 1 from store_members where store_id = p_store and user_id = p_user and role = 'dueño') then
    raise exception 'El dueño no puede salir del comercio. Si querés cerrarlo, borralo.';
  end if;
  delete from store_members where store_id = p_store and user_id = p_user;
end $$;

create or replace function delete_store(p_store uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_store_owner(p_store) then raise exception 'Solo el dueño puede borrar el comercio'; end if;
  if exists (select 1 from operations o join listings l on l.id = o.listing_id where l.store_id = p_store and o.status = 'reservada') then
    raise exception 'El comercio tiene operaciones en curso. Terminalas o cancelalas antes de borrarlo.';
  end if;
  update offers set status = 'retirada' where status = 'pendiente'
    and conversation_id in (select c.id from conversations c join listings l on l.id = c.listing_id where l.store_id = p_store);
  update listings set deleted_at = now(), status = 'pausada' where store_id = p_store and deleted_at is null;
  update stores set deleted_at = now(), slug = slug || '-borrada-' || substr(md5(random()::text), 1, 6) where id = p_store;
  delete from store_members where store_id = p_store;
end $$;

revoke execute on function add_store_member(uuid, text), remove_store_member(uuid, uuid), delete_store(uuid) from public, anon;
grant execute on function add_store_member(uuid, text), remove_store_member(uuid, uuid), delete_store(uuid) to authenticated;

-- Borrar la cuenta: si es dueño de un comercio activo, primero tiene que borrarlo.
create or replace function block_owner_account_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null
     and exists (select 1 from store_members m join stores s on s.id = m.store_id
                 where m.user_id = new.id and m.role = 'dueño' and s.deleted_at is null) then
    raise exception 'Sos dueño de un comercio. Borralo primero desde la página del comercio.';
  end if;
  if new.deleted_at is not null and old.deleted_at is null then
    delete from store_members where user_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists block_owner_account_delete on profiles;
create trigger block_owner_account_delete before update of deleted_at on profiles for each row execute function block_owner_account_delete();

-- ---------- pasar las tiendas del modelo anterior (perfil = tienda) ----------
do $$
declare p record; v_store uuid;
begin
  for p in select * from profiles where is_store and store_slug is not null and deleted_at is null loop
    if not exists (select 1 from stores where slug = p.store_slug) then
      insert into stores (slug, name, bio, avatar_url, website, instagram, phone, city, region)
      values (p.store_slug, p.display_name, p.bio, p.avatar_url, p.store_website, p.store_instagram, p.store_phone, p.city, p.region)
      returning id into v_store;
      insert into store_members (store_id, user_id, role) values (v_store, p.id, 'dueño');
      update listings set store_id = v_store where seller_id = p.id and deleted_at is null;
      update store_invites set store_id = v_store where claimed_by = p.id and slug = p.store_slug;
    end if;
  end loop;
  update profiles set is_store = false, store_slug = null where is_store;
end $$;

notify pgrst, 'reload schema';
