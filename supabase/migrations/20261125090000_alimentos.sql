-- Categoría Alimentos y bebidas
insert into categories (slug, label, required_fields, position) values ('alimentos', 'Alimentos y bebidas', '{}', 21)
on conflict (slug) do update set label = excluded.label, position = excluded.position;
update categories set position = 22 where slug = 'servicios';
update categories set position = 23 where slug = 'otros';
insert into subcategories (category, slug, label, position) values
  ('alimentos', 'panificados-y-reposteria', 'Panificados y repostería', 1),
  ('alimentos', 'comidas-caseras-y-viandas', 'Comidas caseras y viandas', 2),
  ('alimentos', 'bebidas', 'Bebidas', 3),
  ('alimentos', 'productos-regionales-y-artesanales', 'Productos regionales y artesanales', 4),
  ('alimentos', 'organicos-y-saludables', 'Orgánicos y saludables', 5),
  ('alimentos', 'dulces-mermeladas-y-conservas', 'Dulces, mermeladas y conservas', 6),
  ('alimentos', 'carnes-quesos-y-fiambres', 'Carnes, quesos y fiambres', 7),
  ('alimentos', 'frutas-verduras-y-huevos', 'Frutas, verduras y huevos', 8),
  ('alimentos', 'otros-alimentos', 'Otros alimentos', 9)
on conflict (category, slug) do update set label = excluded.label, position = excluded.position;
