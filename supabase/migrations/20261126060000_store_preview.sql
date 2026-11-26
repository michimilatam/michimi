-- Vista previa privada de la tienda (solo con el código de la invitación).
create or replace function store_preview(p_code text)
returns table (name text, slug text, city text, website text, instagram text, phone text,
               id uuid, title text, price_amount bigint, currency text, subcategory text, image text)
language sql security definer set search_path = public stable as $$
  select i.name, i.slug, i.city, i.website, i.instagram, i.phone,
         p.id, p.title, p.price_amount, p.currency, p.subcategory, p.image_urls[1]
  from store_invites i
  left join store_products p on p.invite_code = i.code and p.status = 'pendiente'
  where i.code = p_code and i.status <> 'descartada'
  order by p.created_at
  limit 600;
$$;
grant execute on function store_preview(text) to anon, authenticated;
notify pgrst, 'reload schema';
