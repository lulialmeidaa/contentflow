"use client";

import { useOptimistic, useRef, useTransition } from "react";
import { Pin, Video, X } from "lucide-react";
import { updateContent } from "@/app/actions";
import { formatShort } from "@/lib/dates";
import { cx } from "./ui";

/**
 * Data de gravação editável na lista. Mostra a data sugerida pelo planejador;
 * escolher outra fixa o dia (o horário volta a ser automático).
 */
export function RecordingDatePicker({
  id,
  planned,
  pinned,
}: {
  id: string;
  /** Data em que o planejador colocou a gravação. */
  planned: string | undefined;
  /** recording_date fixado pela usuária. */
  pinned: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [, start] = useTransition();
  const [value, setValue] = useOptimistic(pinned);
  const shown = value ?? planned;

  const save = (recording_date: string | null) =>
    start(async () => {
      setValue(recording_date);
      await updateContent(id, { recording_date });
    });

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => {
          const el = input.current;
          if (!el) return;
          try {
            el.showPicker();
          } catch {
            el.focus();
          }
        }}
        title={value ? "Data de gravação fixada por você" : "Data sugerida pelo planejador. Toque para mudar."}
        className={cx(
          "chip gap-1 border py-0.5 transition",
          value
            ? "border-rose/50 bg-rose-wash text-rose-deep"
            : "border-dashed border-line bg-paper text-muted hover:border-rose hover:text-rose-deep",
        )}
      >
        {value ? <Pin size={11} /> : <Video size={12} />}
        {shown ? `gravar ${formatShort(shown)}` : "definir gravação"}
      </button>
      {value && (
        <button
          type="button"
          onClick={() => save(null)}
          aria-label="Voltar para a data automática"
          title="Voltar para a data automática"
          className="ml-0.5 flex size-5 items-center justify-center rounded-full text-muted hover:bg-mist hover:text-ink"
        >
          <X size={12} />
        </button>
      )}
      <input
        ref={input}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={shown ?? ""}
        onChange={(e) => e.target.value && save(e.target.value)}
        className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 opacity-0"
      />
    </span>
  );
}
