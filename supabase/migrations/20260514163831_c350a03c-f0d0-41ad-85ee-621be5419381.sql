-- Helper that runs with elevated privileges to check whether an order id
-- belongs to a guest order. Lets RLS on order_items verify the parent order
-- without granting anon SELECT on the orders table.
create or replace function public.is_guest_order(_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders
    where id = _order_id and is_guest_order = true
  )
$$;

grant execute on function public.is_guest_order(uuid) to anon, authenticated;

drop policy if exists "anyone insert guest order items" on public.order_items;

create policy "anyone insert guest order items"
on public.order_items
for insert
to public
with check (
  user_id is null
  and public.is_guest_order(order_id)
);
