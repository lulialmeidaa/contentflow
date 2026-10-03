import type { Metadata } from "next";
import { ContentList } from "./content-list";
import { PageHeader } from "@/components/ui";
import { getContents, getPlan, getToday } from "@/lib/data";

export const metadata: Metadata = { title: "Conteúdos" };

export default async function ContentsPage() {
  const [contents, plan, today] = await Promise.all([getContents(), getPlan(), getToday()]);
  const recording: Record<string, string> = {};
  for (const [id, { date }] of plan.byContent) recording[id] = date;

  return (
    <>
      <PageHeader eyebrow="Produção" title="Conteúdos" />
      <ContentList
        contents={contents.filter((c) => c.status !== "ideia")}
        recording={recording}
        today={today}
      />
    </>
  );
}
