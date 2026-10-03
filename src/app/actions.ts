"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/data";
import { formatClock, formatShort } from "@/lib/dates";
import { findConflict } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_MINUTES,
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
  if (typeof patch.estimated_minutes === "number") {
    clean.estimated_minutes = Math.min(600, Math.max(5, Math.round(patch.estimated_minutes)));
  }
  if (!Object.keys(clean).length) return;

  const { supabase } = await getSession();
  const { error } = await supabase.from("contents").update(clean).eq("id", id);
  if (error) return { error: "Não foi possível salvar." };
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
