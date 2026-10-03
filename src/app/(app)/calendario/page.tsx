import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clapperboard, Send } from "lucide-react";
import { PageHeader, cx } from "@/components/ui";
import { getContents, getEvents, getPlan, getProfile, getToday } from "@/lib/data";
import {
  addDays,
  addMonths,
  daysInMonth,
  formatClock,
  formatDuration,
  formatShort,
  monthName,
  range,
  startOfMonth,
  startOfWeek,
  weekday,
  weekdayName,
  weekdayShort,
  type ISODate,
} from "@/lib/dates";
import { FORMAT_LABEL, type Content } from "@/lib/domain";
import { eventsOn, freeSlots, type DayPlan } from "@/lib/planner";

export const metadata: Metadata = { title: "Calendário" };

type View = "mes" | "semana";

export default async function CalendarPage(props: PageProps<"/calendario">) {
  const sp = await props.searchParams;
  const view: View = sp.view === "semana" ? "semana" : "mes";
  const [today, plan, contents, events, profile] = await Promise.all([
    getToday(),
    getPlan(),
    getContents(),
    getEvents(),
    getProfile(),
  ]);
  const anchor = typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : today;

  const planByDate = new Map(plan.days.map((d) => [d.date, d]));
  const publications = new Map<ISODate, Content[]>();
  for (const c of contents) {
    if (!c.publication_date || c.status === "ideia") continue;
    publications.set(c.publication_date, [...(publications.get(c.publication_date) ?? []), c]);
  }

  const dayInfo = (date: ISODate) => {
    const planned = planByDate.get(date);
    const busy = planned?.busy ?? eventsOn(events, date);
    return {
      date,
      planned,
      busy,
      slots: planned?.slots ?? freeSlots(profile.recording_windows, busy, date),
      publications: publications.get(date) ?? [],
    };
  };

  const start = view === "mes" ? startOfMonth(anchor) : startOfWeek(anchor);
  const prev = view === "mes" ? addMonths(start, -1) : addDays(start, -7);
  const next = view === "mes" ? addMonths(start, 1) : addDays(start, 7);
  const title =
    view === "mes"
      ? `${monthName(start)} ${start.slice(0, 4)}`
      : `${formatShort(start)} — ${formatShort(addDays(start, 6))}`;

  return (
    <>
      <PageHeader
        eyebrow="Calendário"
        title={<span className="capitalize">{title}</span>}
        action={
          <div className="flex items-center gap-1">
            <Link href={`?view=${view}&d=${prev}`} aria-label="Anterior" className="btn-ghost size-9 p-0">
              <ChevronLeft size={18} />
            </Link>
            <Link href={`?view=${view}`} className="btn-ghost px-3 text-xs">
              Hoje
            </Link>
            <Link href={`?view=${view}&d=${next}`} aria-label="Próximo" className="btn-ghost size-9 p-0">
              <ChevronRight size={18} />
            </Link>
          </div>
        }
      />

      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex rounded-full bg-paper p-0.5 text-xs font-medium ring-1 ring-line">
          {(
            [
              ["mes", "Mês"],
              ["semana", "Semana"],
            ] as const
          ).map(([v, label]) => (
            <Link
              key={v}
              href={`?view=${v}&d=${anchor}`}
              className={cx("rounded-full px-4 py-1.5", view === v ? "bg-ink text-paper" : "text-muted")}
            >
              {label}
            </Link>
          ))}
        </div>
        <Legend />
      </div>

      {view === "mes" ? (
        <MonthGrid start={start} today={today} info={dayInfo} />
      ) : (
        <WeekList days={range(start, 7).map(dayInfo)} today={today} />
      )}
    </>
  );
}

type Info = {
  date: ISODate;
  planned?: DayPlan;
  busy: ReturnType<typeof eventsOn>;
  slots: { start: number; end: number }[];
  publications: Content[];
};

function Legend() {
  return (
    <div className="hidden items-center gap-4 text-xs text-muted sm:flex">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-rose" /> Gravação
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-ink" /> Publicação
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-line" /> Compromisso
      </span>
    </div>
  );
}

