"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { saveSettings } from "@/app/actions";
import { cx } from "@/components/ui";
import { weekdayShort } from "@/lib/dates";
import type { Profile } from "@/lib/domain";

const TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Cuiaba",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Rio_Branco",
  "America/Noronha",
  "Europe/Lisbon",
];

// Ordem de exibição: segunda → domingo
const DAYS = [1, 2, 3, 4, 5, 6, 0];
const FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  const [enabled, setEnabled] = useState(() =>
    Object.fromEntries(DAYS.map((d) => [d, !!profile.recording_windows[d]])),
  );
  const zones = TIMEZONES.includes(profile.timezone) ? TIMEZONES : [profile.timezone, ...TIMEZONES];

  return (
    <form action={action} className="flex flex-col gap-6">
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <label>
          <span className="label">Seu nome</span>
          <input name="name" defaultValue={profile.name} className="field" placeholder="Como quer ser chamada?" />
        </label>
        <label>
          <span className="label">Fuso horário</span>
          <select name="timezone" defaultValue={profile.timezone} className="field">
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace("America/", "").replace("Europe/", "").replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-sm font-semibold">Janelas de gravação</h2>
        <p className="mb-4 text-sm text-muted">
          Quando você pode gravar em cada dia. O planejador desconta seus compromissos, prioriza o sábado e só usa o
          domingo se for preciso.
        </p>
        <ul className="flex flex-col divide-y divide-line">
          {DAYS.map((d) => {
            const w = profile.recording_windows[d];
            const on = enabled[d];
            return (
              <li key={d} className="flex items-center gap-3 py-2.5">
                <label className="flex w-28 items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    name={`on_${d}`}
                    checked={on}
                    onChange={(e) => setEnabled((s) => ({ ...s, [d]: e.target.checked }))}
                    className="size-4 accent-rose"
                  />
                  <span className={cx(d === 6 && "font-medium text-rose-deep")}>
                    <span className="sm:hidden capitalize">{weekdayShort(d)}</span>
                    <span className="hidden sm:inline">{FULL[d]}</span>
                  </span>
                </label>
                {on ? (
                  <span className="flex items-center gap-2 text-sm text-muted">
                    <input type="time" name={`start_${d}`} defaultValue={w?.start ?? "09:00"} className="field w-auto py-1.5" />
                    até
                    <input type="time" name={`end_${d}`} defaultValue={w?.end ?? "12:00"} className="field w-auto py-1.5" />
                  </span>
                ) : (
                  <span className="text-sm text-muted/70">Sem gravação</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex items-center gap-3">
        <button disabled={pending} className="btn-primary">
          {pending ? "Salvando..." : "Salvar preferências"}
        </button>
        {state?.ok && !pending && (
          <span className="flex items-center gap-1 text-sm text-ok">
            <Check size={15} /> Salvo
          </span>
        )}
        {state?.error && <span className="text-sm text-alert">{state.error}</span>}
      </div>
    </form>
  );
}
