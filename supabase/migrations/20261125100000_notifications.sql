-- =====================================================================
-- Avisos por email (Resend) sin servidores extra:
-- trigger en messages -> pg_net -> API de Resend. Clave en Supabase Vault
-- con el nombre "resend_api_key" (la carga el dueño, nunca va al repo).
-- Búsquedas guardadas: resumen diario con pg_cron.
-- =====================================================================
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

alter table profiles add column if not exists email_notifications boolean not null default true;
alter table saved_searches add column if not exists last_notified_at timestamptz not null default now();

create table if not exists notification_log (
  id              bigserial primary key,
  user_id         uuid not null references profiles(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  kind            text not null,
  sent_at         timestamptz not null default now()
);
create index if not exists notification_log_recent on notification_log (user_id, conversation_id, sent_at desc);
alter table notification_log enable row level security;   -- sin políticas: solo el sistema

create or replace function send_email(p_to text, p_subject text, p_html text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare k text;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'resend_api_key';
  if k is null or p_to is null then return; end if;
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || k, 'Content-Type', 'application/json'),
    body := jsonb_build_object('from', 'Michimi <avisos@michimi.com>', 'to', jsonb_build_array(p_to), 'subject', p_subject, 'html', p_html)
  );
end $$;
revoke execute on function send_email(text, text, text) from public, anon, authenticated;

create or replace function email_layout(p_title text, p_body text, p_cta text, p_url text) returns text
language sql immutable as $$
  select '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#111">'
    || '<p style="font-size:20px;font-weight:bold;margin:0 0 12px">' || p_title || '</p>'
    || '<p style="font-size:15px;line-height:1.5;margin:0 0 20px">' || p_body || '</p>'
    || '<a href="' || p_url || '" style="display:inline-block;background:#d4f25a;color:#111;font-weight:bold;padding:12px 20px;border-radius:999px;text-decoration:none">' || p_cta || '</a>'
    || '<p style="font-size:12px;color:#777;margin-top:28px">Michimi · Comprá y vendé entre personas. Podés desactivar estos avisos desde tu perfil.</p></div>';
$$;

-- Escapa texto del usuario antes de meterlo en HTML
create or replace function html_escape(t text) returns text language sql immutable as $$
  select replace(replace(replace(replace(coalesce(t,''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

-- Aviso de mensaje/oferta nueva. Máximo un email cada 15 min por conversación.
create or replace function notify_new_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare c conversations; v_to uuid; v_email text; v_name text; v_title text; v_subject text; v_body text;
begin
  select * into c from conversations where id = new.conversation_id;
  if new.sender_id is null then v_to := c.buyer_id;            -- mensajes del sistema: al comprador/cliente
  elsif new.sender_id = c.buyer_id then v_to := c.seller_id;
  else v_to := c.buyer_id; end if;

  if not (select email_notifications from profiles where id = v_to) then return new; end if;
  if exists (select 1 from notification_log where user_id = v_to and conversation_id = c.id and sent_at > now() - interval '15 minutes') then
    return new;
  end if;

  select email into v_email from auth.users where id = v_to;
  select display_name into v_name from profiles where id = new.sender_id;
  select coalesce((select title from listings where id = c.listing_id), (select title from service_requests where id = c.request_id), 'tu publicación') into v_title;

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
  return new;  -- un aviso fallido nunca bloquea el chat
end $$;
drop trigger if exists messages_notify on messages;
create trigger messages_notify after insert on messages for each row execute function notify_new_message();

-- Resumen diario de búsquedas guardadas
create or replace function notify_saved_searches() returns void
language plpgsql security definer set search_path = public as $$
declare s record; n bigint; v_email text; qs text;
begin
  for s in select ss.*, p.email_notifications from saved_searches ss join profiles p on p.id = ss.user_id where ss.notify loop
    continue when not s.email_notifications;
    select count(*) into n from listings l
    where l.status = 'activa' and l.country = s.country and l.created_at > greatest(s.last_notified_at, s.last_seen_at) and l.seller_id <> s.user_id
      and l.kind = coalesce(nullif(s.filters->>'tipo',''), 'producto')
      and (s.query is null or s.query = '' or l.search @@ websearch_to_tsquery('spanish', s.query))
      and (nullif(s.filters->>'cat','') is null or l.category = s.filters->>'cat')
      and (nullif(s.filters->>'sub','') is null or l.subcategory = s.filters->>'sub')
      and (nullif(s.filters->>'region','') is null or l.region = s.filters->>'region' or (s.filters->>'region') = any(l.coverage_regions))
      and (nullif(s.filters->>'cond','') is null or l.condition::text = s.filters->>'cond')
      and (nullif(s.filters->>'cur','') is null or l.currency = s.filters->>'cur');
    if n > 0 then
      select email into v_email from auth.users where id = s.user_id;
      perform send_email(v_email,
        n || ' nueva' || case when n > 1 then 's publicaciones' else ' publicación' end || ' para tu búsqueda' || coalesce(' “' || s.query || '”', ''),
        email_layout('Hay novedades en tu búsqueda', 'Aparecieron <b>' || n || '</b> publicaciones nuevas que coinciden con lo que guardaste' || coalesce(' (“' || html_escape(s.query) || '”)', '') || '.', 'Ver publicaciones', 'https://www.michimi.com/busquedas'));
      update saved_searches set last_notified_at = now() where id = s.id;
    end if;
  end loop;
end $$;
revoke execute on function notify_saved_searches() from public, anon, authenticated;

-- Todos los días a las 9:00 de Paraguay (12:00 UTC)
select cron.unschedule('busquedas-guardadas') where exists (select 1 from cron.job where jobname = 'busquedas-guardadas');
select cron.schedule('busquedas-guardadas', '0 12 * * *', 'select public.notify_saved_searches()');
