import {
  addDays,
  dayOfMonth,
  diffDays,
  range,
  toMinutes,
  weekday,
  type ISODate,
} from "./dates";
import {
  NEEDS_RECORDING,
  type Content,
  type PersonalEvent,
  type Priority,
  type RecordingWindows,
} from "./domain";

// ---------------------------------------------------------------------------
// Prioridade

export function autoPriority(c: Pick<Content, "publication_date">, today: ISODate): Priority {
  if (!c.publication_date) return "baixa";
  const d = diffDays(c.publication_date, today);
  if (d <= 3) return "alta";
  if (d <= 7) return "media";
  return "baixa";
}

export function effectivePriority(c: Content, today: ISODate): Priority {
  return c.priority ?? autoPriority(c, today);
}

const PRIORITY_RANK: Record<Priority, number> = { alta: 0, media: 1, baixa: 2 };

/**
 * Último dia para gravar sem atrasar a publicação. Conteúdos que passam por
 * edição precisam de um dia de folga; stories podem ser gravados no dia.
 */
export function recordingDeadline(c: Content): ISODate | null {
  if (!c.publication_date) return null;
  return c.format === "stories" ? c.publication_date : addDays(c.publication_date, -1);
}

// ---------------------------------------------------------------------------
// Compromissos e janelas

export type Occurrence = { event: PersonalEvent; start: number; end: number };

export function occursOn(e: PersonalEvent, date: ISODate): boolean {
  if (date < e.date) return false;
  if (e.recurrence_until && date > e.recurrence_until) return false;
  switch (e.recurrence) {
    case "nenhuma":
      return date === e.date;
    case "diaria":
      return true;
    case "dias_uteis": {
      const w = weekday(date);
      return w >= 1 && w <= 5;
    }
    case "semanal":
      return weekday(date) === weekday(e.date);
    case "mensal":
      return dayOfMonth(date) === dayOfMonth(e.date);
    case "dias_semana":
      return (e.weekdays ?? []).includes(weekday(date));
  }
}

export function eventsOn(events: PersonalEvent[], date: ISODate): Occurrence[] {
  return events
    .filter((e) => occursOn(e, date))
    .map((event) => ({ event, start: toMinutes(event.start_time), end: toMinutes(event.end_time) }))
    .sort((a, b) => a.start - b.start);
}

export type Conflict = { date: ISODate; other: Occurrence; nextFree: number };

/**
 * Primeira sobreposição entre um compromisso (e suas repetições) e os demais.
 * Compromisso que termina às 10h e outro que começa às 10h não conflitam.
 */
export function findConflict(
  candidate: PersonalEvent,
  events: PersonalEvent[],
  days = 90,
): Conflict | null {
  const others = events.filter((e) => e.id !== candidate.id);
  const start = toMinutes(candidate.start_time);
  const end = toMinutes(candidate.end_time);
  for (const date of range(candidate.date, days)) {
    if (!occursOn(candidate, date)) continue;
    const busy = eventsOn(others, date);
    const other = busy.find((o) => o.start < end && o.end > start);
    if (other) return { date, other, nextFree: nextFreeStart(start, end - start, busy) };
  }
  return null;
}

export type Slot = { start: number; end: number };

const MIN_SLOT = 15;

/** Janela de gravação do dia menos os compromissos. */
export function freeSlots(windows: RecordingWindows, busy: Occurrence[], date: ISODate): Slot[] {
  const w = windows[String(weekday(date))];
  if (!w) return [];
  let slots: Slot[] = [{ start: toMinutes(w.start), end: toMinutes(w.end) }];
  for (const b of busy) {
    slots = slots.flatMap((s) => {
      if (b.end <= s.start || b.start >= s.end) return [s];
      const parts: Slot[] = [];
      if (b.start > s.start) parts.push({ start: s.start, end: b.start });
      if (b.end < s.end) parts.push({ start: b.end, end: s.end });
      return parts;
    });
  }
  return slots.filter((s) => s.end - s.start >= MIN_SLOT);
}

// ---------------------------------------------------------------------------
// Plano

export type PlannedItem = {
  content: Content;
  start: number;
  end: number;
  /** Gravação cai depois do prazo ideal para a publicação. */
  late: boolean;
  /** Data fixada manualmente pela usuária. */
  pinned: boolean;
  /** Horário também fixado (arrastado no calendário). */
  fixedTime: boolean;
};

export type DayPlan = {
  date: ISODate;
  busy: Occurrence[];
  slots: Slot[];
  availableMinutes: number;
  items: PlannedItem[];
  usedMinutes: number;
};

