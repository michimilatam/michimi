-- =====================================================================
-- Michimi — esquema inicial (MVP v1)
-- Marketplace C2C · Paraguay por defecto · moneda local + USD
-- Montos: SIEMPRE enteros en unidad mínima (PYG = guaraní, USD = centavo)
-- =====================================================================

create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- ---------- Tipos ----------------------------------------------------
create type listing_condition as enum ('nuevo','excelente','muy_bueno','bueno','usado','para_reparar');
create type listing_status    as enum ('activa','reservada','vendida','pausada');
create type offer_status      as enum ('pendiente','aceptada','rechazada','contraofertada','vencida','retirada');
create type operation_status  as enum ('reservada','completada','cancelada');
create type rated_role        as enum ('seller','buyer');
create type message_kind      as enum ('texto','oferta','sistema');

create table currencies (
  code     text primary key,
  decimals smallint not null check (decimals in (0,2))
);
insert into currencies values
  ('PYG',0),('USD',2),('ARS',2),('BRL',2),('UYU',2),('BOB',2),('CLP',0),('PEN',2),('COP',0),('MXN',2);

create table countries (
  code           text primary key,
  name           text not null,
  local_currency text not null references currencies(code)
);
insert into countries values
  ('PY','Paraguay','PYG'),('AR','Argentina','ARS'),('BR','Brasil','BRL'),('UY','Uruguay','UYU'),
  ('BO','Bolivia','BOB'),('CL','Chile','CLP'),('PE','Perú','PEN'),('CO','Colombia','COP'),('MX','México','MXN');

create table categories (
  slug            text primary key,
  label           text not null,
  required_fields text[] not null default '{}',
  position        smallint not null default 0
);
insert into categories values
  ('celulares','Celulares y electrónica','{marca,modelo,bateria_pct}',1),
  ('muebles','Muebles y electrodomésticos','{medidas}',2),
  ('herramientas','Herramientas y equipamiento','{marca}',3),
  ('deportes','Artículos deportivos','{}',4);

-- ---------- Perfiles -------------------------------------------------
create table profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text not null default 'Usuario',
  avatar_url     text,
  country        text not null default 'PY' references countries(code),
  city           text,
  phone_verified boolean not null default false,
  created_at     timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

-- Alta automática del perfil (email o Google). Google manda full_name / avatar_url.
create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1), 'Usuario'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- Publicaciones --------------------------------------------
create table listings (
  id                        uuid primary key default gen_random_uuid(),
  seller_id                 uuid not null references profiles(id) on delete cascade,
  title                     text not null check (char_length(title) between 6 and 90),
  description               text not null check (char_length(description) between 20 and 4000),
  category                  text not null references categories(slug),
  condition                 listing_condition not null,
  price_amount              bigint not null check (price_amount > 0),
  currency                  text not null references currencies(code),
  country                   text not null default 'PY' references countries(code),
  city                      text not null,
  attributes                jsonb not null default '{}',
  defects                   text,
  accessories               text,
  status                    listing_status not null default 'activa',
  availability_confirmed_at timestamptz not null default now(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('spanish', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(description,'')), 'B')
  ) stored
);
create index listings_search_idx  on listings using gin (search);
create index listings_title_trgm  on listings using gin (title gin_trgm_ops);
create index listings_browse_idx  on listings (country, status, category, created_at desc);

-- Moneda permitida = local del país o USD
create function check_listing_currency() returns trigger language plpgsql as $$
begin
  if new.currency <> 'USD' and new.currency <> (select local_currency from countries where code = new.country) then
    raise exception 'En este país solo se publica en moneda local o USD';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger listings_currency before insert or update on listings
  for each row execute function check_listing_currency();

create table listing_photos (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  path       text not null,              -- ruta en el bucket listing-photos
  position   smallint not null default 0
);
create index on listing_photos (listing_id, position);

-- ---------- Chat y ofertas -------------------------------------------
create table conversations (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id   uuid not null references profiles(id) on delete cascade,
  seller_id  uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);

