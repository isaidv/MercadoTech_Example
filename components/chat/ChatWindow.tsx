"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { LoadingMessage } from "@/components/chat/LoadingMessage";
import type { ChatUIMessage } from "@/types/chat";

type ChatWindowProps = {
  messages: ChatUIMessage[];
  loading: boolean;
};

/** Compone la conversación y hace auto-scroll al último mensaje (o al indicador de carga). Puro: recibe mensajes y estado por props, no conoce el endpoint. */
export function ChatWindow({ messages, loading }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-1 py-4">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {loading ? <LoadingMessage /> : null}
      <div ref={bottomRef} />
    </div>
  );
}
