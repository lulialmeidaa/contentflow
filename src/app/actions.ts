"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/data";
import { formatClock, formatShort, fromMinutes, toMinutes } from "@/lib/dates";
import { eventsOn, findConflict, nextFreeStart } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_MINUTES,
  NEEDS_RECORDING,
  FORMATS,
  PRIORITIES,
  RECURRENCES,
  STATUSES,
  type Content,
  type Format,
  type PersonalEvent,
  type Recurrence,
  type RecordingWindows,
  type Status,
} from "@/lib/domain";

function refreshAll() {
  revalidatePath("/", "layout");
}

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v: unknown): v is string => typeof v === "string" && /^\d{2}:\d{2}$/.test(v);

// --- Autenticação ------------------------------------------------------------

export type AuthState = { error?: string; info?: string } | undefined;

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { error: "E-mail ou senha incorretos." };
  redirect("/");
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const { data, error } = await supabase.auth.signUp({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
    options: {
      data: { name: String(form.get("name") ?? "").trim() },
      emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
    },
  });
  if (error) return { error: error.message };
  if (!data.session) return { info: "Enviamos um link de confirmação para o seu e-mail." };
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// --- Conteúdos ---------------------------------------------------------------

export type NewContent = {
  title: string;
  format: Format;
  publication_date: string | null;
  notes?: string;
};

export async function createContents(items: NewContent[], status: "ideia" | "planejado") {
  const { supabase } = await getSession();
  const rows = items
    .filter((i) => i.title.trim() && FORMATS.includes(i.format))
    .map((i) => ({
      title: i.title.trim().slice(0, 200),
      format: i.format,
      status,
      publication_date: isDate(i.publication_date) ? i.publication_date : null,
      notes: (i.notes ?? "").slice(0, 2000),
      estimated_minutes: DEFAULT_MINUTES[i.format],
    }));
  if (!rows.length) return { count: 0 };
  const { error } = await supabase.from("contents").insert(rows);
  if (error) return { error: "Não foi possível salvar. Tente novamente." };
  refreshAll();
  return { count: rows.length };
}

export async function setStatus(id: string, status: Status) {
  if (!STATUSES.includes(status)) return;
  const { supabase } = await getSession();
  const patch: Partial<Content> = { status };
  // Ao publicar, registra quando; ao voltar, limpa.
  patch.published_at = status === "publicado" ? new Date().toISOString() : null;
  await supabase.from("contents").update(patch).eq("id", id);
  refreshAll();
}

type ContentPatch = Partial<
  Pick<
    Content,
    | "title"
    | "format"
    | "priority"
    | "script"
    | "caption"
    | "notes"
    | "category"
    | "publication_date"
    | "recording_date"
    | "recording_time"
    | "estimated_minutes"
  >
>;

export async function updateContent(id: string, patch: ContentPatch) {
  const clean: ContentPatch = {};
  if (typeof patch.title === "string" && patch.title.trim()) clean.title = patch.title.trim().slice(0, 200);
  if (patch.format && FORMATS.includes(patch.format)) clean.format = patch.format;
  if (patch.priority === null || (patch.priority && PRIORITIES.includes(patch.priority))) {
    clean.priority = patch.priority;
  }
  for (const k of ["script", "caption", "notes"] as const) {
    if (typeof patch[k] === "string") clean[k] = patch[k];
  }
  if ("category" in patch) clean.category = patch.category?.trim() || null;
  for (const k of ["publication_date", "recording_date"] as const) {
    if (k in patch) clean[k] = isDate(patch[k]) ? patch[k] : null;
  }
  // Trocar o dia de gravação por aqui devolve o horário ao planejador.
  if ("recording_date" in patch) clean.recording_time = null;
  if (typeof patch.estimated_minutes === "number") {
    clean.estimated_minutes = Math.min(600, Math.max(5, Math.round(patch.estimated_minutes)));
  }
  if (!Object.keys(clean).length) return;

  const { supabase } = await getSession();
  const { error } = await supabase.from("contents").update(clean).eq("id", id);
  if (error) return { error: "Não foi possível salvar." };
  refreshAll();
}

