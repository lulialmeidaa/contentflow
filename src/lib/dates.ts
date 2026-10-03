// Datas são tratadas como strings locais "YYYY-MM-DD" e horários como
// minutos desde a meia-noite. Isso evita surpresas de fuso no servidor.

export type ISODate = string;

export function todayIn(timezone: string, now = new Date()): ISODate {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function hourIn(timezone: string, now = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(now),
  );
}

function toUTC(d: ISODate): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function fromUTC(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: ISODate, n: number): ISODate {
  const x = toUTC(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fromUTC(x);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(a).getTime() - toUTC(b).getTime()) / 86_400_000);
}

/** 0 = domingo … 6 = sábado */
export function weekday(d: ISODate): number {
  return toUTC(d).getUTCDay();
}

export function dayOfMonth(d: ISODate): number {
  return toUTC(d).getUTCDate();
}

/** Segunda-feira da semana de `d`. */
export function startOfWeek(d: ISODate): ISODate {
  return addDays(d, -((weekday(d) + 6) % 7));
}

export function startOfMonth(d: ISODate): ISODate {
  return d.slice(0, 8) + "01";
}

export function daysInMonth(d: ISODate): number {
  const [y, m] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addMonths(d: ISODate, n: number): ISODate {
  const [y, m] = d.split("-").map(Number);
  const x = new Date(Date.UTC(y, m - 1 + n, 1));
  return fromUTC(x);
}

export function range(from: ISODate, days: number): ISODate[] {
  return Array.from({ length: days }, (_, i) => addDays(from, i));
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "10h", "10h30" */
export function formatClock(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** "45 min", "1h", "2h30" */
export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function weekdayName(d: ISODate): string {
  return WEEKDAYS[weekday(d)];
}

export function weekdayShort(i: number): string {
  return WEEKDAYS_SHORT[i];
}

export function monthName(d: ISODate): string {
  return MONTHS[Number(d.slice(5, 7)) - 1];
}

/** "01 de outubro" */
export function formatLong(d: ISODate): string {
  return `${d.slice(8, 10)} de ${monthName(d)}`;
}

/** "05/10" */
export function formatShort(d: ISODate): string {
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
}

/** "Hoje", "Amanhã", "sábado — 04/10" */
export function formatRelative(d: ISODate, today: ISODate): string {
  const diff = diffDays(d, today);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  if (diff === -1) return "Ontem";
  return `${weekdayName(d)} — ${formatShort(d)}`;
}
