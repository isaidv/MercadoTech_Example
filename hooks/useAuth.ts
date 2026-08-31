"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  getCurrentUser,
  login as loginService,
  logout as logoutService,
  register as registerService,
  subscribeToAuthChange,
} from "@/services/auth.service";
import { getErrorMessage } from "@/lib/utils";
import type { Profile } from "@/types/user";
import type { Role } from "@/lib/constants/roles";

type AuthState = {
  user: User | null;
  profile: Profile | null;
  /** true solo durante la carga inicial de sesión — evita parpadeo (mostrar "sin sesión" un instante antes de saber que sí la hay). */
  initializing: boolean;
  /** true mientras hay un login/register/logout en curso. */
  loading: boolean;
  error: string | null;
};

const INITIAL_STATE: AuthState = {
  user: null,
  profile: null,
  initializing: true,
  loading: false,
  error: null,
};

function errorMessage(error: unknown): string {
  return getErrorMessage(error);
}

/**
 * Estado global de sesión. Escucha cambios de sesión (login/logout desde
 * otra pestaña, expiración/refresh de token) vía
 * `subscribeToAuthChange` de `services/auth.service.ts`, y recarga el
 * profile cada vez que cambia. Sin lógica de negocio propia ni cliente de
 * Supabase propio — todo eso vive en la capa de servicios (Fase 3.8: este
 * hook solo conoce `services/`, nunca al proveedor de datos directamente).
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  const refreshProfile = useCallback(async () => {
    const { user, profile } = await getCurrentUser();
    setState((prev) => ({ ...prev, user, profile, initializing: false }));
  }, []);

  useEffect(() => {
    refreshProfile();
    return subscribeToAuthChange(refreshProfile);
  }, [refreshProfile]);

  const register = useCallback(async (input: { email: string; password: string; displayName: string; role: Role }) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await registerService(input);
      setState((prev) => ({ ...prev, loading: false }));
      return data;
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: errorMessage(error) }));
      throw error;
    }
  }, []);

  const login = useCallback(async (input: { email: string; password: string }) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await loginService(input);
      setState((prev) => ({ ...prev, loading: false }));
      return data;
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: errorMessage(error) }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await logoutService();
      setState((prev) => ({ ...prev, loading: false }));
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: errorMessage(error) }));
      throw error;
    }
  }, []);

  return { ...state, register, login, logout };
}
