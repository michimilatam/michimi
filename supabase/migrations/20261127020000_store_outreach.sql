-- Correos a comercios: salen por Resend como "Michimi Comercios <comercios@michimi.com>".
-- Las respuestas vuelven a comercios@ y Cloudflare las reenvía a la Gmail de Michimi.
alter table store_invites add column if not exists email text;
alter table store_invites add column if not exists sent_count int not null default 0;
alter table store_invites add column if not exists last_sent_at timestamptz;
alter table store_invites add column if not exists opt_out boolean not null default false;

create table if not exists store_outreach (
  id          uuid primary key default gen_random_uuid(),
  invite_code text not null references store_invites(code) on delete cascade,
  to_email    text not null,
  subject     text not null,
  body        text not null,
  sent_by     uuid references profiles(id),
  sent_at     timestamptz not null default now()
);
alter table store_outreach enable row level security;
drop policy if exists "admin outreach" on store_outreach;
create policy "admin outreach" on store_outreach for select using (is_admin());

create or replace function send_email_from(p_from text, p_reply_to text, p_to text, p_subject text, p_html text, p_text text default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare k text;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'resend_api_key';
  if k is null or p_to is null then raise exception 'Falta la clave de Resend o el destinatario'; end if;
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || k, 'Content-Type', 'application/json'),
    body := jsonb_strip_nulls(jsonb_build_object('from', p_from, 'reply_to', p_reply_to, 'to', jsonb_build_array(p_to),
                                  'subject', p_subject, 'html', p_html, 'text', p_text))
  );
end $$;
revoke execute on function send_email_from(text, text, text, text, text, text) from public, anon, authenticated;

-- Admin: manda UN correo a UN comercio (1 a 1, nunca masivo). El cuerpo es texto plano.
create or replace function send_store_email(p_code text, p_to text, p_subject text, p_body text) returns void
language plpgsql security definer set search_path = public as $$
declare v store_invites; v_html text;
begin
  if not is_admin() then raise exception 'Solo administradores'; end if;
  select * into v from store_invites where code = p_code for update;
  if v.code is null then raise exception 'Invitación no encontrada'; end if;
  if v.opt_out then raise exception 'Este comercio pidió no recibir más correos'; end if;
  if p_to !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email inválido'; end if;
  if v.last_sent_at > now() - interval '3 days' then raise exception 'Ya le escribiste hace menos de 3 días. Esperá antes de insistir.'; end if;
  if v.sent_count >= 3 then raise exception 'Ya van 3 correos sin respuesta: no insistas más por este medio.'; end if;
  if char_length(p_subject) not between 5 and 120 or char_length(p_body) not between 40 and 5000 then raise exception 'Asunto o mensaje muy corto/largo'; end if;

  v_html := '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111;font-size:15px;line-height:1.55">'
    || replace(html_escape(p_body), E'\n', '<br>')
    || '<p style="font-size:12px;color:#777;margin-top:28px;border-top:1px solid #eee;padding-top:12px">'
    || 'Michimi · michimi.com · Asunción, Paraguay. Te escribimos porque tu comercio publica sus productos en internet. '
    || 'Si no querés recibir más mensajes nuestros, respondé este correo con la palabra BAJA.</p></div>';

  perform send_email_from('Michimi Comercios <comercios@michimi.com>', 'comercios@michimi.com', p_to, p_subject, v_html,
                          p_body || E'\n\n--\nMichimi · michimi.com. Para no recibir más mensajes, respondé BAJA.');
  insert into store_outreach (invite_code, to_email, subject, body, sent_by) values (p_code, p_to, p_subject, p_body, auth.uid());
  update store_invites set email = p_to, sent_count = sent_count + 1, last_sent_at = now(),
         status = case when status = 'creada' then 'enviada' else status end
   where code = p_code;
end $$;
revoke execute on function send_store_email(text, text, text, text) from public, anon;
grant execute on function send_store_email(text, text, text, text) to authenticated;

grant select, insert, update on public.store_invites to service_role;
notify pgrst, 'reload schema';
