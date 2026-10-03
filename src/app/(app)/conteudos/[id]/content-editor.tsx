"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Check, Pin, Trash2, X } from "lucide-react";
import { deleteContent, updateContent } from "@/app/actions";
import { StatusStepper } from "@/components/status-stepper";
import { cx } from "@/components/ui";
import { formatClock, formatDuration, formatRelative } from "@/lib/dates";
import {
  DURATION_PRESETS,
  FORMAT_LABEL,
  FORMATS,
  PRIORITY_LABEL,
  PRIORITIES,
  type Content,
  type Priority,
} from "@/lib/domain";

type Patch = Parameters<typeof updateContent>[1];

export function ContentEditor({
  content,
  suggestedRecording,
  autoPriority,
  today,
}: {
  content: Content;
  suggestedRecording: { date: string; start: number; end: number } | null;
  autoPriority: Priority;
  today: string;
}) {
  const [c, setC] = useState(content);
  const [saving, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function save(patch: Patch) {
    setC((prev) => ({ ...prev, ...patch }));
    setSaved(false);
    start(async () => {
      await updateContent(c.id, patch);
      setSaved(true);
    });
  }

  /** Salva texto ao sair do campo, só se mudou. */
  const onBlurSave = (key: "title" | "script" | "caption" | "notes" | "category") => (value: string) => {
    if (value !== (content[key] ?? "")) save({ [key]: value });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span className="eyebrow">{FORMAT_LABEL[c.format]}</span>
          <span className="flex items-center gap-1">
            {saving ? "Salvando..." : saved ? <><Check size={13} className="text-ok" /> Salvo</> : null}
          </span>
        </div>
        <input
          defaultValue={c.title}
          onBlur={(e) => onBlurSave("title")(e.target.value)}
          aria-label="Título"
          className="w-full bg-transparent font-display text-[28px] leading-tight font-medium tracking-tight focus:outline-none md:text-[32px]"
        />
      </div>

      <Block label="Status">
        <StatusStepper id={c.id} status={content.status} />
      </Block>

      <div className="card grid gap-5 p-5 sm:grid-cols-2">
        <Field label="Formato" className="sm:col-span-2">
          <Chips
            options={FORMATS.map((f) => [f, FORMAT_LABEL[f]])}
            value={c.format}
            onChange={(format) => save({ format })}
          />
        </Field>

        <Field label="Data de publicação">
          <DateInput value={c.publication_date} onChange={(publication_date) => save({ publication_date })} />
        </Field>

        <Field label="Data de gravação">
          {c.recording_date ? (
            <div className="flex items-center gap-2">
              <DateInput value={c.recording_date} onChange={(recording_date) => save({ recording_date })} />
              <button
                onClick={() => save({ recording_date: null })}
                title="Deixar o planejador decidir"
                className="btn-ghost size-9 shrink-0 p-0 text-muted"
              >
                <X size={16} />
              </button>
            </div>
          ) : suggestedRecording ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-rose-wash px-3.5 py-2.5 text-sm">
              <span>
                <span className="text-rose-deep">Sugerido:</span>{" "}
                {formatRelative(suggestedRecording.date, today).toLowerCase()},{" "}
                {formatClock(suggestedRecording.start)}–{formatClock(suggestedRecording.end)}
              </span>
              <button
                onClick={() => save({ recording_date: suggestedRecording.date })}
                title="Fixar esta data"
                className="flex items-center gap-1 text-xs font-medium text-rose-deep hover:underline"
              >
                <Pin size={13} /> Fixar
              </button>
            </div>
          ) : (
            <DateInput value={null} onChange={(recording_date) => save({ recording_date })} />
          )}
        </Field>

        <Field label="Tempo estimado de gravação" className="sm:col-span-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Chips
              options={DURATION_PRESETS.map((m) => [m, formatDuration(m)])}
              value={c.estimated_minutes}
              onChange={(estimated_minutes) => save({ estimated_minutes })}
            />
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <input
                type="number"
                min={5}
                max={600}
                step={5}
                defaultValue={DURATION_PRESETS.includes(c.estimated_minutes) ? "" : c.estimated_minutes}
                placeholder="outro"
                onBlur={(e) => {
                  const v = Number(e.target.value);
                  if (v && v !== c.estimated_minutes) save({ estimated_minutes: v });
                }}
                className="w-20 rounded-full border border-line px-3 py-1 text-xs focus:border-rose focus:outline-none"
              />
              min
            </label>
          </div>
        </Field>

        <Field label="Prioridade">
          <Chips
            options={[
              ["auto", `Auto (${PRIORITY_LABEL[autoPriority]})`],
              ...PRIORITIES.map((p) => [p, PRIORITY_LABEL[p]] as [string, string]),
            ]}
            value={c.priority ?? "auto"}
            onChange={(v) => save({ priority: v === "auto" ? null : (v as Priority) })}
          />
        </Field>

        <Field label="Tema / pilar">
          <input
            defaultValue={c.category ?? ""}
            onBlur={(e) => onBlurSave("category")(e.target.value)}
            placeholder="ex.: skincare, rotina"
            className="field"
          />
        </Field>
      </div>

      <Block label="Roteiro">
        <TextArea value={c.script} onSave={onBlurSave("script")} placeholder="Ganchos, falas, cenas, takes..." rows={8} />
      </Block>

      <Block label="Legenda" aside={`${c.caption.length}/2200`}>
        <TextArea
          value={c.caption}
          onSave={onBlurSave("caption")}
          onChange={(caption) => setC((p) => ({ ...p, caption }))}
          placeholder="Texto da legenda, hashtags, CTA..."
          rows={6}
        />
      </Block>

      <Block label="Observações">
        <TextArea value={c.notes} onSave={onBlurSave("notes")} placeholder="Cenário, produtos, roupa, referências..." rows={3} />
      </Block>

      <div className="flex justify-end border-t border-line pt-5">
        {confirmDelete ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">Excluir este conteúdo?</span>
            <button onClick={() => setConfirmDelete(false)} className="btn-ghost">
              Cancelar
            </button>
            <button onClick={() => deleteContent(c.id)} className="btn bg-alert text-paper">
              Excluir
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="btn-ghost text-muted">
            <Trash2 size={15} /> Excluir
          </button>
        )}
      </div>
    </div>
  );
}

function Block({ label, aside, children }: { label: string; aside?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="label mb-0">{label}</span>
        {aside && <span className="text-xs text-muted tabular-nums">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <span className="label">{label}</span>
      {children}
    </div>
  );
}

function Chips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, label]) => (
        <button
          key={String(v)}
          onClick={() => v !== value && onChange(v)}
          className={cx(
            "chip border py-1.5 transition",
            v === value ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-soft hover:border-ink/30",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function DateInput({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <input
      type="date"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="field"
    />
  );
}

function TextArea({
  value,
  onSave,
  onChange,
  placeholder,
  rows,
}: {
  value: string;
  onSave: (v: string) => void;
  onChange?: (v: string) => void;
  placeholder: string;
  rows: number;
}) {
  return (
    <textarea
      defaultValue={value}
      onBlur={(e) => onSave(e.target.value)}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="field leading-relaxed"
    />
  );
}
