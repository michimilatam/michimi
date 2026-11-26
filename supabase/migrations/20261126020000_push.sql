-- =====================================================================
-- Notificaciones push (Web Push). La base guarda las suscripciones de cada
-- dispositivo y, ante un mensaje nuevo, le pide a www.michimi.com/api/push
-- que las envíe. El secreto compartido vive en Vault como "push_secret".
-- =====================================================================
create table if not exists push_subscriptions (
  id         bigserial primary key,
  user_id    uuid not null references profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "mis dispositivos" on push_subscriptions;
create policy "mis dispositivos" on push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on push_subscriptions to authenticated;
grant usage, select on sequence push_subscriptions_id_seq to authenticated;

create or replace function send_push(p_user uuid, p_title text, p_body text, p_url text, p_tag text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare k text; subs jsonb;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'push_secret';
  if k is null then return; end if;
  select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)) into subs
  from push_subscriptions where user_id = p_user;
  if subs is null then return; end if;
  perform net.http_post(
    url := 'https://www.michimi.com/api/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', k),
    body := jsonb_build_object('subs', subs, 'title', p_title, 'body', p_body, 'url', p_url, 'tag', p_tag)
  );
end $$;
revoke execute on function send_push(uuid, text, text, text, text) from public, anon, authenticated;

-- Mensaje nuevo: push al instante (siempre) + email (máx. uno cada 15 min por conversación)
create or replace function notify_new_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare c conversations; v_to uuid; v_email text; v_name text; v_title text; v_subject text; v_body text; v_push text;
begin
  select * into c from conversations where id = new.conversation_id;
  if new.sender_id is null then v_to := c.buyer_id;
  elsif new.sender_id = c.buyer_id then v_to := c.seller_id;
  else v_to := c.buyer_id; end if;

  select display_name into v_name from profiles where id = new.sender_id;
  select coalesce((select title from listings where id = c.listing_id), (select title from service_requests where id = c.request_id), 'tu publicación') into v_title;

  v_push := case new.kind when 'oferta' then coalesce(v_name, 'Alguien') || ' te mandó una oferta' when 'sistema' then new.body
            else coalesce(v_name, 'Alguien') || ': ' || left(new.body, 140) end;
  begin
    perform send_push(v_to, v_title, v_push, '/mensajes/' || c.id, c.id::text);
  exception when others then null;
  end;

  if not (select email_notifications from profiles where id = v_to) then return new; end if;
  if exists (select 1 from notification_log where user_id = v_to and conversation_id = c.id and sent_at > now() - interval '15 minutes') then
    return new;
  end if;
  select email into v_email from auth.users where id = v_to;
  if new.kind = 'oferta' then
    v_subject := 'Nueva oferta por ' || v_title;
    v_body := html_escape(coalesce(v_name, 'Alguien')) || ' te mandó una oferta por <b>' || html_escape(v_title) || '</b>. Las ofertas vencen en 24 horas.';
  elsif new.kind = 'sistema' then
    v_subject := 'Novedades en ' || v_title;
    v_body := html_escape(new.body);
  else
    v_subject := coalesce(v_name, 'Alguien') || ' te escribió por ' || v_title;
    v_body := '<b>' || html_escape(coalesce(v_name, 'Alguien')) || ':</b> “' || html_escape(left(new.body, 280)) || '”';
  end if;
  perform send_email(v_email, v_subject, email_layout(html_escape(v_subject), v_body, 'Responder en Michimi', 'https://www.michimi.com/mensajes/' || c.id));
  insert into notification_log (user_id, conversation_id, kind) values (v_to, c.id, new.kind);
  return new;
exception when others then
  return new;
end $$;
notify pgrst, 'reload schema';

alter table listing_photos add column if not exists thumb_path text;
