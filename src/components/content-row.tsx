import Link from "next/link";
import { CalendarClock, Video } from "lucide-react";
import { formatRelative, formatShort } from "@/lib/dates";
import { NEEDS_RECORDING, type Content } from "@/lib/domain";
import { effectivePriority } from "@/lib/planner";
import { RecordingDatePicker } from "./recording-date-picker";
import { StatusStepper } from "./status-stepper";
import { FormatBadge, PriorityDot, StatusPill } from "./ui";

type Props = {
  content: Content;
  today: string;
  /** Data planejada de gravação, vinda do planejador. */
  recordingDate?: string;
  /** Texto extra à esquerda, ex.: "10h–10h45". */
  lead?: string;
  stepper?: boolean;
  /** Permite escolher a data de gravação direto na linha. */
  editRecording?: boolean;
};

export function ContentRow({ content: c, today, recordingDate, lead, stepper = true, editRecording }: Props) {
  const canEditRecording = editRecording && NEEDS_RECORDING.includes(c.status);
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      {lead && <span className="w-14 shrink-0 text-xs font-medium text-muted tabular-nums">{lead}</span>}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link href={`/conteudos/${c.id}`} className="group flex items-center gap-2">
          <PriorityDot priority={effectivePriority(c, today)} />
          <span className="truncate text-[15px] font-medium group-hover:text-rose-deep">{c.title}</span>
        </Link>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <FormatBadge format={c.format} />
          <StatusPill status={c.status} />
          {c.publication_date && (
            <span className="flex items-center gap-1">
              <CalendarClock size={12} /> publicar {formatRelative(c.publication_date, today).toLowerCase()}
            </span>
          )}
          {canEditRecording ? (
            <RecordingDatePicker id={c.id} planned={recordingDate} pinned={c.recording_date} />
          ) : (
            recordingDate && (
              <span className="flex items-center gap-1">
                <Video size={12} /> gravar {formatShort(recordingDate)}
              </span>
            )
          )}
        </span>
      </div>
      {stepper && <StatusStepper id={c.id} status={c.status} compact />}
    </div>
  );
}
