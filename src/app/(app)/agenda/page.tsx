import type { Metadata } from "next";
import Link from "next/link";
import { Repeat, Trash2 } from "lucide-react";
import { deleteEvent } from "@/app/actions";
import { Empty, PageHeader, SectionTitle, cx } from "@/components/ui";
import { getEvents, getToday } from "@/lib/data";
import { formatClock, formatRelative, formatShort, range, weekdayShort } from "@/lib/dates";
import { RECURRENCE_LABEL } from "@/lib/domain";
import { eventsOn } from "@/lib/planner";
import { EventForm } from "./event-form";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage(props: PageProps<"/agenda">) {
  const { editar } = await props.searchParams;
  const [events, today] = await Promise.all([getEvents(), getToday()]);
  const editing = events.find((e) => e.id === editar) ?? null;

  const days = range(today, 14)
    .map((date) => ({ date, items: eventsOn(events, date) }))
    .filter((d) => d.items.length);

  const recurring = events.filter((e) => e.recurrence !== "nenhuma");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Compromissos pessoais" title="Agenda" />

      <section className="card p-5">
        <SectionTitle>{editing ? "Editar compromisso" : "Novo compromisso"}</SectionTitle>
        <EventForm key={editing?.id ?? "new"} event={editing} today={today} />
      </section>

      <section>
        <SectionTitle>Próximos 14 dias</SectionTitle>
        {days.length ? (
          <div className="flex flex-col gap-3">
            {days.map(({ date, items }) => (
              <div key={date} className="card overflow-hidden">
                <p className={cx("px-4 pt-3 pb-1 text-xs font-semibold", date === today ? "text-rose-deep" : "text-muted")}>
                  {formatRelative(date, today)}
                  {date === today || formatRelative(date, today) === "Amanhã" ? ` — ${formatShort(date)}` : ""}
                </p>
                <ul className="divide-y divide-line">
                  {items.map((o) => (
                    <li key={o.event.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="w-24 shrink-0 text-xs text-muted tabular-nums">
                        {formatClock(o.start)}–{formatClock(o.end)}
                      </span>
                      <Link href={`/agenda?editar=${o.event.id}`} className="flex flex-1 items-center gap-1.5 hover:text-rose-deep">
                        {o.event.title}
                        {o.event.recurrence !== "nenhuma" && <Repeat size={12} className="text-muted" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Sem compromissos nas próximas duas semanas. Toda a sua janela de gravação está livre.</Empty>
        )}
      </section>

      {recurring.length > 0 && (
        <section>
          <SectionTitle icon={<Repeat size={15} />}>Compromissos que se repetem</SectionTitle>
          <ul className="card divide-y divide-line">
            {recurring.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <Link href={`/agenda?editar=${e.id}`} className="flex-1 hover:text-rose-deep">
                  {e.title}
                  <span className="ml-2 text-xs text-muted">
                    {e.recurrence === "dias_semana" ? weekdaysLabel(e.weekdays) : RECURRENCE_LABEL[e.recurrence]} · {e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}
                  </span>
                </Link>
                <form action={deleteEvent.bind(null, e.id)}>
                  <button aria-label={`Excluir ${e.title}`} className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-mist hover:text-alert">
                    <Trash2 size={15} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function weekdaysLabel(days: number[]) {
  // segunda primeiro, domingo por último
  return [...days]
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((d) => weekdayShort(d))
    .join(", ");
}
