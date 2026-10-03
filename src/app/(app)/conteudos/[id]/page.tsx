import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getContent, getPlan, getToday } from "@/lib/data";
import { autoPriority } from "@/lib/planner";
import { ContentEditor } from "./content-editor";

export async function generateMetadata(props: PageProps<"/conteudos/[id]">): Promise<Metadata> {
  const content = await getContent((await props.params).id);
  return { title: content?.title ?? "Conteúdo" };
}

export default async function ContentPage(props: PageProps<"/conteudos/[id]">) {
  const { id } = await props.params;
  const [content, plan, today] = await Promise.all([getContent(id), getPlan(), getToday()]);
  if (!content) notFound();

  const planned = plan.byContent.get(id);
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={content.status === "ideia" ? "/ideias" : "/conteudos"}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <ChevronLeft size={16} /> {content.status === "ideia" ? "Ideias" : "Conteúdos"}
      </Link>
      <ContentEditor
        key={content.id}
        content={content}
        suggestedRecording={
          planned && !planned.item.pinned
            ? { date: planned.date, start: planned.item.start, end: planned.item.end }
            : null
        }
        autoPriority={autoPriority(content, today)}
        today={today}
      />
    </div>
  );
}
