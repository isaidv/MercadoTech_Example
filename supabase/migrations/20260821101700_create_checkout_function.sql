-- create_order_from_cart: convierte el carrito de un comprador en un pedido,
-- en UNA transacción. Una llamada a una función plpgsql es, por defecto,
-- atómica dentro de la transacción que la invoca: cualquier `raise
-- exception` sin capturar aborta toda la transacción (incluyendo el INSERT
-- en orders hecho antes del error), así que no hace falta un rollback
-- manual.
create or replace function public.create_order_from_cart(p_buyer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id    uuid;
  v_total       numeric(12, 2) := 0;
  v_item        record;
  v_cart_count  integer;
begin
  -- La función es SECURITY DEFINER (corre con privilegios del dueño, no del
  -- caller) precisamente para poder leer/escribir cart_items, products y
  -- orders sin depender de las políticas RLS del caller. Por eso esta
  -- validación es la única barrera real: nadie puede generar un pedido a
  -- nombre de otro usuario.
  if p_buyer_id is distinct from auth.uid() then
    raise exception 'p_buyer_id (%) no coincide con el usuario autenticado', p_buyer_id;
  end if;

  select count(*) into v_cart_count
  from public.cart_items
  where user_id = p_buyer_id;

  if v_cart_count = 0 then
    raise exception 'El carrito está vacío';
  end if;

  insert into public.orders (buyer_id, status, total)
  values (p_buyer_id, 'pendiente', 0)
  returning id into v_order_id;

  -- `for update of p` bloquea cada fila de products mientras dura la
  -- transacción: si dos checkouts concurrentes compiten por el mismo
  -- producto, el segundo espera a que el primero termine (commit o
  -- rollback) antes de leer el stock, evitando vender más unidades de las
  -- que hay (race condition clásica de "leer stock, decidir, escribir stock").
  for v_item in
    select
      ci.product_id,
      ci.quantity,
      p.title,
      p.price,
      p.stock,
      p.is_active,
      p.seller_id
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.user_id = p_buyer_id
    for update of p
  loop
    if not v_item.is_active then
      raise exception 'El producto "%" ya no está disponible', v_item.title;
    end if;

    if v_item.stock < v_item.quantity then
      raise exception
        'Stock insuficiente para "%": disponible %, solicitado %',
        v_item.title, v_item.stock, v_item.quantity;
    end if;

    insert into public.order_items (
      order_id, product_id, seller_id, title_snapshot, price_snapshot, quantity
    )
    values (
      v_order_id, v_item.product_id, v_item.seller_id, v_item.title, v_item.price, v_item.quantity
    );

    update public.products
    set stock = stock - v_item.quantity
    where id = v_item.product_id;

    v_total := v_total + (v_item.price * v_item.quantity);
  end loop;

  update public.orders set total = v_total where id = v_order_id;

  delete from public.cart_items where user_id = p_buyer_id;

  return v_order_id;
end;
$$;

-- Por defecto Postgres otorga EXECUTE a PUBLIC en toda función nueva.
-- Se revoca explícitamente y se re-otorga solo a authenticated: un usuario
-- anónimo no tiene carrito ni sesión, así que nunca debería poder llamarla.
revoke execute on function public.create_order_from_cart(uuid) from public;
revoke execute on function public.create_order_from_cart(uuid) from anon;
grant execute on function public.create_order_from_cart(uuid) to authenticated;
