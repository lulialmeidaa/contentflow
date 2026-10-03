import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarCheck2,
  Clapperboard,
  Clock,
  Flower2,
  Scissors,
  Send,
  Target,
} from "lucide-react";
import { ContentRow } from "@/components/content-row";
import { QuickAdd } from "@/components/quick-add";
import { Empty, SectionTitle, TextLink, cx } from "@/components/ui";
import { getContents, getPlan, getProfile, getToday } from "@/lib/data";
import {
  addDays,
  diffDays,
  formatClock,
  formatDuration,
  formatLong,
  formatRelative,
  hourIn,
  startOfWeek,
} from "@/lib/dates";
import { FORMAT_LABEL, POST_PRODUCTION } from "@/lib/domain";

export const metadata: Metadata = { title: "Hoje" };

function greeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function TodayPage() {
  const [profile, contents, plan, today] = await Promise.all([
    getProfile(),
    getContents(),
    getPlan(),
    getToday(),
  ]);
  const firstName = profile.name.split(" ")[0];

  if (!contents.length) {
    return (
      <div className="flex flex-col gap-8">
        <Greeting name={firstName} hour={hourIn(profile.timezone)} today={today} />
        <section className="card p-5 md:p-6">
          <SectionTitle icon={<Flower2 size={16} />}>Comece jogando suas ideias do mês aqui</SectionTitle>
          <p className="mb-4 text-sm text-muted">
            Uma ideia por linha. O ContentFlow organiza o resto e monta sua agenda de gravação.
          </p>
          <QuickAdd />
        </section>
      </div>
    );
  }

  const day = plan.days[0];
  const recordToday = day.items;
  const freeAfter = day.availableMinutes - day.usedMinutes;
  const nextSession = plan.days.slice(1).find((d) => d.items.length);

  const publishToday = contents.filter((c) => c.publication_date === today && c.status !== "publicado");
  const finishing = contents
    .filter((c) => POST_PRODUCTION.includes(c.status))
    .sort((a, b) => (a.publication_date ?? "9999") < (b.publication_date ?? "9999") ? -1 : 1)
    .slice(0, 5);

  const nextPublication = contents
    .filter((c) => c.publication_date && c.publication_date >= today && c.status !== "publicado")
    .sort((a, b) => (a.publication_date! < b.publication_date! ? -1 : 1))[0];

  const weekEnd = addDays(startOfWeek(today), 6);
  const toRecordThisWeek = plan.days
    .filter((d) => d.date <= weekEnd)
    .reduce((n, d) => n + d.items.length, 0);

  const notReady = contents.filter(
    (c) =>
      c.publication_date &&
      diffDays(c.publication_date, today) >= 0 &&
      diffDays(c.publication_date, today) <= 1 &&
      !["finalizado", "publicado"].includes(c.status),
  );
  const overduePublication = contents.filter(
    (c) => c.publication_date && c.publication_date < today && c.status !== "publicado",
  );

  const warnings: { key: string; text: string; href?: string }[] = [];
  if (toRecordThisWeek > 0) {
    warnings.push({
      key: "week",
      text: `${toRecordThisWeek} ${toRecordThisWeek === 1 ? "conteúdo ainda precisa" : "conteúdos ainda precisam"} ser ${toRecordThisWeek === 1 ? "gravado" : "gravados"} esta semana.`,
      href: "/calendario?view=semana",
    });
  }
  for (const c of notReady) {
    warnings.push({
      key: `nr-${c.id}`,
      text: `"${c.title}" sai ${formatRelative(c.publication_date!, today).toLowerCase()} e ainda não está finalizado.`,
      href: `/conteudos/${c.id}`,
    });
  }
  for (const c of overduePublication) {
    warnings.push({
      key: `op-${c.id}`,
      text: `"${c.title}" estava previsto para ${formatRelative(c.publication_date!, today).toLowerCase()}. Já publicou?`,
      href: `/conteudos/${c.id}`,
    });
  }
  for (const a of plan.alerts) {
    warnings.push({ key: `a-${a.kind}-${a.content.id}`, text: `"${a.content.title}": ${a.message}`, href: `/conteudos/${a.content.id}` });
  }

  return (
    <div className="flex flex-col gap-8">
      <Greeting name={firstName} hour={hourIn(profile.timezone)} today={today} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat
          icon={<Target size={16} />}
          label="Sua meta de hoje"
          value={
            recordToday.length
              ? `Gravar ${recordToday.length} ${recordToday.length === 1 ? "conteúdo" : "conteúdos"}`
              : finishing.length
                ? "Finalizar conteúdos"
                : "Dia livre"
          }
          highlight
          className="col-span-2 lg:col-span-1"
        />
        <Stat
          icon={<Clock size={16} />}
          label="Tempo disponível"
          value={day.availableMinutes ? formatDuration(day.availableMinutes) : "—"}
          hint={recordToday.length && freeAfter > 0 ? `${formatDuration(freeAfter)} livre após gravar` : undefined}
        />
        <Stat
          icon={<Send size={16} />}
          label="Próxima publicação"
          value={nextPublication ? formatRelative(nextPublication.publication_date!, today) : "—"}
          hint={nextPublication ? FORMAT_LABEL[nextPublication.format] : undefined}
        />
      </div>

      {warnings.length > 0 && (
        <section className="rounded-[var(--radius-card)] bg-alert-soft/70 p-4">
          <SectionTitle icon={<AlertTriangle size={16} className="text-alert" />}>Atenção</SectionTitle>
          <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
            {warnings.slice(0, 5).map((w) => (
              <li key={w.key}>
                {w.href ? (
                  <Link href={w.href} className="hover:underline">
                    {w.text}
                  </Link>
                ) : (
                  w.text
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle icon={<Clapperboard size={16} />}>
          {recordToday.length >= 3 ? "Gravação em lote hoje" : "Gravar hoje"}
        </SectionTitle>
        {recordToday.length ? (
          <div className="card divide-y divide-line">
            {recordToday.map((it) => (
              <ContentRow
                key={it.content.id}
                content={it.content}
                today={today}
                lead={`${formatClock(it.start)}–${formatClock(it.end)}`}
              />
            ))}
            <p className="px-4 py-3 text-xs text-muted">
              Total estimado {formatDuration(day.usedMinutes)}
              {freeAfter > 0 && ` · reserva de ${formatDuration(freeAfter)}`}
            </p>
          </div>
        ) : (
          <Empty
            action={
              nextSession && (
                <TextLink href="/calendario?view=semana">
                  Próxima gravação: {formatRelative(nextSession.date, today).toLowerCase()} —{" "}
                  {nextSession.items.length} {nextSession.items.length === 1 ? "conteúdo" : "conteúdos"}
                </TextLink>
              )
            }
          >
            Nenhuma gravação planejada para hoje.
          </Empty>
        )}
      </section>

      {publishToday.length > 0 && (
        <section>
          <SectionTitle icon={<Send size={16} />}>Publicar hoje</SectionTitle>
          <div className="card divide-y divide-line">
            {publishToday.map((c) => (
              <ContentRow key={c.id} content={c} today={today} />
            ))}
          </div>
        </section>
      )}

      {finishing.length > 0 && (
        <section>
          <SectionTitle icon={<Scissors size={16} />}>Edição e legenda</SectionTitle>
          <div className="card divide-y divide-line">
            {finishing.map((c) => (
              <ContentRow key={c.id} content={c} today={today} />
            ))}
          </div>
        </section>
      )}

      {day.busy.length > 0 && (
        <section>
          <SectionTitle icon={<CalendarCheck2 size={16} />}>Seus compromissos</SectionTitle>
          <ul className="card divide-y divide-line">
            {day.busy.map((o) => (
              <li key={o.event.id} className="flex gap-3 px-4 py-3 text-sm">
                <span className="w-14 shrink-0 text-xs font-medium text-muted tabular-nums">
                  {formatClock(o.start)}
                </span>
                {o.event.title}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Greeting({ name, hour, today }: { name: string; hour: number; today: string }) {
  return (
    <header>
      <h1 className="font-display text-[30px] leading-tight font-medium tracking-tight md:text-[38px]">
        {greeting(hour)}
        {name && `, ${name}`}! <span className="text-rose">🌷</span>
      </h1>
      <p className="mt-1 text-sm text-muted">Hoje — {formatLong(today)}</p>
    </header>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  highlight,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("card p-4", highlight && "border-transparent bg-ink text-paper", className)}>
      <p className={cx("mb-2 flex items-center gap-1.5 text-xs", highlight ? "text-rose-soft" : "text-muted")}>
        <span className={highlight ? "text-rose-soft" : "text-rose"}>{icon}</span>
        {label}
      </p>
      <p className="font-display text-xl font-medium">{value}</p>
      {hint && <p className={cx("mt-0.5 text-xs", highlight ? "text-paper/60" : "text-muted")}>{hint}</p>}
    </div>
  );
}