create table messages (
  id              bigint generated always as identity primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid references profiles(id) on delete set null,
  kind            message_kind not null default 'texto',
  body            text not null check (char_length(body) <= 2000),
  offer_id        uuid,
  created_at      timestamptz not null default now()
);
create index on messages (conversation_id, created_at);

create table offers (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  created_by      uuid not null references profiles(id),
  amount          bigint not null check (amount > 0),
  currency        text not null references currencies(code),
  status          offer_status not null default 'pendiente',
  parent_offer_id uuid references offers(id),
  expires_at      timestamptz not null default now() + interval '24 hours',
  created_at      timestamptz not null default now()
);

-- ---------- Operaciones (expediente de cada trato) --------------------
create table operations (
  id             uuid primary key default gen_random_uuid(),
  listing_id     uuid not null references listings(id),
  offer_id       uuid references offers(id),
  buyer_id       uuid not null references profiles(id),
  seller_id      uuid not null references profiles(id),
  amount         bigint not null,
  currency       text not null references currencies(code),
  status         operation_status not null default 'reservada',
  reserved_until timestamptz not null default now() + interval '30 minutes',
  completed_at   timestamptz,
  cancelled_by   uuid references profiles(id),
  created_at     timestamptz not null default now()
);
create unique index one_open_operation_per_listing on operations (listing_id) where status = 'reservada';

-- PIN de entrega: solo lo ve el comprador. El vendedor lo ingresa al entregar.
create table operation_pins (
  operation_id uuid primary key references operations(id) on delete cascade,
  pin          text not null
);

-- ---------- Calificaciones bilaterales -------------------------------
create table ratings (
  id           uuid primary key default gen_random_uuid(),
  operation_id uuid not null references operations(id) on delete cascade,
  rater_id     uuid not null references profiles(id),
  ratee_id     uuid not null references profiles(id),
  role         rated_role not null,      -- rol de quien RECIBE la calificación
  score        smallint not null check (score between 1 and 5),
  criteria     jsonb not null default '{}',
  comment      text check (char_length(comment) <= 600),
  created_at   timestamptz not null default now(),
  unique (operation_id, rater_id)
);
create index on ratings (ratee_id, role);

-- Valida y completa: solo partes de una operación completada; ratee y rol se derivan.
create function prepare_rating() returns trigger
language plpgsql security definer set search_path = public as $$
declare op operations;
begin
  select * into op from operations where id = new.operation_id;
  if op.id is null or op.status <> 'completada' then
    raise exception 'Solo se califica una operación completada';
  end if;
  if new.rater_id = op.buyer_id then
    new.ratee_id := op.seller_id; new.role := 'seller';
  elsif new.rater_id = op.seller_id then
    new.ratee_id := op.buyer_id;  new.role := 'buyer';
  else
    raise exception 'No participaste de esta operación';
  end if;
  return new;
end $$;
create trigger ratings_prepare before insert on ratings
  for each row execute function prepare_rating();

-- Doble ciego: visible si la contraparte ya calificó o pasaron 14 días.
create function rating_is_public(r ratings) returns boolean
language sql stable security definer set search_path = public as $$
  select r.created_at <= now() - interval '14 days'
      or exists (select 1 from ratings o where o.operation_id = r.operation_id and o.rater_id = r.ratee_id);
$$;

-- Vista con permisos del dueño: expone solo agregados públicos (no filas de operaciones).
create view user_reputation as
select
  p.id as user_id,
  count(r.id) filter (where r.role = 'seller')                     as seller_count,
  round(avg(r.score) filter (where r.role = 'seller'), 2)         as seller_avg,
  count(r.id) filter (where r.role = 'buyer')                      as buyer_count,
  round(avg(r.score) filter (where r.role = 'buyer'), 2)          as buyer_avg,
  (select count(*) from operations o where o.seller_id = p.id and o.status = 'completada') as sales_completed,
  (select count(*) from operations o where o.buyer_id  = p.id and o.status = 'completada') as purchases_completed,
  (select count(*) from operations o where (o.seller_id = p.id or o.buyer_id = p.id) and o.status = 'cancelada' and o.cancelled_by = p.id) as cancellations
