"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ContentRow } from "@/components/content-row";
import { Empty, cx } from "@/components/ui";
import { addDays, startOfWeek } from "@/lib/dates";
import {
  FORMAT_LABEL,
  FORMATS,
  PRIORITY_LABEL,
  PRIORITIES,
  STATUS_LABEL,
  STATUSES,
  type Content,
} from "@/lib/domain";
import { effectivePriority } from "@/lib/planner";

type Period = "todos" | "semana" | "mes" | "sem-data";
type Published = "todos" | "pendentes" | "publicados";

export function ContentList({
  contents,
  recording,
  today,
}: {
  contents: Content[];
  recording: Record<string, string>;
  today: string;
}) {
  const [q, setQ] = useState("");
  const [format, setFormat] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [period, setPeriod] = useState<Period>("todos");
  const [published, setPublished] = useState<Published>("pendentes");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 6);
    const month = today.slice(0, 7);
    return contents.filter((c) => {
      if (needle && !`${c.title} ${c.category ?? ""}`.toLowerCase().includes(needle)) return false;
      if (format && c.format !== format) return false;
      if (status && c.status !== status) return false;
      if (priority && effectivePriority(c, today) !== priority) return false;
      if (published === "pendentes" && c.status === "publicado") return false;
      if (published === "publicados" && c.status !== "publicado") return false;
      const d = c.publication_date;
      if (period === "semana" && !(d && d >= weekStart && d <= weekEnd)) return false;
      if (period === "mes" && !(d && d.startsWith(month))) return false;
      if (period === "sem-data" && d) return false;
      return true;
    });
  }, [contents, q, format, status, priority, period, published, today]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <label className="relative">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título"
            className="field pl-10"
          />
        </label>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
          <Segmented
            value={published}
            onChange={setPublished}
            options={[
              ["pendentes", "Em produção"],
              ["publicados", "Publicados"],
              ["todos", "Todos"],
            ]}
          />
          <Select value={format} onChange={setFormat} placeholder="Formato">
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABEL[f]}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={setStatus} placeholder="Status">
            {STATUSES.filter((s) => s !== "ideia").map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
          <Select value={priority} onChange={setPriority} placeholder="Prioridade">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </Select>
          <Select value={period === "todos" ? "" : period} onChange={(v) => setPeriod((v || "todos") as Period)} placeholder="Período">
            <option value="semana">Publica esta semana</option>
            <option value="mes">Publica este mês</option>
            <option value="sem-data">Sem data</option>
          </Select>
        </div>
      </div>

      {filtered.length ? (
        <div className="card divide-y divide-line">
          {filtered.map((c) => (
            <ContentRow key={c.id} content={c} today={today} recordingDate={recording[c.id]} />
          ))}
        </div>
      ) : (
        <Empty>{contents.length ? "Nada encontrado com esses filtros." : "Nenhum conteúdo ainda. Toque em + para adicionar."}</Empty>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium focus:outline-none",
        value ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-soft",
      )}
    >
      <option value="">{placeholder}</option>
      {children}
    </select>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex shrink-0 rounded-full bg-paper p-0.5 ring-1 ring-line">
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cx(
            "rounded-full px-3 py-1 text-xs font-medium transition",
            value === v ? "bg-rose-soft text-rose-deep" : "text-muted",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
