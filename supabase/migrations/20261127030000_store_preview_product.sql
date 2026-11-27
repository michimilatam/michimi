-- Vista previa privada de UN producto del catálogo preparado (solo con el código de la invitación).
create or replace function store_preview_product(p_code text, p_id uuid)
returns table (store_name text, slug text, city text, title text, description text, price_amount bigint,
               currency text, category text, subcategory text, image_urls text[], source_url text)
language sql security definer set search_path = public stable as $$
  select i.name, i.slug, i.city, p.title, p.description, p.price_amount, p.currency, p.category, p.subcategory, p.image_urls, p.source_url
  from store_invites i join store_products p on p.invite_code = i.code
  where i.code = p_code and p.id = p_id and i.status <> 'descartada' and p.status = 'pendiente';
$$;
grant execute on function store_preview_product(text, uuid) to anon, authenticated;
notify pgrst, 'reload schema';
