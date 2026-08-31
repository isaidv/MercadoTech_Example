"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { Mail } from "lucide-react";

function RegisterPageContent() {
  const { register, loading, error, user, initializing } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  useEffect(() => {
    if (!initializing && user) {
      router.replace(redirectTo);
    }
  }, [initializing, user, redirectTo, router]);

  async function handleSubmit(input: Parameters<typeof register>[0]) {
    try {
      const { session } = await register(input);
      if (session) {
        router.push(redirectTo);
      } else {
        // Supabase LOCAL tiene enable_confirmations = false (ver
        // supabase/config.toml) — acá `session` nunca debería venir null.
        // Este branch queda preparado para un proyecto hosted con
        // confirmación de email activa, donde signUp() sí devuelve
        // session: null hasta que el usuario confirme el correo.
        setNeedsEmailConfirmation(true);
      }
    } catch {
      // El error ya queda en el estado del hook y RegisterForm lo muestra.
    }
  }

  if (needsEmailConfirmation) {
    return (
      <EmptyState
        icon={<Mail className="size-10" aria-hidden="true" />}
        title="Revisa tu correo"
        description="Te enviamos un enlace para confirmar tu cuenta antes de poder iniciar sesión."
      />
    );
  }

  return <RegisterForm onSubmit={handleSubmit} loading={loading} error={error} />;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}
