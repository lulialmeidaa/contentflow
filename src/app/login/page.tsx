"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "@/app/actions";
import { cx } from "@/components/ui";

export default function LoginPage() {
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [inState, inAction, inPending] = useActionState(signIn, undefined);
  const [upState, upAction, upPending] = useActionState(signUp, undefined);

  const state = mode === "entrar" ? inState : upState;
  const pending = inPending || upPending;

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-4xl font-medium tracking-tight">
          ContentFlow<span className="text-rose">.</span>
        </h1>
        <p className="mb-8 text-sm text-muted">Suas ideias viram uma rotina de produção.</p>

        <div className="mb-5 flex rounded-full bg-paper p-1 text-sm font-medium ring-1 ring-line">
          {(
            [
              ["entrar", "Entrar"],
              ["criar", "Criar conta"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cx("flex-1 rounded-full py-2 transition", mode === m ? "bg-ink text-paper" : "text-muted")}
            >
              {label}
            </button>
          ))}
        </div>

        <form action={mode === "entrar" ? inAction : upAction} className="flex flex-col gap-4">
          {mode === "criar" && (
            <label>
              <span className="label">Nome</span>
              <input name="name" autoComplete="given-name" className="field" />
            </label>
          )}
          <label>
            <span className="label">E-mail</span>
            <input name="email" type="email" autoComplete="email" required className="field" />
          </label>
          <label>
            <span className="label">Senha</span>
            <input
              name="password"
              type="password"
              minLength={6}
              autoComplete={mode === "entrar" ? "current-password" : "new-password"}
              required
              className="field"
            />
          </label>
          <button disabled={pending} className="btn-primary mt-2 py-3">
            {pending ? "Aguarde..." : mode === "entrar" ? "Entrar" : "Criar conta"}
          </button>
          {state?.error && <p className="text-sm text-alert">{state.error}</p>}
          {state?.info && <p className="text-sm text-ok">{state.info}</p>}
        </form>
      </div>
    </main>
  );
}
