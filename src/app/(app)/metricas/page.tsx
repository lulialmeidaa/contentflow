import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { Empty, PageHeader } from "@/components/ui";
import { getContents } from "@/lib/data";

export const metadata: Metadata = { title: "Métricas" };

export default async function MetricsPage() {
  const published = (await getContents()).filter((c) => c.status === "publicado").length;
  return (
    <>
      <PageHeader eyebrow="Resultados" title="Métricas" />
      <Empty>
        <BarChart3 className="text-rose" />
        <p>
          {published} {published === 1 ? "conteúdo publicado" : "conteúdos publicados"} até agora.
          <br />O registro de visualizações, curtidas e salvamentos chega na próxima etapa.
        </p>
      </Empty>
    </>
  );
}
