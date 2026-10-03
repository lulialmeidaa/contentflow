import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader, cx } from "@/components/ui";
import { getContents, getEvents, getPlan, getProfile, getToday } from "@/lib/data";
import {
  addDays,
  addMonths,
  daysInMonth,
  formatShort,
  monthName,
  range,
  startOfMonth,
  startOfWeek,
  weekday,
  type ISODate,
} from "@/lib/dates";
import type { Content } from "@/lib/domain";
import { eventsOn, freeSlots, type DayPlan } from "@/lib/planner";
import { MonthGrid, type MonthEntry } from "./month-grid";
import { WeekGrid, type GridItem } from "./week-grid";

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
        <MonthView start={start} today={today} info={dayInfo} />
      ) : (
        <WeekView days={range(start, 7).map(dayInfo)} today={today} />
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
        <span className="size-2.5 rounded-sm bg-rose-soft ring-1 ring-rose/40" /> Gravação
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-ink" /> Publicação
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-paper ring-1 ring-ink/30" /> Compromisso
      </span>
    </div>
  );
}

function MonthView({ start, today, info }: { start: ISODate; today: ISODate; info: (d: ISODate) => Info }) {
  const lead = (weekday(start) + 6) % 7; // semana começa na segunda
  const total = Math.ceil((lead + daysInMonth(start)) / 7) * 7;
  const dates = range(addDays(start, -lead), total);
  const month = start.slice(0, 7);

  const entries: MonthEntry[] = [];
  for (const date of dates) {
    const d = info(date);
    for (const c of d.publications) {
      entries.push({ kind: "publicacao", id: c.id, date, start: 0, end: 0, title: c.title, format: c.format });
    }
    for (const o of d.busy) {
      entries.push({
        kind: "compromisso",
        id: o.event.id,
        date,
        start: o.start,
        end: o.end,
        title: o.event.title,
        recurring: o.event.recurrence !== "nenhuma",
      });
    }
    for (const it of d.planned?.items ?? []) {
      entries.push({
        kind: "gravacao",
        id: it.content.id,
        date,
        start: it.start,
        end: it.end,
        title: it.content.title,
        format: it.content.format,
        pinned: it.fixedTime,
      });
    }
  }

  return (
    <MonthGrid
      key={start}
      cells={dates.map((date) => ({ date, inMonth: date.startsWith(month) }))}
      entries={entries}
      today={today}
    />
  );
}

function WeekView({ days, today }: { days: Info[]; today: ISODate }) {
  const items: GridItem[] = [];
  for (const d of days) {
    for (const o of d.busy) {
      items.push({
        kind: "compromisso",
        id: o.event.id,
        date: d.date,
        start: o.start,
        end: o.end,
        title: o.event.title,
        recurring: o.event.recurrence !== "nenhuma",
      });
    }
    for (const it of d.planned?.items ?? []) {
      items.push({
        kind: "gravacao",
        id: it.content.id,
        date: d.date,
        start: it.start,
        end: it.end,
        title: it.content.title,
        format: it.content.format,
        pinned: it.fixedTime,
      });
    }
  }

  // Faixa de horas visível: cobre janelas, compromissos e gravações da semana.
  const starts = [8 * 60, ...items.map((i) => i.start), ...days.flatMap((d) => d.slots.map((s) => s.start))];
  const ends = [20 * 60, ...items.map((i) => i.end), ...days.flatMap((d) => d.slots.map((s) => s.end))];
  const startHour = Math.max(0, Math.floor(Math.min(...starts) / 60) - 1);
  const endHour = Math.min(24, Math.ceil(Math.max(...ends) / 60) + 1);

  return (
    <WeekGrid
      key={days[0].date}
      days={days.map((d) => ({
        date: d.date,
        slots: d.date >= today ? d.slots : [],
        publications: d.publications.map((c) => ({ id: c.id, title: c.title, format: c.format })),
      }))}
      items={items}
      today={today}
      startHour={startHour}
      endHour={endHour}
    />
  );
}