export type PlanAlert = {
  kind: "atrasado" | "sem-horario" | "excede-janela" | "conflito";
  content: Content;
  message: string;
};

export type Plan = {
  today: ISODate;
  days: DayPlan[];
  byContent: Map<string, { date: ISODate; item: PlannedItem }>;
  alerts: PlanAlert[];
};

export type PlanInput = {
  today: ISODate;
  contents: Content[];
  events: PersonalEvent[];
  windows: RecordingWindows;
  horizonDays?: number;
};

/** Sábado primeiro, depois dias de semana, domingo só se necessário. */
function dayTier(date: ISODate): number {
  const w = weekday(date);
  if (w === 6) return 0;
  if (w === 0) return 2;
  return 1;
}

function urgencyOrder(today: ISODate) {
  return (a: Content, b: Content) => {
    const da = recordingDeadline(a);
    const db = recordingDeadline(b);
    if (da !== db) {
      if (!da) return 1;
      if (!db) return -1;
      return da < db ? -1 : 1;
    }
    const pa = PRIORITY_RANK[effectivePriority(a, today)];
    const pb = PRIORITY_RANK[effectivePriority(b, today)];
    if (pa !== pb) return pa - pb;
    return a.created_at < b.created_at ? -1 : 1;
  };
}

type Draft = { content: Content; late: boolean; pinned: boolean };

/** Remove um intervalo das janelas livres. */
function subtract(slots: Slot[], cut: Slot): Slot[] {
  return slots.flatMap((s) => {
    if (cut.end <= s.start || cut.start >= s.end) return [s];
    const parts: Slot[] = [];
    if (cut.start > s.start) parts.push({ start: s.start, end: cut.start });
    if (cut.end < s.end) parts.push({ start: cut.end, end: s.end });
    return parts;
  });
}

const overlaps = (a: Slot, b: Slot) => a.start < b.end && a.end > b.start;

/**
 * Ordem de gravação dentro do dia: conteúdos fixados e urgentes primeiro,
 * depois agrupados por formato e categoria (mesmo cenário/preparação).
 */
function batchOrder(today: ISODate) {
  const urgency = urgencyOrder(today);
  return (a: Draft, b: Draft) => {
    if (a.content.format !== b.content.format) {
      return a.content.format < b.content.format ? -1 : 1;
    }
    const ca = a.content.category ?? "";
    const cb = b.content.category ?? "";
    if (ca !== cb) return ca < cb ? -1 : 1;
    return urgency(a.content, b.content);
  };
}

/**
 * Distribui os conteúdos nas janelas livres, na ordem dada.
 * Retorna null se algum não couber.
 */
function layout(drafts: Draft[], slots: Slot[]): PlannedItem[] | null {
  const free = slots.map((s) => ({ ...s }));
  const out: PlannedItem[] = [];
  for (const d of drafts) {
    const dur = d.content.estimated_minutes;
    const slot = free.find((s) => s.end - s.start >= dur);
    if (!slot) return null;
    out.push({ ...d, start: slot.start, end: slot.start + dur, fixedTime: false });
    slot.start += dur;
  }
  return out;
}

/**
 * Como `layout`, mas o que não couber na janela vai para logo depois dela,
 * sem nunca cair em cima de um compromisso.
 */
