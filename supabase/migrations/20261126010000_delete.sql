-- =====================================================================
-- Borrar publicaciones y cuentas.
-- Publicación: se oculta para siempre (deleted_at). Las operaciones y
-- calificaciones pasadas se conservan para que la reputación siga siendo real.
-- Cuenta: se anonimiza el perfil, se ocultan sus publicaciones y se bloquea
-- el acceso. El email queda libre para registrarse de nuevo.
-- =====================================================================
alter table listings add column if not exists deleted_at timestamptz;
alter table profiles add column if not exists deleted_at timestamptz;

drop policy if exists "ver publicaciones" on listings;
create policy "ver publicaciones" on listings for select
  using (deleted_at is null and (status <> 'pausada' or seller_id = auth.uid()));

create or replace function delete_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from listings where id = p_listing and seller_id = auth.uid() and deleted_at is null) then
    raise exception 'No podés borrar esta publicación';
  end if;
  if exists (select 1 from operations where listing_id = p_listing and status = 'reservada') then
    raise exception 'Tiene una operación en curso. Cancelala o terminala antes de borrar.';
  end if;
  update listings set deleted_at = now(), status = 'pausada' where id = p_listing;
  update offers set status = 'retirada' where status = 'pendiente'
    and conversation_id in (select id from conversations where listing_id = p_listing);
end $$;
revoke execute on function delete_listing(uuid) from public, anon;
grant execute on function delete_listing(uuid) to authenticated;

create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Sin sesión'; end if;
  if exists (select 1 from operations where status = 'reservada' and me in (buyer_id, seller_id)) then
    raise exception 'Tenés operaciones en curso. Terminalas o cancelalas antes de borrar tu cuenta.';
  end if;
  update listings set deleted_at = now(), status = 'pausada' where seller_id = me and deleted_at is null;
  update service_requests set status = 'cerrado' where client_id = me and status = 'abierto';
  delete from saved_searches where user_id = me;
  delete from favorites where user_id = me;
  update profiles set display_name = 'Usuario eliminado', avatar_url = null, bio = null, city = null,
    profession = null, email_notifications = false, deleted_at = now() where id = me;
  update auth.users set email = 'eliminado-' || me || '@michimi.invalid', phone = null,
    raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity' where id = me;
  delete from auth.identities where user_id = me;
  delete from auth.sessions where user_id = me;
end $$;
revoke execute on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
notify pgrst, 'reload schema';
