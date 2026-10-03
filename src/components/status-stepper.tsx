"use client";

import { useOptimistic, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { setStatus } from "@/app/actions";
import { STATUS_LABEL, STATUSES, nextStatus, prevStatus, type Status } from "@/lib/domain";
import { cx } from "./ui";

/** Avança ou volta uma etapa com um toque. */
export function StatusStepper({ id, status, compact }: { id: string; status: Status; compact?: boolean }) {
  const [current, setCurrent] = useOptimistic(status);
  const [, start] = useTransition();
  const next = nextStatus(current);
  const prev = prevStatus(current);

  const go = (s: Status) =>
    start(async () => {
      setCurrent(s);
      await setStatus(id, s);
    });

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {prev && (
          <button
            onClick={() => go(prev)}
            aria-label={`Voltar para ${STATUS_LABEL[prev]}`}
            className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-mist"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {next && (
          <button
            onClick={() => go(next)}
            className="chip border border-line bg-paper py-1.5 text-ink hover:border-rose hover:text-rose-deep"
          >
            {STATUS_LABEL[next]} <ChevronRight size={13} />
          </button>
        )}
      </div>
    );
  }

  const idx = STATUSES.indexOf(current);
  return (
    <div className="flex flex-col gap-3">
      <ol className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {STATUSES.map((s, i) => (
          <li key={s}>
            <button
              onClick={() => go(s)}
              className={cx(
                "chip border transition",
                i < idx && "border-transparent bg-rose-wash text-rose-deep",
                i === idx && "border-ink bg-ink text-paper",
                i > idx && "border-line bg-paper text-muted hover:text-ink",
              )}
            >
              {STATUS_LABEL[s]}
            </button>
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        {prev && (
          <button onClick={() => go(prev)} className="btn-outline">
            <ChevronLeft size={15} /> {STATUS_LABEL[prev]}
          </button>
        )}
        {next && (
          <button onClick={() => go(next)} className="btn-primary flex-1 sm:flex-none">
            Avançar para {STATUS_LABEL[next]} <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
