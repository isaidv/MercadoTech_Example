"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { validateRegister, type RegisterErrors } from "@/lib/validators/auth";
import type { Role } from "@/lib/constants/roles";

/** El registro nunca ofrece 'admin' — ver decisión 1 de la Fase 3.3. */
export type RegisterableRole = Exclude<Role, "admin">;

type RegisterFormProps = {
  onSubmit: (input: {
    email: string;
    password: string;
    displayName: string;
    role: RegisterableRole;
  }) => void;
  loading: boolean;
  error: string | null;
};

const ROLE_OPTIONS: { value: RegisterableRole; label: string }[] = [
  { value: "buyer", label: "Quiero comprar" },
  { value: "seller", label: "Quiero vender" },
];

/** Puro: valida con lib/validators/auth.ts antes de llamar a onSubmit; no conoce Supabase. */
export function RegisterForm({ onSubmit, loading, error }: RegisterFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<RegisterableRole>("buyer");
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { valid, errors } = validateRegister({ email, password, displayName, role });
    setFieldErrors(errors);
    if (!valid) return;
    onSubmit({ email, password, displayName, role });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-semibold">Crear cuenta</h1>
        <p className="text-sm text-muted-foreground">Comprá o vendé tecnología en MercadoTech.</p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">¿Qué querés hacer?</legend>
        <div className="grid grid-cols-2 gap-2">
          {ROLE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer rounded-lg border border-input px-3 py-2 text-center text-sm transition-colors",
                "has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary",
                "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50"
              )}
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
        {fieldErrors.role ? <p className="text-sm text-destructive">{fieldErrors.role}</p> : null}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-name">Nombre</Label>
        <Input
          id="register-name"
          autoComplete="name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          aria-invalid={!!fieldErrors.displayName}
        />
        {fieldErrors.displayName ? (
          <p className="text-sm text-destructive">{fieldErrors.displayName}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={!!fieldErrors.email}
        />
        {fieldErrors.email ? <p className="text-sm text-destructive">{fieldErrors.email}</p> : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-password">Contraseña</Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={!!fieldErrors.password}
        />
        {fieldErrors.password ? <p className="text-sm text-destructive">{fieldErrors.password}</p> : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={loading}>
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
