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
