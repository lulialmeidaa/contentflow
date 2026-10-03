"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Sparkles } from "lucide-react";
import { createContents } from "@/app/actions";
import { formatShort, todayIn } from "@/lib/dates";
import { FORMAT_LABEL, FORMATS, type Format } from "@/lib/domain";
import { parseIdeas } from "@/lib/parse-ideas";
import { cx } from "./ui";

type Props = {
  /** Destino padrão: planejamento (gera agenda) ou banco de ideias. */
  defaultStatus?: "planejado" | "ideia";
  autoFocus?: boolean;
  onDone?: (count: number) => void;
};

export function QuickAdd({ defaultStatus = "planejado", autoFocus, onDone }: Props) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState(defaultStatus);
  // Formato escolhido manualmente para linhas não reconhecidas, por índice.
  const [overrides, setOverrides] = useState<Record<number, Format>>({});
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const today = useMemo(() => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const parsed = useMemo(() => parseIdeas(text, today), [text, today]);
  const items = parsed.map((p, i) => ({ ...p, format: overrides[i] ?? p.format }));
  const missing = items.filter((i) => !i.format).length;

  function submit() {
    if (!items.length || missing) return;
    start(async () => {
      const res = await createContents(
        items.map((i) => ({
          title: i.title,
          format: i.format!,
          publication_date: i.publication_date,
          notes: i.notes,
        })),
        status,
      );
      if ("error" in res) {
        setMessage(res.error ?? null);
        return;
      }
      setText("");
      setOverrides({});
      setMessage(`${res.count} ${res.count === 1 ? "conteúdo adicionado" : "conteúdos adicionados"}`);
      onDone?.(res.count);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => {
          setText(e.target.value);
          setOverrides({});
          setMessage(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        rows={Math.min(8, Math.max(3, text.split("\n").length + 1))}
        placeholder={"Digite ou cole suas ideias de conteúdo...\n\nReels — Minha rotina de skincare\nStories — Compras no mercado 05/10"}
        className="field resize-none leading-relaxed"
      />

      {items.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-paper">
          {items.map((item, i) => (
            <li key={i} className="flex flex-col gap-2 px-3.5 py-2.5 sm:flex-row sm:items-center">
              <span className="flex-1 text-sm">
                {item.title}
                {item.publication_date && (
                  <span className="ml-2 text-xs text-muted">publicar {formatShort(item.publication_date)}</span>
                )}
                {item.notes && <span className="mt-0.5 block text-xs text-muted">{item.notes}</span>}
              </span>
              <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={`Formato de ${item.title}`}>
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={item.format === f}
                    onClick={() => setOverrides((o) => ({ ...o, [i]: f }))}
                    className={cx(
                      "chip border transition",
                      item.format === f
                        ? "border-ink bg-ink text-paper"
                        : item.format
                          ? "border-line bg-paper text-muted hover:border-ink/30 hover:text-ink"
                          : "border-rose/40 bg-rose-wash text-rose-deep hover:border-rose",
                    )}
                  >
                    {FORMAT_LABEL[f]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full bg-mist p-1 text-xs font-medium">
          {(
            [
              ["planejado", "Planejar"],
              ["ideia", "Banco de ideias"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatus(value)}
              className={cx(
                "rounded-full px-3 py-1.5 transition",
                status === value ? "bg-paper text-ink shadow-sm" : "text-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {message && (
            <span className="flex items-center gap-1 text-xs text-ok">
              <Check size={14} /> {message}
            </span>
          )}
          {missing > 0 && <span className="text-xs text-rose-deep">Escolha o formato de {missing}</span>}
          <button onClick={submit} disabled={!items.length || missing > 0 || pending} className="btn-primary">
            <Sparkles size={15} />
            {pending ? "Salvando..." : items.length > 1 ? `Adicionar ${items.length}` : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
