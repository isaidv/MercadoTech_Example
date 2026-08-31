"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/hooks/useAuth";

function LoginPageContent() {
  const { login, loading, error, user, initializing } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  // Ya hay sesión (ej. volviste a /login con el back del navegador): afuera.
  useEffect(() => {
    if (!initializing && user) {
      router.replace(redirectTo);
    }
  }, [initializing, user, redirectTo, router]);

  async function handleSubmit(input: { email: string; password: string }) {
    try {
      await login(input);
      router.push(redirectTo);
    } catch {
      // El error ya queda en el estado del hook y LoginForm lo muestra.
    }
  }

  return <LoginForm onSubmit={handleSubmit} loading={loading} error={error} />;
}

export default function LoginPage() {
  // useSearchParams exige un límite <Suspense> para no romper el prerender
  // estático de esta página (regla de Next.js App Router).
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
