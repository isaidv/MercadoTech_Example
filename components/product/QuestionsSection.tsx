"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Question } from "@/types/question";

type QuestionsSectionProps = {
  questions: Question[];
  isAuthenticated: boolean;
  /** `profile?.id === product.seller_id` — lo calcula la página, no este componente. */
  isOwner: boolean;
  onAsk: (text: string) => Promise<void>;
  onAnswer: (questionId: string, text: string) => Promise<void>;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

function AnswerForm({
  questionId,
  onAnswer,
}: {
  questionId: string;
  onAnswer: QuestionsSectionProps["onAnswer"];
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onAnswer(questionId, trimmed);
      setText("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 pl-4">
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Escribe tu respuesta..."
        aria-label="Tu respuesta a esta pregunta"
        rows={2}
        required
      />
      <Button type="submit" size="sm" className="self-end" disabled={submitting}>
        {submitting ? "Enviando..." : "Responder"}
      </Button>
    </form>
  );
}

/**
 * Lista Q&A + formulario "Preguntar" (si hay sesión; si no, link a login).
 * Si `isOwner`, input inline para responder las que aún no tienen `answer`.
 *
 * "Usuario" en vez del nombre real de quien pregunta: `profiles` solo es
 * legible por su propio dueño o un admin (policy `profiles_select_own_or_admin`,
 * decisión 8 de la spec) — mostrar el nombre real requeriría una vista
 * `public_profiles` nueva, fuera de alcance de esta sesión.
 */
export function QuestionsSection({ questions, isAuthenticated, isOwner, onAsk, onAnswer }: QuestionsSectionProps) {
  const [newQuestion, setNewQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  async function handleAsk(event: FormEvent) {
    event.preventDefault();
    const trimmed = newQuestion.trim();
    if (!trimmed) return;
    setAsking(true);
    try {
      await onAsk(trimmed);
      setNewQuestion("");
    } finally {
      setAsking(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold">Preguntas y respuestas</h2>

      {isAuthenticated ? (
        <form onSubmit={handleAsk} className="flex flex-col gap-2">
          <Textarea
            value={newQuestion}
            onChange={(event) => setNewQuestion(event.target.value)}
            placeholder="Escribe tu pregunta sobre este producto..."
            aria-label="Tu pregunta sobre este producto"
            rows={2}
          />
          <Button type="submit" size="sm" className="self-end" disabled={asking}>
            {asking ? "Enviando..." : "Preguntar"}
          </Button>
        </form>
      ) : (
        <Button render={<Link href="/login" />} variant="outline" className="self-start">
          Inicia sesión para preguntar
        </Button>
      )}

      {questions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay preguntas sobre este producto.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {questions.map((question) => (
            <li key={question.id} className="flex flex-col gap-2 border-b border-border pb-4 last:border-b-0">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">Usuario preguntó:</p>
                <p className="text-sm">{question.question}</p>
                <p className="text-xs text-muted-foreground">{formatDate(question.created_at)}</p>
              </div>

              {question.answer ? (
                <div className="flex flex-col gap-0.5 pl-4">
                  <p className="text-sm font-medium">Respuesta del vendedor:</p>
                  <p className="text-sm">{question.answer}</p>
                </div>
              ) : isOwner ? (
                <AnswerForm questionId={question.id} onAnswer={onAnswer} />
              ) : (
                <p className="pl-4 text-sm text-muted-foreground">Sin responder todavía.</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
