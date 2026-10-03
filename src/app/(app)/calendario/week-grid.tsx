"use client";

import { useOptimistic, useRef, useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, GripVertical, Pin, Repeat, Send, X } from "lucide-react";
import { moveEvent, moveRecording } from "@/app/actions";
import { cx } from "@/components/ui";
import { addDays, formatClock, formatShort, weekday, weekdayName, weekdayShort } from "@/lib/dates";
import { FORMAT_LABEL, type Format } from "@/lib/domain";

export type GridItem = {
  kind: "gravacao" | "compromisso";
  id: string;
  date: string;
  start: number;
  end: number;
  title: string;
  /** Formato (gravação) ou nada (compromisso). */
  format?: Format;
  /** Gravação com dia/horário escolhidos pela usuária. */
  pinned?: boolean;
  recurring?: boolean;
};

export type GridDay = {
  date: string;
  /** Janelas livres de gravação, para sombrear a grade. */
  slots: { start: number; end: number }[];
  publications: { id: string; title: string; format: Format }[];
};

const HOUR_PX = 80;
const SNAP = 15;
const DRAG_THRESHOLD = 5;

type Drag = {
  item: GridItem;
  pointerId: number;
  /** Distância (min) entre o topo do bloco e o ponto onde foi pego. */
  grabOffset: number;
  originX: number;
  originY: number;
  active: boolean;
  /** edge: soltou num dos alvos de semana anterior/seguinte. */
  target: { date: string; start: number; edge?: Edge } | null;
};

type Edge = "anterior" | "seguinte";
type Notice = { tone: "erro" | "ok"; text: string; href?: string };

type Move = { key: string; date: string; start: number };

const keyOf = (i: Pick<GridItem, "kind" | "id" | "date">) => `${i.kind}:${i.id}:${i.date}`;

function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(min-width: 1024px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => true,
  );
}

