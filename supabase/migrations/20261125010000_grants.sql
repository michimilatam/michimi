-- Permisos base para los roles de la API. RLS sigue decidiendo fila por fila.
-- (Los proyectos nuevos de Supabase ya no otorgan esto automáticamente.)
grant usage on schema public to anon, authenticated;

grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- RPCs del flujo de negociación: solo usuarios con sesión
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.start_conversation(uuid),
  public.make_offer(uuid, bigint, text, uuid),
  public.accept_offer(uuid),
  public.complete_operation(uuid, text),
  public.cancel_operation(uuid)
to authenticated;
-- Usada por la política de ratings y la vista de reputación (lectura pública)
grant execute on function public.rating_is_public(public.ratings) to anon, authenticated;

alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant insert, update, delete on tables to authenticated;