export type MoveResult = { error?: string; adjusted?: { start: number; after: string } } | undefined;

const isMinute = (m: number) => Number.isInteger(m) && m >= 0 && m < 24 * 60;

/**
 * Fixa dia e horário de uma gravação (arrastar no calendário). Se o horário
 * escolhido estiver ocupado, vai para o próximo horário livre do mesmo dia.
 */
export async function moveRecording(id: string, date: string, start: number): Promise<MoveResult> {
  if (!isDate(date) || !isMinute(start)) return { error: "Horário inválido." };
  const { supabase } = await getSession();
  const [{ data: content }, { data: events }, { data: sameDay }] = await Promise.all([
    supabase.from("contents").select("estimated_minutes").eq("id", id).single(),
    supabase.from("personal_events").select("*"),
    supabase
      .from("contents")
      .select("id, title, recording_time, estimated_minutes")
      .eq("recording_date", date)
      .not("recording_time", "is", null)
      .in("status", NEEDS_RECORDING)
      .neq("id", id),
  ]);
  if (!content) return { error: "Conteúdo não encontrado." };

  // Ocupado = compromissos do dia + outras gravações com horário fixado.
  const busy = [
    ...eventsOn((events ?? []) as PersonalEvent[], date).map((o) => ({ ...o, title: o.event.title })),
    ...(sameDay ?? []).map((c) => {
      const s = toMinutes(c.recording_time!);
      return { start: s, end: s + c.estimated_minutes, title: c.title };
    }),
  ];
  const duration = content.estimated_minutes;
  const free = nextFreeStart(start, duration, busy);
  if (free + duration > 24 * 60) {
    return { error: "Não há horário livre depois disso nesse dia. Tente outro dia." };
  }

  const { error } = await supabase
    .from("contents")
    .update({ recording_date: date, recording_time: fromMinutes(free) })
    .eq("id", id);
  if (error) return { error: "Não foi possível mover a gravação." };
  refreshAll();

  if (free !== start) {
    // O último bloco que empurrou a gravação, para explicar o ajuste.
    const blocker = busy.filter((b) => b.end <= free).sort((x, y) => y.end - x.end)[0];
    return { adjusted: { start: free, after: blocker?.title ?? "" } };
  }
}

/** Move um compromisso para outro dia/horário, mantendo a duração. */
export async function moveEvent(id: string, fromDate: string, toDate: string, start: number): Promise<MoveResult> {
  if (!isDate(fromDate) || !isDate(toDate) || !isMinute(start)) return { error: "Horário inválido." };
  const { supabase } = await getSession();
  const { data: all } = await supabase.from("personal_events").select("*");
  const events = (all ?? []) as PersonalEvent[];
  const event = events.find((e) => e.id === id);
  if (!event) return { error: "Compromisso não encontrado." };

  const duration = toMinutes(event.end_time) - toMinutes(event.start_time);
  if (start + duration > 24 * 60) return { error: "O compromisso passaria da meia-noite." };

  const recurring = event.recurrence !== "nenhuma";
  if (recurring && fromDate !== toDate) {
    return { error: "Compromisso que se repete: aqui dá para mudar só o horário. Para mudar os dias, edite na Agenda." };
  }

  const moved: PersonalEvent = {
    ...event,
    date: recurring ? event.date : toDate,
    start_time: fromMinutes(start),
    end_time: fromMinutes(start + duration),
  };
  const conflict = findConflict(moved, events);
  if (conflict) {
    const o = conflict.other;
    return {
      error: `Esse horário está ocupado por "${o.event.title}" (${formatClock(o.start)}–${formatClock(o.end)}) em ${formatShort(conflict.date)}.`,
    };
  }

  const { error } = await supabase
    .from("personal_events")
    .update({ date: moved.date, start_time: moved.start_time, end_time: moved.end_time })
    .eq("id", id);
  if (error) return { error: "Não foi possível mover o compromisso." };
  refreshAll();
}

