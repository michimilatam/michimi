-- Mensajes no leídos: cada usuario guarda hasta cuándo leyó cada conversación.
create table if not exists conversation_reads (
  user_id         uuid not null default auth.uid() references profiles(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (user_id, conversation_id)
);
alter table conversation_reads enable row level security;
create policy "mis lecturas" on conversation_reads for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on conversation_reads to authenticated;

-- No leídos por conversación (mensajes de la otra parte o del sistema, posteriores a mi última lectura)
create or replace function unread_counts() returns table (conversation_id uuid, unread bigint)
language sql stable security invoker set search_path = public as $$
  select m.conversation_id, count(*)
  from messages m
  join conversations c on c.id = m.conversation_id
  left join conversation_reads r on r.conversation_id = m.conversation_id and r.user_id = auth.uid()
  where auth.uid() in (c.buyer_id, c.seller_id)
    and m.sender_id is distinct from auth.uid()
    and m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
  group by m.conversation_id;
$$;

create or replace function mark_conversation_read(p_conversation uuid) returns void
language sql security invoker set search_path = public as $$
  insert into conversation_reads (user_id, conversation_id, last_read_at)
  values (auth.uid(), p_conversation, now())
  on conflict (user_id, conversation_id) do update set last_read_at = excluded.last_read_at;
$$;

revoke execute on function unread_counts(), mark_conversation_read(uuid) from public, anon;
grant execute on function unread_counts(), mark_conversation_read(uuid) to authenticated;
