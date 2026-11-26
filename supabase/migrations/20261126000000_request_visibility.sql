-- Quien participa de una conversación sobre un pedido lo sigue viendo aunque ya esté adjudicado o cerrado.
drop policy if exists "ver pedidos" on service_requests;
create policy "ver pedidos" on service_requests for select using (
  status = 'abierto' or client_id = auth.uid()
  or exists (select 1 from conversations c where c.request_id = service_requests.id and auth.uid() in (c.buyer_id, c.seller_id))
);
