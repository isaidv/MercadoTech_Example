/** Indicador de "escribiendo…" mientras se espera la respuesta — nunca un spinner, tres puntos animados en la posición de una burbuja del asistente. */
export function LoadingMessage() {
  return (
    <div className="flex flex-col items-start">
      <div
        role="status"
        aria-label="El asistente está escribiendo"
        className="flex items-center gap-1 rounded-lg bg-muted px-4 py-3"
      >
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </div>
    </div>
  );
}
