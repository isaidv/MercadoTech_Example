"use client";

import { useState, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type ChatInputProps = {
  onSend: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

/** Enter envía, Shift+Enter agrega una línea. `disabled` durante la carga: evita mandar una segunda consulta mientras la primera todavía no responde. */
export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex items-end gap-2 border-t border-border pt-3">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder ?? "Escribe tu consulta…"}
        className="min-h-11"
        rows={1}
      />
      <Button onClick={submit} disabled={disabled || value.trim() === ""} size="icon">
        <Send aria-hidden="true" />
        <span className="sr-only">Enviar</span>
      </Button>
    </div>
  );
}
