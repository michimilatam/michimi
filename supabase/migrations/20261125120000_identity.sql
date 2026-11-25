-- La verificación pasa a ser de identidad (cualquier usuario). La profesión es opcional.
alter table verification_requests alter column profession drop not null;
create or replace function sync_verification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles set
    professional_status = case new.status when 'aprobada' then 'verificado' when 'rechazada' then 'rechazado' else 'pendiente' end,
    profession = coalesce(nullif(new.profession, ''), profession)
  where id = new.user_id;
  return new;
end $$;
