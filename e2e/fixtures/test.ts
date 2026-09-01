import { test as base } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { BUYER1, SELLER1, SELLER2 } from "../data/users";

type Fixtures = {
  /** `page` ya logueada como buyer1@mercadotech.test (María Fernanda Quispe). */
  buyerPage: import("@playwright/test").Page;
  /** `page` ya logueada como seller1@mercadotech.test (TecnoImports Perú). */
  sellerPage: import("@playwright/test").Page;
  /** `page` ya logueada como seller2@mercadotech.test (Andes Digital Store) — Fase 6.6: dueño real del único pedido `pagado` del seed. */
  seller2Page: import("@playwright/test").Page;
};

/** Fixture con login vía Page Object (Fase 6.4) — cada test que la use arranca con sesión ya iniciada, sin repetir el flujo de login en cada spec. */
export const test = base.extend<Fixtures>({
  buyerPage: async ({ page }, use) => {
    await new LoginPage(page).login(BUYER1);
    await use(page);
  },
  sellerPage: async ({ page }, use) => {
    await new LoginPage(page).login(SELLER1);
    await use(page);
  },
  seller2Page: async ({ page }, use) => {
    await new LoginPage(page).login(SELLER2);
    await use(page);
  },
});

export { expect } from "@playwright/test";
