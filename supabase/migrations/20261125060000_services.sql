-- =====================================================================
-- Servicios profesionales: publicaciones de servicio, pedidos de
-- presupuesto, perfil profesional y verificación.
-- =====================================================================

-- ---------- Publicaciones de servicio --------------------------------
alter table listings add column if not exists kind text not null default 'producto' check (kind in ('producto','servicio'));
alter table listings add column if not exists price_type text not null default 'fijo' check (price_type in ('fijo','desde','hora','presupuesto'));
alter table listings add column if not exists coverage_regions text[] not null default '{}';
alter table listings add column if not exists schedule text;
alter table listings alter column price_amount drop not null;
alter table listings alter column condition drop not null;
alter table listings drop constraint if exists listings_price_amount_check;
alter table listings drop constraint if exists listings_price_by_type;
alter table listings add constraint listings_price_by_type
  check (price_type = 'presupuesto' or (price_amount is not null and price_amount > 0));
alter table listings drop constraint if exists listings_condition_for_products;
alter table listings add constraint listings_condition_for_products
  check (kind = 'servicio' or condition is not null);
create index if not exists listings_kind_idx on listings (country, kind, status, created_at desc);

-- ---------- Perfil profesional ----------------------------------------
alter table profiles add column if not exists profession text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists professional_status text not null default 'ninguno'
  check (professional_status in ('ninguno','pendiente','verificado','rechazado'));

-- El estado de verificación solo lo cambia un administrador (service_role / panel de Supabase).
create or replace function protect_professional_status() returns trigger
language plpgsql as $$
begin
  if new.professional_status is distinct from old.professional_status
     and current_user in ('authenticated','anon') then
    new.professional_status := old.professional_status;
  end if;
  return new;
end $$;
drop trigger if exists profiles_protect_status on profiles;
create trigger profiles_protect_status before update on profiles
  for each row execute function protect_professional_status();

-- ---------- Solicitudes de verificación -------------------------------
create table if not exists verification_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references profiles(id) on delete cascade,
  profession      text not null,
  document_path   text not null,          -- bucket privado "verificaciones"
  credential_path text,                   -- título / matrícula (opcional)
  note            text,
  status          text not null default 'pendiente' check (status in ('pendiente','aprobada','rechazada')),
  reviewer_note   text,
  created_at      timestamptz not null default now()
);
alter table verification_requests enable row level security;
drop policy if exists "pido mi verificación" on verification_requests;
create policy "pido mi verificación" on verification_requests for insert with check (user_id = auth.uid() and status = 'pendiente');
drop policy if exists "veo mis verificaciones" on verification_requests;
create policy "veo mis verificaciones" on verification_requests for select using (user_id = auth.uid());
grant select, insert on verification_requests to authenticated;

-- Al pedir verificación, el perfil pasa a "pendiente". Al aprobar/rechazar (admin), se refleja en el perfil.
create or replace function sync_verification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles set
    professional_status = case new.status when 'aprobada' then 'verificado' when 'rechazada' then 'rechazado' else 'pendiente' end,
    profession = new.profession
  where id = new.user_id;
  return new;
end $$;
drop trigger if exists verification_sync on verification_requests;
create trigger verification_sync after insert or update of status on verification_requests
  for each row execute function sync_verification();

insert into storage.buckets (id, name, public) values ('verificaciones','verificaciones', false)
  on conflict (id) do nothing;
