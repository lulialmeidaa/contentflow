"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pin, Repeat, X } from "lucide-react";
import { moveEvent, moveRecording, updateContent } from "@/app/actions";
import { cx } from "@/components/ui";
import { formatClock, formatShort, weekdayShort } from "@/lib/dates";
import { FORMAT_LABEL, type Format } from "@/lib/domain";

export type MonthEntry = {
  kind: "gravacao" | "compromisso" | "publicacao";
  id: string;
  date: string;
  start: number;
  end: number;
  title: string;
  format?: Format;
  pinned?: boolean;
  recurring?: boolean;
};

export type MonthCell = { date: string; inMonth: boolean };

const DRAG_THRESHOLD = 5;

const TONE = {
  gravacao: "bg-rose-soft text-rose-deep ring-1 ring-rose/40",
  compromisso: "bg-paper text-ink ring-1 ring-ink/25",
  publicacao: "bg-ink text-paper",
};

type Drag = {
  entry: MonthEntry;
  pointerId: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
  active: boolean;
  target: string | null;
};

const keyOf = (e: Pick<MonthEntry, "kind" | "id" | "date">) => `${e.kind}:${e.id}:${e.date}`;

function meta(e: MonthEntry) {
  if (e.kind === "publicacao") return `Publicar · ${FORMAT_LABEL[e.format!]}`;
  if (e.kind === "compromisso") return `${formatClock(e.start)}–${formatClock(e.end)}`;
  return `${formatClock(e.start)} · ${FORMAT_LABEL[e.format!]}`;
}

