import { describe, expect, it } from "vitest";
import { parseIdeas } from "./parse-ideas";

const TODAY = "2026-10-01";

describe("parseIdeas", () => {
  it("interpreta o exemplo do PRD, uma ideia por linha", () => {
    const text = `Reels — Minha rotina de skincare
Reels — Produtos favoritos do mês
Stories — Compras no mercado
Carrossel — Produtos que acabaram
Reels — Arrume-se comigo`;
    expect(parseIdeas(text, TODAY)).toEqual([
      { title: "Minha rotina de skincare", format: "reels", publication_date: null, notes: "" },
      { title: "Produtos favoritos do mês", format: "reels", publication_date: null, notes: "" },
      { title: "Compras no mercado", format: "stories", publication_date: null, notes: "" },
      { title: "Produtos que acabaram", format: "carrossel", publication_date: null, notes: "" },
      { title: "Arrume-se comigo", format: "reels", publication_date: null, notes: "" },
    ]);
  });

  it("aceita separadores e posições diferentes para o formato", () => {
    const r = parseIdeas(
      `reel: testando produto novo
story - ida ao mercado
Favoritos do mês (carrossel)
Rotina da noite — reels
foto look do dia`,
      TODAY,
    );
    expect(r.map((x) => [x.title, x.format])).toEqual([
      ["Testando produto novo", "reels"],
      ["Ida ao mercado", "stories"],
      ["Favoritos do mês", "carrossel"],
      ["Rotina da noite", "reels"],
      ["Look do dia", "foto"],
    ]);
  });

  it("não confunde hífen dentro do título com separador", () => {
    expect(parseIdeas("Arrume-se comigo", TODAY)).toEqual([
      { title: "Arrume-se comigo", format: null, publication_date: null, notes: "" },
    ]);
  });

  it("deixa o formato em aberto quando não reconhece", () => {
    expect(parseIdeas("Vlog — viagem para a praia", TODAY)[0]).toMatchObject({
      title: "Vlog — viagem para a praia",
      format: null,
    });
  });

  it("remove marcadores de lista e ignora linhas vazias", () => {
    const r = parseIdeas("- Reels — A\n\n• Stories — B\n1. Foto — C\n2) D\n   \n", TODAY);
    expect(r.map((x) => x.title)).toEqual(["A", "B", "C", "D"]);
  });

  it("extrai a data de publicação", () => {
    expect(parseIdeas("Reels — Rotina de skincare 05/10", TODAY)[0]).toEqual({
      title: "Rotina de skincare",
      format: "reels",
      publication_date: "2026-10-05",
      notes: "",
    });
    expect(parseIdeas("Stories — mercado dia 12/10", TODAY)[0].publication_date).toBe("2026-10-12");
    expect(parseIdeas("Reels — Natal 25/12/2026", TODAY)[0].publication_date).toBe("2026-12-25");
  });

  it("assume o ano seguinte para datas que já passaram há muito tempo", () => {
    expect(parseIdeas("Reels — Verão 15/01", TODAY)[0].publication_date).toBe("2027-01-15");
  });

  it("ignora datas inválidas", () => {
    expect(parseIdeas("Reels — Algo 31/02", TODAY)[0]).toMatchObject({
      publication_date: null,
      title: "Algo 31/02",
    });
  });

  it("lê tabelas coladas com colunas separadas por |", () => {
    const text = `| Título | Formato | Descrição |
|---|---|---|
Começando outubro comigo        | Reels    | Mini vlog da rotina       |
| Nails day                    | Reels    | Antes, processo e resultado |
| Favoritos | carrossel | 05/10 | Produtos do mês |`;
    expect(parseIdeas(text, TODAY)).toEqual([
      { title: "Começando outubro comigo", format: "reels", publication_date: null, notes: "Mini vlog da rotina" },
      { title: "Nails day", format: "reels", publication_date: null, notes: "Antes, processo e resultado" },
      { title: "Favoritos", format: "carrossel", publication_date: "2026-10-05", notes: "Produtos do mês" },
    ]);
  });

  it("lê colunas separadas por tab (planilhas)", () => {
    expect(parseIdeas("Rotina\tStories\tde manhã", TODAY)).toEqual([
      { title: "Rotina", format: "stories", publication_date: null, notes: "de manhã" },
    ]);
  });

  it("aceita formato e título separados por uma barra só", () => {
    expect(parseIdeas("Reels | Rotina", TODAY)[0]).toMatchObject({ title: "Rotina", format: "reels" });
  });
});
