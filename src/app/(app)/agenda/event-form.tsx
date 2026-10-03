"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteEvent, saveEvent } from "@/app/actions";
import { cx } from "@/components/ui";
import { weekdayShort } from "@/lib/dates";
import { RECURRENCE_LABEL, RECURRENCES, type PersonalEvent } from "@/lib/domain";

export function EventForm({ event, today }: { event: PersonalEvent | null; today: string }) {
  const [state, action, pending] = useActionState(saveEvent, undefined);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok && event) router.replace("/agenda");
  }, [state, event, router]);

  return (
    // Remonta o formulário depois de salvar, para começar limpo.
    <form
      key={state?.ok ?? 0}
      // onSubmit em vez de action: assim um erro (ex.: conflito de horário)
      // não apaga o que foi digitado.
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="grid gap-4 sm:grid-cols-6"
    >
      <Fields event={event} today={today} />
      <div className="flex flex-wrap items-center gap-3 sm:col-span-6">
        <button disabled={pending} className="btn-primary">
          {pending ? "Salvando..." : event ? "Salvar alterações" : "Adicionar compromisso"}
        </button>
        {event && (
          <>
            <Link href="/agenda" className="btn-ghost">
              Cancelar
            </Link>
            <button
              type="button"
              onClick={async () => {
                await deleteEvent(event.id);
                router.replace("/agenda");
              }}
              className="btn-ghost ml-auto text-alert"
            >
              Excluir
            </button>
          </>
        )}
        {state?.error && <p className="text-sm text-alert">{state.error}</p>}
      </div>
    </form>
  );
}

// Ordem de exibição: segunda → domingo
const WEEK = [1, 2, 3, 4, 5, 6, 0];

function Fields({ event, today }: { event: PersonalEvent | null; today: string }) {
  const [mode, setMode] = useState<"data" | "semana">(
    event?.recurrence === "dias_semana" ? "semana" : "data",
  );
  const [recurrence, setRecurrence] = useState(
    event && event.recurrence !== "dias_semana" ? event.recurrence : "nenhuma",
  );
  const [days, setDays] = useState<number[]>(event?.weekdays ?? []);
  const toggleDay = (d: number) =>
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  return (
    <>
      {event && <input type="hidden" name="id" value={event.id} />}
      <label className="sm:col-span-6">
        <span className="label">Título</span>
        <input name="title" defaultValue={event?.title} placeholder="Academia, médico, inglês..." className="field" required />
      </label>

      <div className="sm:col-span-6">
        <span className="label">Quando</span>
        <div className="flex w-fit rounded-full bg-mist p-1 text-xs font-medium">
          {(
            [
              ["data", "Data"],
              ["semana", "Dias da semana"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={cx(
                "rounded-full px-3.5 py-1.5 transition",
                mode === value ? "bg-paper text-ink shadow-sm" : "text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "semana" ? (
        <>
          <input type="hidden" name="recurrence" value="dias_semana" />
          <div className="sm:col-span-6" role="group" aria-label="Dias da semana">
            <div className="flex flex-wrap gap-1.5">
              {WEEK.map((d) => {
                const on = days.includes(d);
                return (
                  <label
                    key={d}
                    className={cx(
                      "flex h-10 min-w-12 cursor-pointer items-center justify-center rounded-full border px-3 text-sm font-medium capitalize transition select-none",
                      on ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-soft hover:border-ink/30",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="weekdays"
                      value={d}
                      checked={on}
                      onChange={() => toggleDay(d)}
                      className="sr-only"
                    />
                    {weekdayShort(d)}
                  </label>
                );
              })}
            </div>
          </div>
          <TimeFields event={event} />
          <label className="sm:col-span-3">
            <span className="label">A partir de</span>
            <input type="date" name="date" defaultValue={event?.date ?? today} className="field" required />
          </label>
          <label className="sm:col-span-3">
            <span className="label">Até (opcional)</span>
            <input type="date" name="recurrence_until" defaultValue={event?.recurrence_until ?? ""} className="field" />
          </label>
        </>
      ) : (
        <>
          <label className="sm:col-span-2">
            <span className="label">Data</span>
            <input type="date" name="date" defaultValue={event?.date ?? today} className="field" required />
          </label>
          <TimeFields event={event} />
          <label className="sm:col-span-3">
            <span className="label">Repetir</span>
            <select
              name="recurrence"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
              className="field"
            >
              {RECURRENCES.filter((r) => r !== "dias_semana").map((r) => (
                <option key={r} value={r}>
                  {RECURRENCE_LABEL[r]}
                </option>
              ))}
            </select>
          </label>
          {recurrence !== "nenhuma" && (
            <label className="sm:col-span-3">
              <span className="label">Até (opcional)</span>
              <input type="date" name="recurrence_until" defaultValue={event?.recurrence_until ?? ""} className="field" />
            </label>
          )}
        </>
      )}

      <label className="sm:col-span-6">
        <span className="label">Observação (opcional)</span>
        <input name="notes" defaultValue={event?.notes} className="field" />
      </label>
    </>
  );
}

function TimeFields({ event }: { event: PersonalEvent | null }) {
  return (
    <>
      <label className="sm:col-span-2">
        <span className="label">Início</span>
        <input type="time" name="start_time" defaultValue={event?.start_time.slice(0, 5) ?? "09:00"} className="field" required />
      </label>
      <label className="sm:col-span-2">
        <span className="label">Fim</span>
        <input type="time" name="end_time" defaultValue={event?.end_time.slice(0, 5) ?? "10:00"} className="field" required />
      </label>
    </>
  );
}
