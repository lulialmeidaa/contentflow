import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { setStatus } from "@/app/actions";
import { QuickAdd } from "@/components/quick-add";
import { Empty, FormatBadge, PageHeader, SectionTitle } from "@/components/ui";
import { getContents } from "@/lib/data";

export const metadata: Metadata = { title: "Ideias" };

export default async function IdeasPage() {
  const ideas = (await getContents())
    .filter((c) => c.status === "ideia")
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Banco de ideias" title="Ideias" />

      <section className="card p-5">
        <QuickAdd defaultStatus="ideia" />
      </section>

      <section>
        <SectionTitle icon={<Lightbulb size={16} />}>
          {ideas.length} {ideas.length === 1 ? "ideia guardada" : "ideias guardadas"}
        </SectionTitle>
        {ideas.length ? (
          <ul className="card divide-y divide-line">
            {ideas.map((idea) => (
              <li key={idea.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/conteudos/${idea.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <FormatBadge format={idea.format} />
                  <span className="truncate text-[15px] hover:text-rose-deep">{idea.title}</span>
                </Link>
                <form action={setStatus.bind(null, idea.id, "planejado")}>
                  <button className="chip border border-line bg-paper py-1.5 text-ink hover:border-rose hover:text-rose-deep">
                    <span className="hidden sm:inline">Transformar em conteúdo</span>
                    <span className="sm:hidden">Planejar</span>
                    <ArrowRight size={13} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Guarde aqui ideias que ainda não entraram no planejamento.</Empty>
        )}
      </section>
    </div>
  );
}
