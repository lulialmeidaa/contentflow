"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { QuickAdd } from "./quick-add";

const Ctx = createContext<() => void>(() => {});

export const useQuickAdd = () => useContext(Ctx);

/** Diálogo global de cadastro rápido, aberto pelo "+" da navegação. */
export function QuickAddProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  // Remonta o formulário a cada abertura para começar limpo.
  const [key, setKey] = useState(0);

  const open = () => {
    setKey((k) => k + 1);
    ref.current?.showModal();
  };

  return (
    <Ctx.Provider value={open}>
      {children}
      <dialog
        ref={ref}
        onClick={(e) => e.target === ref.current && ref.current.close()}
        className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-paper p-0 text-ink backdrop:bg-transparent md:m-auto md:max-w-xl md:rounded-3xl"
      >
        <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-medium">Novas ideias</h2>
            <button onClick={() => ref.current?.close()} aria-label="Fechar" className="btn-ghost size-9 p-0">
              <X size={18} />
            </button>
          </div>
          <QuickAdd key={key} autoFocus onDone={() => setTimeout(() => ref.current?.close(), 700)} />
        </div>
      </dialog>
    </Ctx.Provider>
  );
}
