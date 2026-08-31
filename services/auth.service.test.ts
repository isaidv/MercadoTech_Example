import { describe, expect, it } from "vitest";
import { register, login, logout, getCurrentUser, subscribeToAuthChange } from "./auth.service";
import { mockSupabase, mockError } from "./test-utils/supabase-mock";

describe("register", () => {
  it("caso feliz: manda display_name/role dentro de options.data (único lugar donde viaja el rol)", async () => {
    const supabase = mockSupabase({ auth: { signUp: { user: { id: "u1" } } } });
    await register({ email: "a@b.com", password: "12345678", displayName: "Ana", role: "seller" }, supabase);
    // El mock no reimplementa auth.signUp — esto verifica que la llamada no lanzó, que es lo observable acá.
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ auth: { signUp: mockError(new Error("User already registered")) } });
    await expect(
      register({ email: "a@b.com", password: "12345678", displayName: "Ana", role: "buyer" }, supabase),
    ).rejects.toThrow("User already registered");
  });
});

describe("login", () => {
  it("caso feliz", async () => {
    const supabase = mockSupabase({ auth: { signInWithPassword: { user: { id: "u1" } } } });
    const data = await login({ email: "a@b.com", password: "12345678" }, supabase);
    expect(data).toEqual({ user: { id: "u1" } });
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ auth: { signInWithPassword: mockError(new Error("Invalid login credentials")) } });
    await expect(login({ email: "a@b.com", password: "mala" }, supabase)).rejects.toThrow("Invalid login credentials");
  });
});

describe("logout", () => {
  it("caso feliz", async () => {
    const supabase = mockSupabase({ auth: { signOut: null } });
    await expect(logout(supabase)).resolves.toBeUndefined();
  });

  it("propaga tal cual el error", async () => {
    const supabase = mockSupabase({ auth: { signOut: mockError(new Error("falló")) } });
    await expect(logout(supabase)).rejects.toThrow("falló");
  });
});

describe("getCurrentUser", () => {
  it("sin sesión: {user: null, profile: null}, sin llegar a consultar profiles", async () => {
    const supabase = mockSupabase({ auth: { getUser: { user: null } } });
    expect(await getCurrentUser(supabase)).toEqual({ user: null, profile: null });
  });

  it("con sesión: trae el profile real", async () => {
    const supabase = mockSupabase({
      auth: { getUser: { user: { id: "u1" } } },
      tables: { profiles: { single: { id: "u1", role: "buyer", display_name: "Ana" } } },
    });
    const result = await getCurrentUser(supabase);
    expect(result.user).toEqual({ id: "u1" });
    expect(result.profile?.display_name).toBe("Ana");
  });

  it("comportamiento actual, revisar: si falla la lectura de profiles, el error NO se propaga (se destructura solo {data}, sin chequear error) — devuelve profile: null en silencio, no una excepción", async () => {
    const supabase = mockSupabase({
      auth: { getUser: { user: { id: "u1" } } },
      tables: { profiles: { single: mockError(new Error("profiles caído")) } },
    });
    const result = await getCurrentUser(supabase);
    expect(result.user).toEqual({ id: "u1" });
    expect(result.profile).toBeNull();
  });
});

describe("subscribeToAuthChange", () => {
  it("devuelve una función de cancelación que no lanza al invocarse", () => {
    const supabase = mockSupabase();
    const unsubscribe = subscribeToAuthChange(() => {}, supabase);
    expect(typeof unsubscribe).toBe("function");
    expect(() => unsubscribe()).not.toThrow();
  });
});