/** Mês com itens arrastáveis entre dias (mantém o horário). */
export function MonthGrid({ cells, entries, today }: { cells: MonthCell[]; entries: MonthEntry[]; today: string }) {
  const router = useRouter();
  const [drag, setDrag] = useState<Drag | null>(null);
  const [notice, setNotice] = useState<{ tone: "erro" | "ok"; text: string } | null>(null);
  const [, startTransition] = useTransition();
  const [shown, applyMove] = useOptimistic(entries, (cur, m: { key: string; date: string }) =>
    cur.map((e) => (keyOf(e) === m.key ? { ...e, date: m.date } : e)),
  );
  const cellEls = useRef(new Map<string, HTMLDivElement>());

  function cellAt(x: number, y: number) {
    for (const [date, el] of cellEls.current) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return date;
    }
    return null;
  }

  function onPointerDown(e: React.PointerEvent, entry: MonthEntry) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setNotice(null);
    setDrag({
      entry,
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      x: e.clientX,
      y: e.clientY,
      active: false,
      target: null,
    });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dist = Math.hypot(e.clientX - drag.originX, e.clientY - drag.originY);
    if (!drag.active && dist < DRAG_THRESHOLD) return;
    setDrag({ ...drag, active: true, x: e.clientX, y: e.clientY, target: cellAt(e.clientX, e.clientY) });
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.stopPropagation();
    const { entry, active, target } = drag;
    setDrag(null);

    if (!active) {
      router.push(entry.kind === "compromisso" ? `/agenda?editar=${entry.id}` : `/conteudos/${entry.id}`);
      return;
    }
    if (!target || target === entry.date) return;

    startTransition(async () => {
      applyMove({ key: keyOf(entry), date: target });
      const res =
        entry.kind === "gravacao"
          ? await moveRecording(entry.id, target, entry.start)
          : entry.kind === "compromisso"
            ? await moveEvent(entry.id, entry.date, target, entry.start)
            : await updateContent(entry.id, { publication_date: target });
      if (res?.error) setNotice({ tone: "erro", text: res.error });
      else if (res && "adjusted" in res && res.adjusted) {
        setNotice({
          tone: "ok",
          text: `Horário ocupado${res.adjusted.after ? ` por "${res.adjusted.after}"` : ""}: "${entry.title}" foi para ${formatShort(target)} às ${formatClock(res.adjusted.start)}.`,
        });
      }
    });
  }

  const dragging = drag?.active ? drag : null;

  return (
    <div className="flex flex-col gap-3">
      <p className="hidden text-xs text-muted md:block">
        Arraste uma gravação, compromisso ou publicação para outro dia (o horário continua o mesmo). Toque para abrir.
      </p>

      {notice && (
        <div
          className={cx(
            "flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm text-ink-soft",
            notice.tone === "erro" ? "bg-alert-soft" : "bg-ok-soft",
          )}
        >
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Fechar" className="text-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>
      )}

      <div
        className={cx("card overflow-hidden select-none", dragging && "cursor-grabbing")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
      >
        <div className="grid grid-cols-7 border-b border-line text-center text-[11px] font-medium text-muted uppercase">
          {[1, 2, 3, 4, 5, 6, 0].map((w) => (
            <div key={w} className={cx("py-2", w === 6 && "text-rose-deep")}>
              {weekdayShort(w)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map(({ date, inMonth }) => {
            const items = shown
              .filter((e) => e.date === date)
              .sort((a, b) => (a.kind === "publicacao" ? -1 : b.kind === "publicacao" ? 1 : a.start - b.start));
            const isTarget = dragging?.target === date && date !== dragging.entry.date;
            return (
              <div
                key={date}
                ref={(el) => {
                  if (el) cellEls.current.set(date, el);
                  else cellEls.current.delete(date);
                }}
                onClick={() => router.push(`?view=semana&d=${date}`)}
                className={cx(
                  "flex min-h-16 cursor-pointer flex-col gap-1 border-r border-b border-line p-1.5 transition md:min-h-28 md:p-2 [&:nth-child(7n)]:border-r-0",
                  !inMonth && "bg-mist/60 text-muted/60",
                  isTarget ? "bg-rose-wash ring-2 ring-rose ring-inset" : "hover:bg-rose-wash/60",
                )}
              >
                <span
                  className={cx(
                    "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                    date === today && "bg-ink font-semibold text-paper",
                  )}
                >
                  {Number(date.slice(8))}
                </span>
                {/* Celular: pontos. Desktop: itens arrastáveis. */}
                <span className="flex flex-wrap gap-0.5 md:hidden">
                  {items.some((e) => e.kind === "gravacao") && <span className="size-1.5 rounded-full bg-rose" />}
                  {items.some((e) => e.kind === "publicacao") && <span className="size-1.5 rounded-full bg-ink" />}
                  {items.some((e) => e.kind === "compromisso") && <span className="size-1.5 rounded-full bg-line" />}
                </span>
                <span className="hidden flex-col gap-1 md:flex">
                  {items.map((e) => (
                    <Entry
                      key={keyOf(e)}
                      entry={e}
                      dimmed={!!dragging && keyOf(dragging.entry) === keyOf(e)}
                      onPointerDown={(ev) => onPointerDown(ev, e)}
                    />
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cópia que segue o ponteiro durante o arrasto. */}
      {dragging && (
        <div
          className="pointer-events-none fixed z-50 w-40 -translate-x-1/2 -translate-y-1/2 rotate-2 shadow-xl"
          style={{ left: dragging.x, top: dragging.y }}
        >
          <Entry entry={dragging.entry} />
          {dragging.target && dragging.target !== dragging.entry.date && (
            <span className="mt-1 block rounded bg-ink px-1.5 py-0.5 text-center text-[10px] text-paper">
              → {formatShort(dragging.target)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Entry({
  entry,
  dimmed,
  onPointerDown,
}: {
  entry: MonthEntry;
  dimmed?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const m = meta(entry);
  return (
    <span
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
      title={`${m} · ${entry.title}`}
      className={cx(
        "flex touch-none flex-col rounded-md px-1.5 py-1 text-[11px] leading-[14px]",
        TONE[entry.kind],
        onPointerDown && "cursor-grab",
        dimmed && "opacity-30",
      )}
    >
      <span className="flex items-center gap-1 text-[10px] tabular-nums opacity-75">
        <span className="truncate">{m}</span>
        {entry.pinned && <Pin size={10} className="shrink-0" />}
        {entry.recurring && <Repeat size={10} className="shrink-0" />}
      </span>
      <span className="line-clamp-2 font-semibold break-words">{entry.title}</span>
    </span>
  );
}