from profiles p
left join ratings r on r.ratee_id = p.id and rating_is_public(r)
group by p.id;

-- ---------- Favoritos, alertas, reportes -----------------------------
create table favorites (
  user_id    uuid references profiles(id) on delete cascade,
  listing_id uuid references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table saved_searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  query      text,
  filters    jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid not null references profiles(id),
  listing_id        uuid references listings(id) on delete cascade,
  reported_user_id  uuid references profiles(id),
  conversation_id   uuid references conversations(id),
  reason            text not null check (reason in ('estafa','producto_falso','precio_sospechoso','spam','ofensivo','otro')),
  details           text,
  status            text not null default 'abierto' check (status in ('abierto','revisando','resuelto','descartado')),
  created_at        timestamptz not null default now()
);

-- =====================================================================
-- RPCs (flujo de negociación). security definer + validación explícita.
-- =====================================================================

-- El comprador abre (o reutiliza) la conversación de una publicación.
create function start_conversation(p_listing uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_id uuid;
begin
  select seller_id into v_seller from listings where id = p_listing and status = 'activa';
  if v_seller is null then raise exception 'Publicación no disponible'; end if;
  if v_seller = auth.uid() then raise exception 'Es tu propia publicación'; end if;
  insert into conversations (listing_id, buyer_id, seller_id)
  values (p_listing, auth.uid(), v_seller)
  on conflict (listing_id, buyer_id) do update set listing_id = excluded.listing_id
  returning id into v_id;
  return v_id;
end $$;

-- Oferta o contraoferta formal (precio + vencimiento).
create function make_offer(p_conversation uuid, p_amount bigint, p_currency text, p_parent uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare c conversations; v_id uuid;
begin
  select * into c from conversations where id = p_conversation;
  if auth.uid() not in (c.buyer_id, c.seller_id) then raise exception 'Sin acceso'; end if;
  if p_parent is not null then
    update offers set status = 'contraofertada' where id = p_parent and status = 'pendiente';
  end if;
  insert into offers (conversation_id, created_by, amount, currency, parent_offer_id)
  values (p_conversation, auth.uid(), p_amount, p_currency, p_parent) returning id into v_id;
  insert into messages (conversation_id, sender_id, kind, body, offer_id)
  values (p_conversation, auth.uid(), 'oferta', 'Oferta', v_id);
  return v_id;
end $$;

-- La contraparte acepta: se crea la operación, se reserva la publicación y se genera el PIN.
create function accept_offer(p_offer uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare o offers; c conversations; v_op uuid;
begin
  select * into o from offers where id = p_offer for update;
  select * into c from conversations where id = o.conversation_id;
  if o.status <> 'pendiente' or o.expires_at < now() then raise exception 'La oferta ya no está vigente'; end if;
  if auth.uid() not in (c.buyer_id, c.seller_id) or auth.uid() = o.created_by then
    raise exception 'Solo la contraparte puede aceptar';
  end if;
  update offers set status = 'aceptada' where id = p_offer;
  update listings set status = 'reservada' where id = c.listing_id and status = 'activa';
  if not found then raise exception 'La publicación ya no está disponible'; end if;
  insert into operations (listing_id, offer_id, buyer_id, seller_id, amount, currency)
  values (c.listing_id, p_offer, c.buyer_id, c.seller_id, o.amount, o.currency) returning id into v_op;
  insert into operation_pins values (v_op, lpad((floor(random()*1000000))::int::text, 6, '0'));
  insert into messages (conversation_id, kind, body)
  values (c.id, 'sistema', 'Oferta aceptada. Producto reservado. El comprador tiene un PIN de entrega en la operación.');
  return v_op;
end $$;

-- El vendedor ingresa el PIN que le da el comprador al recibir el producto.
create function complete_operation(p_operation uuid, p_pin text) returns void
language plpgsql security definer set search_path = public as $$
declare op operations;
begin
  select * into op from operations where id = p_operation for update;
  if op.seller_id <> auth.uid() then raise exception 'Solo el vendedor confirma la entrega'; end if;
  if op.status <> 'reservada' then raise exception 'La operación no está abierta'; end if;
  if not exists (select 1 from operation_pins where operation_id = p_operation and pin = p_pin) then
    raise exception 'PIN incorrecto';
  end if;
  update operations set status = 'completada', completed_at = now() where id = p_operation;
  update listings set status = 'vendida' where id = op.listing_id;
end $$;

create function cancel_operation(p_operation uuid) returns void
language plpgsql security definer set search_path = public as $$
declare op operations;
begin
  select * into op from operations where id = p_operation for update;
  if auth.uid() not in (op.buyer_id, op.seller_id) then raise exception 'Sin acceso'; end if;
  if op.status <> 'reservada' then raise exception 'La operación no está abierta'; end if;
  update operations set status = 'cancelada', cancelled_by = auth.uid() where id = p_operation;
  update listings set status = 'activa' where id = op.listing_id;
end $$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table profiles        enable row level security;
alter table listings        enable row level security;
alter table listing_photos  enable row level security;
alter table conversations   enable row level security;
alter table messages        enable row level security;
alter table offers          enable row level security;
alter table operations      enable row level security;
alter table operation_pins  enable row level security;
alter table ratings         enable row level security;
alter table favorites       enable row level security;
alter table saved_searches  enable row level security;
alter table reports         enable row level security;
alter table categories      enable row level security;
alter table countries       enable row level security;
alter table currencies      enable row level security;

create policy "catálogos públicos" on categories for select using (true);
create policy "catálogos públicos" on countries  for select using (true);
create policy "catálogos públicos" on currencies for select using (true);

create policy "perfil público"   on profiles for select using (true);
create policy "edito mi perfil"  on profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "ver publicaciones"     on listings for select using (status <> 'pausada' or seller_id = auth.uid());
create policy "crear mi publicación"  on listings for insert with check (seller_id = auth.uid());
create policy "editar mi publicación" on listings for update using (seller_id = auth.uid());
create policy "borrar mi publicación" on listings for delete using (seller_id = auth.uid() and status <> 'reservada');

create policy "ver fotos" on listing_photos for select using (true);
create policy "mis fotos" on listing_photos for all
  using (exists (select 1 from listings l where l.id = listing_id and l.seller_id = auth.uid()))
  with check (exists (select 1 from listings l where l.id = listing_id and l.seller_id = auth.uid()));

create policy "mis conversaciones" on conversations for select using (auth.uid() in (buyer_id, seller_id));

create policy "leer mensajes" on messages for select
  using (exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)));
create policy "enviar mensaje" on messages for insert
  with check (sender_id = auth.uid() and kind = 'texto' and
    exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)));

create policy "leer ofertas" on offers for select
  using (exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.seller_id)));
create policy "retirar mi oferta" on offers for update using (created_by = auth.uid()) with check (status = 'retirada');

create policy "mis operaciones" on operations for select using (auth.uid() in (buyer_id, seller_id));
create policy "mi pin (comprador)" on operation_pins for select
  using (exists (select 1 from operations o where o.id = operation_id and o.buyer_id = auth.uid()));

create policy "ver calificaciones" on ratings for select using (rater_id = auth.uid() or rating_is_public(ratings));
create policy "calificar" on ratings for insert with check (rater_id = auth.uid());

create policy "mis favoritos" on favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mis búsquedas" on saved_searches for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reportar" on reports for insert with check (reporter_id = auth.uid());
create policy "mis reportes" on reports for select using (reporter_id = auth.uid());

-- Realtime para el chat
alter publication supabase_realtime add table messages, offers;

-- ---------- Storage: fotos de publicaciones ---------------------------
insert into storage.buckets (id, name, public) values ('listing-photos','listing-photos', true)
  on conflict (id) do nothing;
create policy "subo en mi carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "borro lo mío" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
