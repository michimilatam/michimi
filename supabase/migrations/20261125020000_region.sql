-- Departamento / provincia / estado / región según el país
alter table listings add column if not exists region text;
alter table profiles add column if not exists region text;
create index if not exists listings_region_idx on listings (country, region, status, created_at desc);
