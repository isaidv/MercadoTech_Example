import type { Page } from "@playwright/test";
import type { TestUser } from "../data/users";

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  /** Forma exacta pedida en la Fase 6.4 — espera a que "user-menu" aparezca como confirmación de que el login cerró bien. */
  async login(user: TestUser) {
    await this.page.goto("/login");
    await this.page.getByTestId("login-email").fill(user.email);
    await this.page.getByTestId("login-password").fill(user.password);
    await this.page.getByTestId("login-submit").click();
    await this.page.getByTestId("user-menu").waitFor();
  }
}
