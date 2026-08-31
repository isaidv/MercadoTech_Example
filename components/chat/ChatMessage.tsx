import { cn } from "@/lib/utils";
import { SourcesList } from "@/components/chat/SourcesList";
import type { ChatUIMessage } from "@/types/chat";

type ChatMessageProps = {
  message: ChatUIMessage;
};

/** Burbuja pura: usuario a la derecha, asistente a la izquierda (con sus fuentes debajo, si trae). Solo pinta lo que le llega por props. */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-4 py-2.5 text-sm whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground"
            : message.isError
              ? "border border-destructive/30 bg-destructive/5 text-destructive"
              : "bg-muted text-foreground",
        )}
      >
        {message.content}
      </div>
      {message.sources && message.sources.length > 0 ? <SourcesList sources={message.sources} /> : null}
    </div>
  );
}