export async function deleteContent(id: string) {
  const { supabase } = await getSession();
  await supabase.from("contents").delete().eq("id", id);
  refreshAll();
  redirect("/conteudos");
}

// --- Compromissos -----------------------------------------------------------

export type EventState = { error?: string; ok?: number } | undefined;

export async function saveEvent(_: EventState, form: FormData): Promise<EventState> {
  const id = String(form.get("id") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const date = form.get("date");
  const start = form.get("start_time");
  const end = form.get("end_time");
  const recurrence = String(form.get("recurrence") ?? "nenhuma");
  const until = form.get("recurrence_until");

  if (!title) return { error: "Dê um nome ao compromisso." };
  if (!isDate(date) || !isTime(start) || !isTime(end)) return { error: "Preencha data e horários." };
  if (end <= start) return { error: "O horário final precisa ser depois do inicial." };
  if (!RECURRENCES.includes(recurrence as (typeof RECURRENCES)[number])) return { error: "Recorrência inválida." };

  const weekdays =
    recurrence === "dias_semana"
      ? [...new Set(form.getAll("weekdays").map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort()
      : [];
  if (recurrence === "dias_semana" && !weekdays.length) return { error: "Escolha pelo menos um dia da semana." };

  const row = {
    title: title.slice(0, 200),
    date,
    start_time: start,
    end_time: end,
    recurrence,
    recurrence_until: recurrence !== "nenhuma" && isDate(until) ? until : null,
    weekdays,
    notes: String(form.get("notes") ?? ""),
  };

  const { supabase } = await getSession();
  const { data: existing } = await supabase.from("personal_events").select("*");
  const conflict = findConflict(
    { ...row, id: id || "novo", recurrence: row.recurrence as Recurrence },
    (existing ?? []) as PersonalEvent[],
  );
  if (conflict) {
    const o = conflict.other;
    return {
      error:
        `Esse horário está ocupado por "${o.event.title}" (${formatClock(o.start)}–${formatClock(o.end)}) ` +
        `em ${formatShort(conflict.date)}. Próximo horário livre: ${formatClock(conflict.nextFree)}.`,
    };
  }

  const { error } = id
    ? await supabase.from("personal_events").update(row).eq("id", id)
    : await supabase.from("personal_events").insert(row);
  if (error) return { error: "Não foi possível salvar o compromisso." };
  refreshAll();
  return { ok: Date.now() };
}

export async function deleteEvent(id: string) {
  const { supabase } = await getSession();
  await supabase.from("personal_events").delete().eq("id", id);
  refreshAll();
}

// --- Configurações -----------------------------------------------------------

export type SettingsState = { error?: string; ok?: number } | undefined;

export async function saveSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  const windows: RecordingWindows = {};
  for (let d = 0; d < 7; d++) {
    const on = form.get(`on_${d}`) === "on";
    const start = form.get(`start_${d}`);
    const end = form.get(`end_${d}`);
    if (!on) {
      windows[d] = null;
      continue;
    }
    if (!isTime(start) || !isTime(end) || end <= start) {
      return { error: "Confira os horários: o fim precisa ser depois do início." };
    }
    windows[d] = { start, end };
  }
  const timezone = String(form.get("timezone") ?? "America/Sao_Paulo");
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    return { error: "Fuso horário inválido." };
  }

  const { supabase, user } = await getSession();
  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: user.id,
      name: String(form.get("name") ?? "").trim().slice(0, 80),
      timezone,
      recording_windows: windows,
    });
  if (error) return { error: "Não foi possível salvar." };
  refreshAll();
  return { ok: Date.now() };
}