function forceLayout(drafts: Draft[], slots: Slot[], busy: Slot[]): PlannedItem[] {
  const free = slots.map((s) => ({ ...s }));
  const out: PlannedItem[] = [];
  let cursor = slots.length ? slots[slots.length - 1].end : 9 * 60;
  for (const d of drafts) {
    const dur = d.content.estimated_minutes;
    const slot = free.find((s) => s.end - s.start >= dur);
    if (slot) {
      out.push({ ...d, start: slot.start, end: slot.start + dur, fixedTime: false });
      slot.start += dur;
      continue;
    }
    cursor = nextFreeStart(cursor, dur, busy);
    out.push({ ...d, start: cursor, end: cursor + dur, fixedTime: false });
    cursor += dur;
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Primeiro horário a partir de `from` em que `dur` minutos não colidem com compromissos. */
export function nextFreeStart(from: number, dur: number, busy: Slot[]): number {
  let start = from;
  for (const b of [...busy].sort((x, y) => x.start - y.start)) {
    if (b.start < start + dur && b.end > start) start = b.end;
  }
  return start;
}

export function buildPlan({ today, contents, events, windows, horizonDays = 42 }: PlanInput): Plan {
  const dates = range(today, horizonDays);
  // slots = janela menos compromissos; free = slots menos gravações com horário fixo.
  type Day = { busy: Occurrence[]; slots: Slot[]; free: Slot[]; fixed: PlannedItem[]; drafts: Draft[] };
  const days = new Map<ISODate, Day>();
  for (const date of dates) {
    const busy = eventsOn(events, date);
    const slots = freeSlots(windows, busy, date);
    days.set(date, { busy, slots, free: slots, fixed: [], drafts: [] });
  }
  const order = batchOrder(today);
  const fits = (date: ISODate, extra: Draft) => {
    const d = days.get(date)!;
    return layout([...d.drafts, extra].sort(order), d.free) !== null;
  };

  const alerts: PlanAlert[] = [];
  const pending = contents.filter((c) => NEEDS_RECORDING.includes(c.status));

  // 1. Datas fixadas manualmente são respeitadas.
  const free: Content[] = [];
  for (const c of pending) {
    const day = c.recording_date ? days.get(c.recording_date) : undefined;
    if (!day) {
      free.push(c);
      continue;
    }
    const deadline = recordingDeadline(c);
    const draft: Draft = { content: c, pinned: true, late: !!deadline && c.recording_date! > deadline };
    if (!c.recording_time) {
      day.drafts.push(draft);
      continue;
    }
    // Data e horário fixados: o intervalo sai das janelas livres.
    const start = toMinutes(c.recording_time);
    const item: PlannedItem = { ...draft, start, end: start + c.estimated_minutes, fixedTime: true };
    const clash = day.busy.find((b) => overlaps(b, item)) ?? day.fixed.find((f) => overlaps(f, item));
    if (clash) {
      alerts.push({
        kind: "conflito",
        content: c,
        message: `A gravação fixada bate com "${"event" in clash ? clash.event.title : clash.content.title}".`,
      });
    }
    day.fixed.push(item);
    day.free = subtract(day.free, item);
  }

  // 2. Os demais, do mais urgente para o menos urgente.
  for (const c of free.sort(urgencyOrder(today))) {
    const deadline = recordingDeadline(c);
    const draft: Draft = { content: c, pinned: false, late: false };
    const lastOnTime = deadline ? (deadline < today ? null : deadline) : dates[dates.length - 1];

    const candidates = lastOnTime ? dates.filter((d) => d <= lastOnTime && fits(d, draft)) : [];

    let chosen: ISODate | undefined;
    if (candidates.length) {
      const score = (date: ISODate) => {
        const ds = days.get(date)!.drafts;
        return [
          dayTier(date),
          ds.some((x) => x.content.format === c.format) ? 0 : 1, // gravação em lote
          ds.length ? 0 : 1, // concentra gravações em menos dias
          diffDays(date, today),
        ];
      };
      chosen = candidates.reduce((best, d) => {
        const a = score(d);
        const b = score(best);
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i] ? d : best;
        return best;
      });
    } else {
      // Não cabe antes do prazo: primeiro dia possível, sinalizado como atraso.
      chosen = dates.find((d) => fits(d, draft));
      draft.late = !!deadline;
    }

    if (!chosen) {
      alerts.push({
        kind: "sem-horario",
        content: c,
        message: "Não há janela de gravação livre nas próximas semanas.",
      });
      continue;
    }
    days.get(chosen)!.drafts.push(draft);
  }

  // 3. Horários finais.
  const byContent: Plan["byContent"] = new Map();
  const result: DayPlan[] = dates.map((date) => {
    const d = days.get(date)!;
    const sorted = [...d.drafts].sort(order);
    let flexible = layout(sorted, d.free);
    if (!flexible) {
      flexible = forceLayout(sorted, d.free, [...d.busy, ...d.fixed]);
      for (const it of flexible.filter((i) => i.pinned)) {
        alerts.push({
          kind: "excede-janela",
          content: it.content,
          message: "A gravação fixada nesse dia passa do tempo disponível.",
        });
      }
    }
    const items = [...d.fixed, ...flexible].sort((a, b) => a.start - b.start);
    for (const item of items) {
      byContent.set(item.content.id, { date, item });
      if (item.late) {
        alerts.push({
          kind: "atrasado",
          content: item.content,
          message: "A gravação fica depois do prazo ideal para a publicação.",
        });
      }
    }
    const availableMinutes = d.slots.reduce((s, x) => s + x.end - x.start, 0);
    return {
      date,
      busy: d.busy,
      slots: d.slots,
      availableMinutes,
      items,
      usedMinutes: items.reduce((s, i) => s + i.end - i.start, 0),
    };
  });

  return { today, days: result, byContent, alerts };
}
