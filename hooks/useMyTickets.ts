"use client";

import { useCallback, useEffect, useState } from "react";
import { listMine } from "@/services/ticket.service";
import { getErrorMessage } from "@/lib/utils";
import type { SupportTicket } from "@/types/ticket";

/** Lista de tickets del usuario, para la sección "Mis tickets" de /soporte. Mismo patrón que `useOrders`. */
export function useMyTickets(userId: string | null) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) {
      setTickets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    listMine(userId)
      .then(setTickets)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { tickets, loading, error, retry: load };
}