function MonthGrid({ start, today, info }: { start: ISODate; today: ISODate; info: (d: ISODate) => Info }) {
  const lead = (weekday(start) + 6) % 7; // semana começa na segunda
  const total = Math.ceil((lead + daysInMonth(start)) / 7) * 7;
  const cells = range(addDays(start, -lead), total);
  const month = start.slice(0, 7);

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line text-center text-[11px] font-medium text-muted uppercase">
        {[1, 2, 3, 4, 5, 6, 0].map((w) => (
          <div key={w} className={cx("py-2", w === 6 && "text-rose-deep")}>
            {weekdayShort(w)}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date) => {
          const d = info(date);
          const rec = d.planned?.items ?? [];
          const inMonth = date.startsWith(month);
          return (
            <Link
              key={date}
              href={`?view=semana&d=${date}`}
              className={cx(
                "flex min-h-16 flex-col gap-1 border-r border-b border-line p-1.5 text-left transition hover:bg-rose-wash md:min-h-28 md:p-2 [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-mist/60 text-muted/60",
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
              {/* Celular: pontos. Desktop: rótulos. */}
              <span className="flex flex-wrap gap-0.5 md:hidden">
                {rec.length > 0 && <span className="size-1.5 rounded-full bg-rose" />}
                {d.publications.length > 0 && <span className="size-1.5 rounded-full bg-ink" />}
                {d.busy.length > 0 && <span className="size-1.5 rounded-full bg-line" />}
              </span>
              <span className="hidden flex-col gap-0.5 text-[11px] leading-tight md:flex">
                {rec.length > 0 && (
                  <span className="truncate rounded bg-rose-soft px-1.5 py-0.5 font-medium text-rose-deep">
                    {rec.length >= 3 ? "Lote" : "Gravar"} · {rec.length}
                  </span>
                )}
                {d.publications.slice(0, 2).map((c) => (
                  <span key={c.id} className="truncate rounded bg-ink px-1.5 py-0.5 text-paper">
                    {FORMAT_LABEL[c.format]} · {c.title}
                  </span>
                ))}
                {d.publications.length > 2 && <span className="text-muted">+{d.publications.length - 2}</span>}
                {d.busy.slice(0, 2).map((o) => (
                  <span key={o.event.id} className="truncate text-muted">
                    {formatClock(o.start)} {o.event.title}
                  </span>
                ))}
                {d.busy.length > 2 && <span className="text-muted">+{d.busy.length - 2}</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function WeekList({ days, today }: { days: Info[]; today: ISODate }) {
  return (
    <div className="grid gap-3 lg:grid-cols-7 lg:gap-2">
      {days.map((d) => {
        const rec = d.planned?.items ?? [];
        const isWeekend = [0, 6].includes(weekday(d.date));
        const free = d.slots.reduce((s, x) => s + x.end - x.start, 0);
        return (
          <div
            key={d.date}
            className={cx(
              "card flex flex-col gap-2.5 p-3.5 lg:min-h-72",
              d.date === today && "ring-1 ring-ink",
              rec.length >= 3 && "border-rose/40 bg-rose-wash",
            )}
          >
            <p className="flex items-baseline justify-between">
              <span className={cx("text-sm font-semibold capitalize", isWeekend && "text-rose-deep")}>
                {weekdayName(d.date)}
              </span>
              <span className="text-xs text-muted tabular-nums">{formatShort(d.date)}</span>
            </p>

            {d.busy.map((o) => (
              <p key={o.event.id} className="text-xs text-ink-soft">
                <span className="text-muted tabular-nums">{formatClock(o.start)}</span> — {o.event.title}
              </p>
            ))}

            {rec.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-rose-deep uppercase">
                  <Clapperboard size={13} />
                  {rec.length >= 3 ? "Gravação em lote" : "Gravar"}
                </p>
                {rec.map((it) => (
                  <Link
                    key={it.content.id}
                    href={`/conteudos/${it.content.id}`}
                    className="rounded-lg bg-paper px-2.5 py-1.5 text-xs ring-1 ring-line hover:ring-rose"
                  >
                    <span className="block text-muted tabular-nums">
                      {formatClock(it.start)}–{formatClock(it.end)} · {FORMAT_LABEL[it.content.format]}
                    </span>
                    <span className="line-clamp-2 font-medium">{it.content.title}</span>
                  </Link>
                ))}
                <p className="text-[11px] text-muted">
                  {formatDuration(d.planned!.usedMinutes)} de {formatDuration(d.planned!.availableMinutes)}
                </p>
              </div>
            ) : d.date >= today && free > 0 ? (
              <p className="text-xs text-muted">
                Janela livre{" "}
                {d.slots.map((s) => `${formatClock(s.start)}–${formatClock(s.end)}`).join(", ")}
              </p>
            ) : (
              <p className="text-xs text-muted/70">Sem gravação</p>
            )}

            {d.publications.map((c) => (
              <Link
                key={c.id}
                href={`/conteudos/${c.id}`}
                className="mt-auto flex items-center gap-1.5 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-paper"
              >
                <Send size={12} className="shrink-0 text-rose-soft" />
                <span className="truncate">
                  {FORMAT_LABEL[c.format]} · {c.title}
                </span>
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}
