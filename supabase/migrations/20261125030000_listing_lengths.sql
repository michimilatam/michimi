-- Sin límites de largo para título y descripción; la descripción es opcional.
alter table listings drop constraint if exists listings_title_check;
alter table listings drop constraint if exists listings_description_check;
alter table listings add constraint listings_title_not_empty check (char_length(trim(title)) > 0);
alter table listings alter column description set default '';
