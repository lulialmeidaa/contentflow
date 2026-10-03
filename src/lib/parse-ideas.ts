import { addDays, diffDays, type ISODate } from "./dates";
import type { Format } from "./domain";

export type ParsedIdea = {
  title: string;
  /** null = formato não identificado; a interface pede confirmação. */
  format: Format | null;
  publication_date: ISODate | null;
  /** Colunas extras de uma tabela colada (ex.: descrição). */
  notes: string;
};

const FORMAT_WORDS: [RegExp, Format][] = [
  [/^reels?$/i, "reels"],
  [/^(stories|story|storys)$/i, "stories"],
  [/^(foto|fotos|post|imagem)$/i, "foto"],
  [/^(carrossel|carrosel|carousel|carrosséis)$/i, "carrossel"],
  [/^outros?$/i, "outro"],
];

function matchFormat(word: string): Format | null {
  const w = word.trim();
  for (const [re, f] of FORMAT_WORDS) if (re.test(w)) return f;
  return null;
}

// "05/10" ou "05/10/2026" em qualquer lugar da linha
const DATE_RE = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;

function resolveDate(day: number, month: number, year: number | null, today: ISODate): ISODate | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  let y = year ?? Number(today.slice(0, 4));
  if (y < 100) y += 2000;
  let d = `${y}-${pad(month)}-${pad(day)}`;
  // Sem ano e já passou há mais de um mês: provavelmente é do ano que vem.
  if (year == null && diffDays(d, today) < -31) d = `${y + 1}-${pad(month)}-${pad(day)}`;
  // Data inválida (ex.: 31/02) — a conversão "transborda" para outro mês.
  if (addDays(d, 0) !== d) return null;
  return d;
}

const TABLE_HEADER = /^(t[ií]tulo|formato|tipo|ideia|ideias|descri[çc][ãa]o|detalhes|tema|data|publica[çc][ãa]o)$/i;
const TABLE_RULE = /^:?-{2,}:?$/;

/**
 * Linha de tabela colada (Notion, Planilhas, Markdown):
 *   "| Rotina de skincare | Reels | Skincare da noite |"
 *   "Rotina de skincare<TAB>Reels<TAB>05/10"
 * Uma célula vira o formato, outra a data; a primeira restante é o título e
 * as demais vão para observações.
 */
function parseTableLine(line: string, today: ISODate): ParsedIdea | null {
  const cells = line
    .split(line.includes("\t") ? "\t" : "|")
    .map((c) => c.trim())
    .filter(Boolean);
  if (!cells.length || cells.every((c) => TABLE_RULE.test(c))) return null;
  if (cells.some((c) => TABLE_HEADER.test(c)) && !cells.some(matchFormat)) return null;

  let format: Format | null = null;
  let publication_date: ISODate | null = null;
  const rest: string[] = [];
  for (const cell of cells) {
    const f: Format | null = format ? null : matchFormat(cell);
    if (f) {
      format = f;
      continue;
    }
    const dm = !publication_date && cell.match(DATE_RE);
    if (dm && dm[0] === cell) {
      publication_date = resolveDate(Number(dm[1]), Number(dm[2]), dm[3] ? Number(dm[3]) : null, today);
      if (publication_date) continue;
    }
    rest.push(cell);
  }
  if (!rest.length) return null;

  // O título pode trazer formato ou data embutidos ("Reels — Rotina 05/10").
  const inner = parseLine(rest[0], today);
  if (!inner) return null;
  return {
    title: inner.title,
    format: format ?? inner.format,
    publication_date: publication_date ?? inner.publication_date,
    notes: rest.slice(1).join("\n"),
  };
}

function parseLine(raw: string, today: ISODate): ParsedIdea | null {
  // Remove marcadores de lista: "-", "•", "*", "1.", "2)"
  let line = raw.replace(/^\s*(?:[-•*·–—]|\d+[.)])\s*/, "").trim();
  if (!line) return null;

  let publication_date: ISODate | null = null;
  const dm = line.match(DATE_RE);
  if (dm) {
    publication_date = resolveDate(Number(dm[1]), Number(dm[2]), dm[3] ? Number(dm[3]) : null, today);
    if (publication_date) {
      line = line.replace(dm[0], "").replace(/\s+(?:em|dia|para|pra|p\/)\s*$/i, "");
    }
  }

  let format: Format | null = null;

  // "Formato — título" / "Formato - título" / "Formato: título"
  const prefix = line.match(/^([\p{L}]+)\s*(?:[—–:]|-(?=\s))\s*(.+)$/u);
  if (prefix && matchFormat(prefix[1])) {
    format = matchFormat(prefix[1]);
    line = prefix[2];
  }

  // "título (formato)" / "título — formato"
  if (!format) {
    const suffix = line.match(/^(.+?)\s*(?:\(([\p{L}]+)\)|[—–]\s*([\p{L}]+)|\s-\s([\p{L}]+))$/u);
    const word = suffix && (suffix[2] ?? suffix[3] ?? suffix[4]);
    if (word && matchFormat(word)) {
      format = matchFormat(word);
      line = suffix![1];
    }
  }

  // "reels minha rotina" — formato como primeira palavra, sem separador
  if (!format) {
    const first = line.match(/^([\p{L}]+)\s+(.+)$/u);
    if (first && matchFormat(first[1])) {
      format = matchFormat(first[1]);
      line = first[2];
    }
  }

  const title = line.replace(/[\s—–:-]+$/, "").replace(/^[\s—–:-]+/, "").trim();
  if (!title) return null;
  return { title: title.charAt(0).toUpperCase() + title.slice(1), format, publication_date, notes: "" };
}

/**
 * Interpreta texto colado em várias ideias, uma por linha.
 *
 *   "Reels — Minha rotina de skincare"
 *   "Stories: compras no mercado 05/10"
 *   "Favoritos do mês (carrossel)"
 *   "| Nails day | Reels | Antes, processo e resultado |"
 *   "- Arrume-se comigo"            → formato não identificado
 */
export function parseIdeas(text: string, today: ISODate): ParsedIdea[] {
  const out: ParsedIdea[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const idea = /[|\t]/.test(raw) ? parseTableLine(raw, today) : parseLine(raw, today);
    if (idea) out.push(idea);
  }
  return out;
}