drop policy if exists "subo mi verificación" on storage.objects;
create policy "subo mi verificación" on storage.objects for insert to authenticated
  with check (bucket_id = 'verificaciones' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "veo mi verificación" on storage.objects;
create policy "veo mi verificación" on storage.objects for select to authenticated
  using (bucket_id = 'verificaciones' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Pedidos de presupuesto ------------------------------------
create table if not exists service_requests (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null default auth.uid() references profiles(id) on delete cascade,
  subcategory text not null,
  title       text not null check (char_length(trim(title)) > 0),
  description text not null default '',
  country     text not null default 'PY' references countries(code),
  region      text not null,
  city        text not null,
  when_text   text,
  budget_hint bigint,
  currency    text references currencies(code),
  status      text not null default 'abierto' check (status in ('abierto','adjudicado','cerrado')),
  created_at  timestamptz not null default now()
);
create index if not exists service_requests_browse on service_requests (country, status, region, created_at desc);
alter table service_requests enable row level security;
drop policy if exists "ver pedidos" on service_requests;
create policy "ver pedidos" on service_requests for select using (status = 'abierto' or client_id = auth.uid());
drop policy if exists "crear mi pedido" on service_requests;
create policy "crear mi pedido" on service_requests for insert with check (client_id = auth.uid());
drop policy if exists "editar mi pedido" on service_requests;
create policy "editar mi pedido" on service_requests for update using (client_id = auth.uid());
grant select on service_requests to anon, authenticated;
grant insert, update on service_requests to authenticated;

-- ---------- Conversaciones y operaciones sobre pedidos -----------------
-- Una conversación es sobre una publicación O sobre un pedido.
-- En un pedido: el cliente es el "comprador" y el profesional el "vendedor".
alter table conversations alter column listing_id drop not null;
alter table conversations add column if not exists request_id uuid references service_requests(id) on delete cascade;
alter table conversations drop constraint if exists conversations_subject;
alter table conversations add constraint conversations_subject check ((listing_id is null) <> (request_id is null));
create unique index if not exists conversations_request_pro on conversations (request_id, seller_id) where request_id is not null;

alter table operations alter column listing_id drop not null;
alter table operations add column if not exists request_id uuid references service_requests(id);

-- El profesional abre (o reutiliza) la conversación con el cliente de un pedido.
create or replace function start_request_conversation(p_request uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare r service_requests; v_id uuid;
begin
  select * into r from service_requests where id = p_request and status = 'abierto';
  if r.id is null then raise exception 'El pedido ya no está abierto'; end if;
  if r.client_id = auth.uid() then raise exception 'Es tu propio pedido'; end if;
  select id into v_id from conversations where request_id = p_request and seller_id = auth.uid();
  if v_id is null then
    insert into conversations (request_id, buyer_id, seller_id) values (p_request, r.client_id, auth.uid()) returning id into v_id;
  end if;
  return v_id;
end $$;

-- start_conversation para publicaciones (servicios incluidos)
create or replace function start_conversation(p_listing uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_id uuid;
begin
  select seller_id into v_seller from listings where id = p_listing and status = 'activa';
  if v_seller is null then raise exception 'Publicación no disponible'; end if;
  if v_seller = auth.uid() then raise exception 'Es tu propia publicación'; end if;
  select id into v_id from conversations where listing_id = p_listing and buyer_id = auth.uid();
  if v_id is null then
    insert into conversations (listing_id, buyer_id, seller_id) values (p_listing, auth.uid(), v_seller) returning id into v_id;
  end if;
  return v_id;
end $$;

-- Aceptar oferta: productos se reservan; servicios no (se pueden contratar muchas veces); pedidos se adjudican.
create or replace function accept_offer(p_offer uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare o offers; c conversations; v_kind text; v_op uuid; v_msg text;
begin
  select * into o from offers where id = p_offer for update;
  select * into c from conversations where id = o.conversation_id;
  if o.status <> 'pendiente' or o.expires_at < now() then raise exception 'La oferta ya no está vigente'; end if;
  if auth.uid() not in (c.buyer_id, c.seller_id) or auth.uid() = o.created_by then
    raise exception 'Solo la contraparte puede aceptar';
  end if;
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
  if op.seller_id <> auth.uid() then raise exception 'Solo el vendedor o profesional confirma'; end if;
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
  if auth.uid() not in (op.buyer_id, op.seller_id) then raise exception 'Sin acceso'; end if;
  if op.status <> 'reservada' then raise exception 'La operación no está abierta'; end if;
  update operations set status = 'cancelada', cancelled_by = auth.uid() where id = p_operation;
  if op.request_id is not null then
    update service_requests set status = 'abierto' where id = op.request_id;
  else
    update listings set status = 'activa' where id = op.listing_id and kind = 'producto';
  end if;
end $$;

revoke execute on function start_request_conversation(uuid) from public, anon;
grant execute on function start_request_conversation(uuid), start_conversation(uuid), accept_offer(uuid),
  complete_operation(uuid, text), cancel_operation(uuid) to authenticated;
notify pgrst, 'reload schema';
