import Link from "next/link";
import type { ReactNode } from "react";
import {
  FORMAT_LABEL,
  PRIORITY_LABEL,
  STATUS_LABEL,
  type Format,
  type Priority,
  type Status,
} from "@/lib/domain";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function FormatBadge({ format }: { format: Format }) {
  return (
    <span className="chip bg-ink px-2 py-0.5 text-[11px] tracking-wide text-paper">
      {FORMAT_LABEL[format]}
    </span>
  );
}

const STATUS_STYLE: Record<Status, string> = {
  ideia: "bg-mist text-muted",
  planejado: "bg-mist text-ink-soft",
  roteiro: "bg-rose-wash text-rose-deep ring-1 ring-rose-soft",
  gravar: "bg-rose-soft text-rose-deep",
  editar: "bg-paper text-ink ring-1 ring-line",
  legenda: "bg-paper text-ink ring-1 ring-line",
  finalizado: "bg-ok-soft text-ok",
  publicado: "bg-ok text-paper",
};

export function StatusPill({ status }: { status: Status }) {
  return <span className={cx("chip", STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>;
}

const PRIORITY_DOT: Record<Priority, string> = {
  alta: "bg-alert",
  media: "bg-[#d6a64a]",
  baixa: "bg-line",
};

export function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <span
      title={`Prioridade ${PRIORITY_LABEL[priority].toLowerCase()}`}
      className={cx("inline-block size-2 shrink-0 rounded-full", PRIORITY_DOT[priority])}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="font-display text-[28px] leading-tight font-medium tracking-tight md:text-[34px]">
          {title}
        </h1>
      </div>
      {action}
    </header>
  );
}

export function SectionTitle({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
      {icon && <span className="text-rose">{icon}</span>}
      {children}
    </h2>
  );
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 border-dashed px-6 py-10 text-center text-sm text-muted">
      {children}
      {action}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-rose-deep hover:underline">
      {children}
    </Link>
  );
}