export function WeekGrid({
  days,
  items,
  today,
  startHour,
  endHour,
}: {
  days: GridDay[];
  items: GridItem[];
  today: string;
  startHour: number;
  endHour: number;
}) {
  const router = useRouter();
  const desktop = useIsDesktop();
  const [selected, setSelected] = useState(() => days.find((d) => d.date === today)?.date ?? days[0].date);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [, startTransition] = useTransition();
  const [moved, applyMove] = useOptimistic(items, (cur, m: Move) =>
    cur.map((i) =>
      keyOf(i) === m.key ? { ...i, date: m.date, start: m.start, end: m.start + (i.end - i.start) } : i,
    ),
  );

  const columns = useRef(new Map<string, HTMLDivElement>());
  const chips = useRef(new Map<string, HTMLButtonElement>());
  const edges = useRef(new Map<Edge, HTMLButtonElement>());
  const weekStart = days[0].date;

  const visible = desktop ? days : days.filter((d) => d.date === selected);
  const minStart = startHour * 60;
  const height = (endHour - startHour) * HOUR_PX;
  const toY = (min: number) => ((min - minStart) / 60) * HOUR_PX;

  /** Para onde o ponteiro está apontando: coluna da grade ou chip de dia (celular). */
  function targetAt(x: number, y: number, d: Drag): Drag["target"] {
    const duration = d.item.end - d.item.start;
    for (const [edge, el] of edges.current) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return { date: addDays(d.item.date, edge === "seguinte" ? 7 : -7), start: d.item.start, edge };
      }
    }
    for (const [date, el] of columns.current) {
      const r = el.getBoundingClientRect();
      if (x < r.left || x > r.right) continue;
      const raw = minStart + ((y - r.top) / HOUR_PX) * 60 - d.grabOffset;
      const snapped = Math.round(raw / SNAP) * SNAP;
      const start = Math.max(minStart, Math.min(endHour * 60 - duration, snapped));
      return { date, start };
    }
    for (const [date, el] of chips.current) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        return { date, start: d.item.start };
      }
    }
    return null;
  }

  function onPointerDown(e: React.PointerEvent, item: GridItem) {
    if (e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    setNotice(null);
    setDrag({
      item,
      pointerId: e.pointerId,
      grabOffset: ((e.clientY - r.top) / HOUR_PX) * 60,
      originX: e.clientX,
      originY: e.clientY,
      active: false,
      target: null,
    });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dist = Math.hypot(e.clientX - drag.originX, e.clientY - drag.originY);
    if (!drag.active && dist < DRAG_THRESHOLD) return;
    setDrag({ ...drag, active: true, target: targetAt(e.clientX, e.clientY, drag) });
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { item, active, target } = drag;
    setDrag(null);

    if (!active) {
      // Toque simples: abre o conteúdo ou o compromisso.
      router.push(item.kind === "gravacao" ? `/conteudos/${item.id}` : `/agenda?editar=${item.id}`);
      return;
    }
    if (!target || (target.date === item.date && target.start === item.start)) return;

    startTransition(async () => {
      applyMove({ key: keyOf(item), ...target });
      const res =
        item.kind === "gravacao"
          ? await moveRecording(item.id, target.date, target.start)
          : await moveEvent(item.id, item.date, target.date, target.start);
      if (res?.error) setNotice({ tone: "erro", text: res.error });
      else if (res && "adjusted" in res && res.adjusted) {
        setNotice({
          tone: "ok",
          text: `Horário ocupado${res.adjusted.after ? ` por "${res.adjusted.after}"` : ""}: "${item.title}" foi para ${formatShort(target.date)} às ${formatClock(res.adjusted.start)}.`,
          href: target.edge ? `?view=semana&d=${target.date}` : undefined,
        });
      } else if (target.edge) {
        setNotice({
          tone: "ok",
          text: `"${item.title}" foi para ${weekdayName(target.date)}, ${formatShort(target.date)} às ${formatClock(target.start)}.`,
          href: `?view=semana&d=${target.date}`,
        });
      }
    });
  }

  const ghost = drag?.active && drag.target && !drag.target.edge ? drag.target : null;
  const overEdge = drag?.active ? drag.target?.edge : undefined;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted">
        Arraste uma gravação ou um compromisso para mudar o dia ou o horário. Toque para abrir.
        {!desktop && " No celular, solte em cima de outro dia para trocar a data."} Para levar a outra semana,
        solte em cima de &quot;Semana anterior&quot; ou &quot;Semana seguinte&quot;.
      </p>

      {notice && (
        <div
          className={cx(
            "flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm text-ink-soft",
            notice.tone === "erro" ? "bg-alert-soft" : "bg-ok-soft",
          )}
        >
          <span className="flex-1">
            {notice.text}
            {notice.href && (
              <Link href={notice.href} className="ml-2 font-medium text-ink underline underline-offset-2">
                Ver semana
              </Link>
            )}
          </span>
          <button onClick={() => setNotice(null)} aria-label="Fechar" className="text-muted hover:text-ink">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Alvos para soltar em outra semana; fora de um arrasto, navegam. */}
      <div className="grid grid-cols-2 gap-2">
        {(["anterior", "seguinte"] as const).map((edge) => {
          const active = overEdge === edge;
          const dragging = drag?.active;
          return (
            <button
              key={edge}
              ref={(el) => {
                if (el) edges.current.set(edge, el);
                else edges.current.delete(edge);
              }}
              onClick={() => router.push(`?view=semana&d=${addDays(weekStart, edge === "seguinte" ? 7 : -7)}`)}
              className={cx(
                "flex items-center gap-2 rounded-xl border px-3.5 py-3 text-sm font-medium transition",
                edge === "seguinte" && "justify-end",
                active
                  ? "scale-[1.02] border-rose bg-rose-soft text-rose-deep"
                  : dragging
                    ? "border-dashed border-rose/60 bg-rose-wash text-rose-deep"
                    : "border-line bg-paper text-muted hover:text-ink",
              )}
            >
              {edge === "anterior" && <ArrowLeft size={16} />}
              {dragging ? `Soltar na semana ${edge}` : `Semana ${edge}`}
              {edge === "seguinte" && <ArrowRight size={16} />}
            </button>
          );
        })}
      </div>

      {!desktop && (
        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
          {days.map((d) => {
            const isTarget = ghost?.date === d.date && d.date !== drag?.item.date;
            return (
              <button
                key={d.date}
                ref={(el) => {
                  if (el) chips.current.set(d.date, el);
                  else chips.current.delete(d.date);
                }}
                onClick={() => setSelected(d.date)}
                className={cx(
                  "flex min-w-12 flex-col items-center rounded-2xl border px-2.5 py-1.5 text-xs transition",
                  d.date === selected ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-soft",
                  isTarget && "border-rose bg-rose-soft text-rose-deep",
                )}
              >
                <span className={cx("capitalize", weekday(d.date) === 6 && d.date !== selected && "text-rose-deep")}>
                  {weekdayShort(weekday(d.date))}
                </span>
                <span className="font-semibold tabular-nums">{d.date.slice(8)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="card overflow-hidden">
        {/* Cabeçalho dos dias + publicações */}
        <div className="flex border-b border-line">
          <div className="w-11 shrink-0" />
          {visible.map((d) => (
            <div key={d.date} className="min-w-0 flex-1 border-l border-line px-1.5 py-2">
              <p className={cx("text-center text-xs", d.date === today ? "font-semibold text-rose-deep" : "text-muted")}>
                <span className="capitalize">{desktop ? weekdayShort(weekday(d.date)) : weekdayName(d.date)}</span>{" "}
                <span className="tabular-nums">{formatShort(d.date)}</span>
              </p>
              {d.publications.map((p) => (
                <Link
                  key={p.id}
                  href={`/conteudos/${p.id}`}
                  title={`Publicar: ${p.title}`}
                  className="mt-1 flex items-center gap-1 truncate rounded-md bg-ink px-1.5 py-0.5 text-[10px] text-paper"
                >
                  <Send size={10} className="shrink-0 text-rose-soft" />
                  <span className="truncate">{p.title}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Grade de horários */}
        <div
          className={cx("relative flex select-none", drag?.active && "cursor-grabbing")}
          style={{ height }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => setDrag(null)}
        >
          <div className="relative w-11 shrink-0">
            {hours.map((h) => (
              <span
                key={h}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted tabular-nums"
                style={{ top: toY(h * 60) }}
              >
                {h > startHour && `${h}h`}
              </span>
            ))}
          </div>

          {visible.map((d) => (
            <div
              key={d.date}
              ref={(el) => {
                if (el) columns.current.set(d.date, el);
                else columns.current.delete(d.date);
              }}
              className={cx("relative min-w-0 flex-1 border-l border-line", d.date < today && "bg-mist/50")}
            >
              {hours.map((h) => (
                <div key={h} className="absolute inset-x-0 border-t border-line/70" style={{ top: toY(h * 60) }} />
              ))}
              {d.slots.map((s) => (
                <div
                  key={s.start}
                  className="absolute inset-x-0 bg-rose-wash"
                  style={{ top: toY(s.start), height: toY(s.end) - toY(s.start) }}
                />
              ))}

              {moved
                .filter((i) => i.date === d.date)
                .map((i) => {
                  const dragging = drag?.active && keyOf(drag.item) === keyOf(i);
                  return (
                    <Block
                      key={keyOf(i)}
                      item={i}
                      top={toY(i.start)}
                      height={toY(i.end) - toY(i.start)}
                      compact={desktop}
                      dimmed={dragging}
                      onPointerDown={(e) => onPointerDown(e, i)}
                    />
                  );
                })}

              {ghost && ghost.date === d.date && drag && (
                <Block
                  item={{ ...drag.item, start: ghost.start, end: ghost.start + (drag.item.end - drag.item.start) }}
                  top={toY(ghost.start)}
                  height={((drag.item.end - drag.item.start) / 60) * HOUR_PX}
                  compact={desktop}
                  ghost
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-rose-soft ring-1 ring-rose/40" /> Gravação
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-paper ring-1 ring-ink/30" /> Compromisso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-rose-wash" /> Janela livre para gravar
        </span>
        <span className="flex items-center gap-1.5">
          <Pin size={11} /> Fixado por você
        </span>
      </div>
    </div>
  );
}

function Block({
  item,
  top,
  height,
  compact,
  dimmed,
  ghost,
  onPointerDown,
}: {
  item: GridItem;
  top: number;
  height: number;
  compact: boolean;
  dimmed?: boolean;
  ghost?: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}) {
  const rec = item.kind === "gravacao";
  const tiny = height < 40;
  // Linhas de título que cabem no bloco (cabeçalho ~16px, linha ~14px).
  const lines = Math.max(1, Math.floor((height - 22) / 14));
  return (
    <div
      onPointerDown={onPointerDown}
      title={`${formatClock(item.start)}–${formatClock(item.end)} · ${rec && item.format ? `${FORMAT_LABEL[item.format]} · ` : ""}${item.title}`}
      style={{ top: top + 1, height: Math.max(height - 2, 18) }}
      className={cx(
        "absolute inset-x-0.5 z-10 flex touch-none flex-col gap-0.5 overflow-hidden rounded-md px-1.5 text-[11px] leading-[14px]",
        tiny ? "justify-center" : "py-1",
        rec ? "bg-rose-soft text-rose-deep ring-1 ring-rose/40" : "bg-paper text-ink ring-1 ring-ink/25",
        onPointerDown && "cursor-grab active:cursor-grabbing",
        dimmed && "opacity-30",
        ghost && "z-20 shadow-lg ring-2 ring-rose",
      )}
    >
      {tiny ? (
        <span className="truncate">
          <span className="text-[10px] tabular-nums opacity-75">{formatClock(item.start)} · </span>
          <span className="font-semibold">{item.title}</span>
        </span>
      ) : (
        <>
          <span className="flex items-center gap-1 text-[10px] tabular-nums opacity-75">
            {!compact && <GripVertical size={11} className="shrink-0" />}
            <span className="truncate">
              {formatClock(item.start)}–{formatClock(item.end)}
              {rec && item.format && ` · ${FORMAT_LABEL[item.format]}`}
            </span>
            {item.pinned && <Pin size={10} className="shrink-0" />}
            {item.recurring && <Repeat size={10} className="shrink-0" />}
          </span>
          <span
            className="font-semibold break-words"
            style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: lines, overflow: "hidden" }}
          >
            {item.title}
          </span>
        </>
      )}
    </div>
  );
}
