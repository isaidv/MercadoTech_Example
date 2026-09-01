/**
 * Usuarios DEL SEED (`supabase/seed.sql`, sección 1) — mismos que corre
 * `supabase db reset` en cada reset local, nunca inventados. Contraseña
 * común de laboratorio para los 6 usuarios: `MercadoTech123!`.
 */

export type TestUser = {
  email: string;
  password: string;
  displayName: string;
};

const PASSWORD = "MercadoTech123!";

/** María Fernanda Quispe — comprador con historial real (pedidos 001/002 del seed). */
export const BUYER1: TestUser = {
  email: "buyer1@mercadotech.test",
  password: PASSWORD,
  displayName: "María Fernanda Quispe",
};

/** TecnoImports Perú — vendedor con 8 productos del seed. */
export const SELLER1: TestUser = {
  email: "seller1@mercadotech.test",
  password: PASSWORD,
  displayName: "TecnoImports Perú",
};

/**
 * Andes Digital Store — vendedor con 8 productos del seed. Fase 6.6: es el
 * dueño real del ÚNICO pedido `pagado` del seed (`c0000000-...-002`,
 * `supabase/seed.sql` sección 5) — verificado leyendo `order_items.seller_id`
 * de ese pedido (`a0000000-...-005`), no asumido. `seller1` NO tiene ningún
 * pedido en estado `pagado`.
 */
export const SELLER2: TestUser = {
  email: "seller2@mercadotech.test",
  password: PASSWORD,
  displayName: "Andes Digital Store",
};
