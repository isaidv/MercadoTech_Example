"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { useMyTickets } from "@/hooks/useMyTickets";
import { ChatInput } from "@/components/chat/ChatInput";
import { TicketCard } from "@/components/support/TicketCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";

// Fase 7.2 — mismo `dynamic import` que `/asistente` (mismo componente,
// mismo motivo: docs/PERFORMANCE.md, decisión 4).
const ChatWindow = dynamic(() => import("@/components/chat/ChatWindow").then((m) => m.ChatWindow), {
  ssr: false,
  loading: () => <LoadingState>Cargando conversación…</LoadingState>,
});

/**
 * Agente de soporte (Fase 4.7, modo 'soporte') + "Mis tickets" debajo
 * (decisión 5: solo lectura, crear tickets llega con el agente de voz de
 * la sesión 8). `/soporte` ya está en `PROTECTED_ROUTE_PREFIXES`.
 */
export default function SoportePage() {
  const { user, initializing } = useAuth();
  const { messages, loading, sendMessage } = useChat("soporte");
  const { tickets, loading: ticketsLoading, error: ticketsError, retry } = useMyTickets(user?.id ?? null);

  if (initializing) {
    return <LoadingState />;
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex h-[60vh] flex-col gap-4">
        <h1 className="font-heading text-2xl font-semibold">Soporte</h1>

        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              Contame tu problema y busco en nuestras guías de ayuda.
            </p>
          </div>
        ) : (
          <ChatWindow messages={messages} loading={loading} />
        )}

        {/* Sesión 8: acá se agrega el botón de micrófono, al lado de ChatInput — sin tocar ChatWindow ni el historial. */}
        <ChatInput onSend={sendMessage} disabled={loading} placeholder="¿En qué te podemos ayudar?" />
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-heading text-xl font-semibold">Mis tickets</h2>
        {ticketsLoading ? (
          <LoadingState />
        ) : ticketsError ? (
          <ErrorState description={ticketsError} onRetry={retry} />
        ) : tickets.length === 0 ? (
          <EmptyState
            title="No tienes tickets"
            description="Cuando necesites ayuda de un agente, tus tickets van a aparecer acá."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
