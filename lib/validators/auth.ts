import { ROLES, type Role } from "@/lib/constants/roles";

/**
 * Validación pura de los formularios de auth — sin React, sin Supabase.
 * `LoginForm`/`RegisterForm` la corren antes de llamar a `onSubmit`;
 * `services/auth.service.ts` no vuelve a validar (confía en que el
 * formulario ya lo hizo) porque la última palabra la tiene de todos modos
 * la base de datos (`profiles.role` check constraint + el trigger
 * `handle_new_user`, ver 20260821130000_handle_new_user_metadata.sql).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const DISPLAY_NAME_MIN = 2;
const DISPLAY_NAME_MAX = 60;

/** Roles que un formulario de registro puede ofrecer — nunca 'admin'. */
const REGISTERABLE_ROLES: readonly Role[] = ROLES.filter((role) => role !== "admin");

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginErrors = Partial<Record<keyof LoginInput, string>>;

export function validateLogin(input: LoginInput): { valid: boolean; errors: LoginErrors } {
  const errors: LoginErrors = {};

  if (!EMAIL_RE.test(input.email.trim())) {
    errors.email = "Ingresa un email válido.";
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  role: Role;
};

export type RegisterErrors = Partial<Record<keyof RegisterInput, string>>;

export function validateRegister(input: RegisterInput): { valid: boolean; errors: RegisterErrors } {
  const errors: RegisterErrors = {};

  if (!EMAIL_RE.test(input.email.trim())) {
    errors.email = "Ingresa un email válido.";
  }
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  const trimmedName = input.displayName.trim();
  if (trimmedName.length < DISPLAY_NAME_MIN || trimmedName.length > DISPLAY_NAME_MAX) {
    errors.displayName = `El nombre debe tener entre ${DISPLAY_NAME_MIN} y ${DISPLAY_NAME_MAX} caracteres.`;
  }

  // Defensa en profundidad: la UI solo ofrece "comprar"/"vender" (nunca un
  // <select> libre), y aunque algo la sortee, el trigger `handle_new_user`
  // normaliza cualquier valor fuera de rango a 'buyer' de todos modos — pero
  // fallar acá da un mensaje legible en el formulario en vez de un registro
  // silenciosamente distinto de lo que el usuario eligió.
  if (!REGISTERABLE_ROLES.includes(input.role)) {
    errors.role = "Elige si querés comprar o vender.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
