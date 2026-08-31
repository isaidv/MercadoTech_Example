"use client";

import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatInput } from "@/components/chat/ChatInput";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";

const STARTER_SUGGESTIONS = [
  "¿qué laptop me recomiendas para diseño por menos de S/ 3,500?",
  "busco audífonos inalámbricos para ir al gimnasio",
  "¿cuál es el celular con mejor cámara que tienen?",
];

/**
 * Asesor de compras (Fase 4.7, modo 'compras'). `/asistente` ya está en
 * `PROTECTED_ROUTE_PREFIXES` — si esta página llega a renderizar es porque
 * el middleware ya confirmó sesión. Igual se respeta `initializing` (mismo
 * patrón que `/favoritos` y `/pedidos`) para no parpadear un chat vacío
 * mientras `useAuth` termina de hidratar en el cliente.
 */
export default function AsistentePage() {
  const { initializing } = useAuth();
  const { messages, loading, sendMessage } = useChat("compras");

  if (initializing) {
    return <LoadingState />;
  }

  return (
    <div className="flex h-[70vh] flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold">Asesor de compras</h1>

      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">Contame qué estás buscando, con tus propias palabras.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {STARTER_SUGGESTIONS.map((suggestion) => (
              <Button key={suggestion} variant="outline" size="sm" onClick={() => sendMessage(suggestion)}>
                {suggestion}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <ChatWindow messages={messages} loading={loading} />
      )}

      <ChatInput onSend={sendMessage} disabled={loading} placeholder="¿Qué producto estás buscando?" />
    </div>
  );
}
