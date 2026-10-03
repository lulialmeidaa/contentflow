"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  Clock,
  Layers,
  Lightbulb,
  Plus,
  Settings,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { cx } from "./ui";
import { useQuickAdd } from "./quick-add-dialog";

type Item = { href: string; label: string; icon: LucideIcon };

const MAIN: Item[] = [
  { href: "/", label: "Hoje", icon: Sun },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/conteudos", label: "Conteúdos", icon: Layers },
  { href: "/ideias", label: "Ideias", icon: Lightbulb },
  { href: "/agenda", label: "Agenda", icon: Clock },
  { href: "/metricas", label: "Métricas", icon: BarChart3 },
];

const SETTINGS: Item = { href: "/configuracoes", label: "Configurações", icon: Settings };

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function Sidebar() {
  const path = usePathname();
  const openQuickAdd = useQuickAdd();
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-paper px-4 py-6 md:flex">
      <Link href="/" className="mb-8 flex items-baseline gap-1 px-3 font-display text-xl font-medium">
        ContentFlow<span className="text-rose">.</span>
      </Link>
      <button onClick={openQuickAdd} className="btn-primary mb-6 w-full">
        <Plus size={16} /> Adicionar ideias
      </button>
      <nav className="flex flex-1 flex-col gap-0.5">
        {MAIN.map((item) => (
          <SideLink key={item.href} item={item} active={isActive(path, item.href)} />
        ))}
      </nav>
      <SideLink item={SETTINGS} active={isActive(path, SETTINGS.href)} />
    </aside>
  );
}

function SideLink({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
        active ? "bg-rose-wash font-medium text-ink" : "text-muted hover:bg-mist hover:text-ink",
      )}
    >
      <Icon size={18} strokeWidth={1.75} className={active ? "text-rose" : undefined} />
      {item.label}
    </Link>
  );
}

/** Navegação inferior no celular: 4 destinos + botão central de adicionar. */
export function BottomNav() {
  const path = usePathname();
  const openQuickAdd = useQuickAdd();
  const [a, b, c, d] = MAIN;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center">
        {[a, b].map((item) => (
          <BottomLink key={item.href} item={item} active={isActive(path, item.href)} />
        ))}
        <div className="flex justify-center">
          <button
            onClick={openQuickAdd}
            aria-label="Adicionar ideias"
            className="flex size-12 items-center justify-center rounded-full bg-ink text-paper shadow-lg shadow-ink/15 active:scale-95"
          >
            <Plus size={22} />
          </button>
        </div>
        {[c, d].map((item) => (
          <BottomLink key={item.href} item={item} active={isActive(path, item.href)} />
        ))}
      </div>
    </nav>
  );
}

function BottomLink({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cx(
        "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
        active ? "text-ink" : "text-muted",
      )}
    >
      <Icon size={21} strokeWidth={1.75} className={active ? "text-rose" : undefined} />
      {item.label}
    </Link>
  );
}

/** Atalhos do topo no celular para o que não cabe na barra inferior. */
export function MobileTopBar() {
  const path = usePathname();
  const extra = [MAIN[4], MAIN[5], SETTINGS];
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line/60 bg-mist/90 px-5 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
      <Link href="/" className="py-3 font-display text-lg font-medium">
        ContentFlow<span className="text-rose">.</span>
      </Link>
      <div className="flex gap-1">
        {extra.map((item) => {
          const Icon = item.icon;
          const active = isActive(path, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cx(
                "flex size-9 items-center justify-center rounded-full",
                active ? "bg-rose-soft text-rose-deep" : "text-muted",
              )}
            >
              <Icon size={19} strokeWidth={1.75} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
