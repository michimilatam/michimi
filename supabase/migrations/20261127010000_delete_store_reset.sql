-- Al borrar un comercio, su invitación vuelve a quedar disponible y el catálogo
-- preparado vuelve a "pendiente", para que el dueño real lo pueda reclamar.
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
  update store_products set status = 'pendiente', listing_id = null
   where status = 'publicado' and invite_code in (select code from store_invites where store_id = p_store);
  update store_invites set status = 'creada', claimed_by = null, claimed_at = null, store_id = null where store_id = p_store;
  update stores set deleted_at = now(), slug = left(slug, 26) || '-borrada-' || substr(md5(random()::text), 1, 5) where id = p_store;
  delete from store_members where store_id = p_store;
end $$;
