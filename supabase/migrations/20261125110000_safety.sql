-- =====================================================================
-- Confianza y seguridad: bloqueos entre usuarios y límites anti-spam.
-- =====================================================================
create table if not exists blocks (
  blocker_id uuid not null default auth.uid() references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table blocks enable row level security;
drop policy if exists "mis bloqueos" on blocks;
create policy "mis bloqueos" on blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
grant select, insert, delete on blocks to authenticated;

create or replace function is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

-- Mensajes: bloqueos + freno a ráfagas (más de 20 mensajes por minuto)
create or replace function guard_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare c conversations; v_other uuid;
begin
  if new.sender_id is null then return new; end if;
  select * into c from conversations where id = new.conversation_id;
  v_other := case when new.sender_id = c.buyer_id then c.seller_id else c.buyer_id end;
  if is_blocked_between(new.sender_id, v_other) then
    raise exception 'No podés escribirle a esta persona';
  end if;
  if (select count(*) from messages where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Estás enviando mensajes muy rápido. Esperá un minuto.';
  end if;
  return new;
end $$;
drop trigger if exists messages_guard on messages;
create trigger messages_guard before insert on messages for each row execute function guard_message();

-- Conversaciones: bloqueos + cuentas nuevas (menos de 48 h) hasta 15 conversaciones por día
create or replace function guard_conversation() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_starter uuid; v_created timestamptz;
begin
  if is_blocked_between(new.buyer_id, new.seller_id) then
    raise exception 'No podés contactar a esta persona';
  end if;
  v_starter := coalesce(auth.uid(), new.buyer_id);
  select created_at into v_created from profiles where id = v_starter;
  if v_created > now() - interval '48 hours' and not coalesce((select is_admin from profiles where id = v_starter), false)
     and (select count(*) from conversations where (buyer_id = v_starter or seller_id = v_starter) and created_at > now() - interval '24 hours') >= 15 then
    raise exception 'Las cuentas nuevas pueden iniciar hasta 15 conversaciones por día. Probá mañana.';
  end if;
  return new;
end $$;
drop trigger if exists conversations_guard on conversations;
create trigger conversations_guard before insert on conversations for each row execute function guard_conversation();

-- Publicaciones: cuentas nuevas hasta 5 por día; cualquier cuenta hasta 40 por día
create or replace function guard_listing() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_created timestamptz; n int;
begin
  if coalesce((select is_admin from profiles where id = new.seller_id), false) then return new; end if;
  select created_at into v_created from profiles where id = new.seller_id;
  select count(*) into n from listings where seller_id = new.seller_id and created_at > now() - interval '24 hours';
  if v_created > now() - interval '48 hours' and n >= 5 then
    raise exception 'Las cuentas nuevas pueden publicar hasta 5 avisos por día. Probá mañana.';
  end if;
  if n >= 40 then raise exception 'Llegaste al límite de 40 publicaciones por día.'; end if;
  return new;
end $$;
drop trigger if exists listings_guard on listings;
create trigger listings_guard before insert on listings for each row execute function guard_listing();

notify pgrst, 'reload schema';

-- El admin puede leer solo las conversaciones que fueron denunciadas
drop policy if exists "admin lee conversaciones denunciadas" on messages;
create policy "admin lee conversaciones denunciadas" on messages for select
  using (is_admin() and exists (select 1 from reports r where r.conversation_id = messages.conversation_id));
notify pgrst, 'reload schema';
