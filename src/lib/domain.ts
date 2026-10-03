export const FORMATS = ["reels", "stories", "foto", "carrossel", "outro"] as const;
export type Format = (typeof FORMATS)[number];

export const STATUSES = [
  "ideia",
  "planejado",
  "roteiro",
  "gravar",
  "editar",
  "legenda",
  "finalizado",
  "publicado",
] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["alta", "media", "baixa"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const RECURRENCES = ["nenhuma", "diaria", "dias_uteis", "semanal", "mensal", "dias_semana"] as const;
export type Recurrence = (typeof RECURRENCES)[number];

export const FORMAT_LABEL: Record<Format, string> = {
  reels: "Reels",
  stories: "Stories",
  foto: "Foto",
  carrossel: "Carrossel",
  outro: "Outro",
};

export const STATUS_LABEL: Record<Status, string> = {
  ideia: "Ideia",
  planejado: "Planejado",
  roteiro: "Roteiro",
  gravar: "Gravar",
  editar: "Editar",
  legenda: "Legenda",
  finalizado: "Finalizado",
  publicado: "Publicado",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  nenhuma: "Não repete",
  diaria: "Todos os dias",
  dias_uteis: "Dias úteis",
  semanal: "Toda semana",
  mensal: "Todo mês",
  dias_semana: "Dias da semana",
};

/** Tempo padrão de gravação por formato, em minutos (PRD §17). */
export const DEFAULT_MINUTES: Record<Format, number> = {
  reels: 45,
  stories: 15,
  foto: 20,
  carrossel: 30,
  outro: 30,
};

export const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

/** Status em que o conteúdo ainda precisa ser gravado. */
export const NEEDS_RECORDING: readonly Status[] = ["planejado", "roteiro", "gravar"];

/** Status de pós-produção (já gravado, ainda não pronto). */
export const POST_PRODUCTION: readonly Status[] = ["editar", "legenda"];

export function nextStatus(s: Status): Status | null {
  const i = STATUSES.indexOf(s);
  return i < STATUSES.length - 1 ? STATUSES[i + 1] : null;
}

export function prevStatus(s: Status): Status | null {
  const i = STATUSES.indexOf(s);
  return i > 0 ? STATUSES[i - 1] : null;
}

export type Content = {
  id: string;
  title: string;
  format: Format;
  status: Status;
  priority: Priority | null;
  script: string;
  caption: string;
  notes: string;
  category: string | null;
  publication_date: string | null;
  recording_date: string | null;
  estimated_minutes: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type PersonalEvent = {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  recurrence: Recurrence;
  recurrence_until: string | null;
  /** Dias escolhidos (0 = domingo … 6 = sábado) quando recurrence = "dias_semana". */
  weekdays: number[];
  notes: string;
};

export type Window = { start: string; end: string };
/** Chave = dia da semana (0 = domingo … 6 = sábado). */
export type RecordingWindows = Partial<Record<string, Window | null>>;

export type Profile = {
  id: string;
  name: string;
  timezone: string;
  recording_windows: RecordingWindows;
};
