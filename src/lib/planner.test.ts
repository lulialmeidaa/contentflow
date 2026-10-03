import { describe, expect, it } from "vitest";
import type { Content, PersonalEvent, RecordingWindows } from "./domain";
import { DEFAULT_MINUTES } from "./domain";
import { autoPriority, buildPlan, freeSlots, eventsOn, findConflict, nextFreeStart, occursOn } from "./planner";

// 2026-10-05 é uma segunda-feira; 10/10 é sábado e 11/10, domingo.
const MON = "2026-10-05";
const SAT = "2026-10-10";

const WINDOWS: RecordingWindows = {
  "0": { start: "09:00", end: "13:00" },
  "1": { start: "10:00", end: "12:00" },
  "2": { start: "10:00", end: "12:00" },
  "3": { start: "10:00", end: "12:00" },
  "4": { start: "10:00", end: "12:00" },
  "5": { start: "10:00", end: "12:00" },
  "6": { start: "09:00", end: "13:00" },
};

let seq = 0;
function content(over: Partial<Content> = {}): Content {
  seq++;
  const format = over.format ?? "reels";
  return {
    id: `c${seq}`,
    title: `Conteúdo ${seq}`,
    format,
    status: "planejado",
    priority: null,
    script: "",
    caption: "",
    notes: "",
    category: null,
    publication_date: null,
    recording_date: null,
    estimated_minutes: DEFAULT_MINUTES[format],
    created_at: `2026-09-01T00:00:${String(seq).padStart(2, "0")}Z`,
    updated_at: "",
    published_at: null,
    ...over,
  };
}

function event(over: Partial<PersonalEvent>): PersonalEvent {
  return {
    id: `e${++seq}`,
    title: "Compromisso",
    date: MON,
    start_time: "09:00",
    end_time: "10:00",
    recurrence: "nenhuma",
    recurrence_until: null,
    weekdays: [],
    notes: "",
    ...over,
  };
}

function plannedDate(plan: ReturnType<typeof buildPlan>, c: Content) {
  return plan.byContent.get(c.id)?.date;
}

describe("recorrência de compromissos", () => {
  it("expande semanal, dias úteis, mensal e respeita o fim", () => {
    const weekly = event({ recurrence: "semanal" });
    expect(occursOn(weekly, "2026-10-12")).toBe(true);
    expect(occursOn(weekly, "2026-10-13")).toBe(false);
    expect(occursOn(weekly, "2026-09-28")).toBe(false); // antes do início

    const weekdays = event({ recurrence: "dias_uteis" });
    expect(occursOn(weekdays, SAT)).toBe(false);
    expect(occursOn(weekdays, "2026-10-09")).toBe(true);

    const monthly = event({ recurrence: "mensal" });
    expect(occursOn(monthly, "2026-11-05")).toBe(true);

    const picked = event({ recurrence: "dias_semana", weekdays: [1, 3, 5] });
    expect(occursOn(picked, MON)).toBe(true);
    expect(occursOn(picked, "2026-10-06")).toBe(false); // terça
    expect(occursOn(picked, "2026-10-07")).toBe(true); // quarta
    expect(occursOn(picked, "2026-10-09")).toBe(true); // sexta
    expect(occursOn(picked, SAT)).toBe(false);

    const until = event({ recurrence: "diaria", recurrence_until: "2026-10-07" });
    expect(occursOn(until, "2026-10-07")).toBe(true);
    expect(occursOn(until, "2026-10-08")).toBe(false);
  });
});

describe("freeSlots", () => {
  it("subtrai compromissos da janela de gravação", () => {
    const busy = eventsOn([event({ date: SAT, start_time: "10:00", end_time: "11:00" })], SAT);
    expect(freeSlots(WINDOWS, busy, SAT)).toEqual([
      { start: 9 * 60, end: 10 * 60 },
      { start: 11 * 60, end: 13 * 60 },
    ]);
  });

  it("descarta sobras menores que 15 minutos", () => {
    const busy = eventsOn([event({ date: MON, start_time: "10:10", end_time: "12:00" })], MON);
    expect(freeSlots(WINDOWS, busy, MON)).toEqual([]);
  });

  it("dia sem janela não tem horário livre", () => {
    expect(freeSlots({ ...WINDOWS, "1": null }, [], MON)).toEqual([]);
  });
});

describe("autoPriority", () => {
  it("é alta perto da publicação e baixa sem data", () => {
    expect(autoPriority({ publication_date: "2026-10-07" }, MON)).toBe("alta");
    expect(autoPriority({ publication_date: "2026-10-11" }, MON)).toBe("media");
    expect(autoPriority({ publication_date: "2026-10-30" }, MON)).toBe("baixa");
    expect(autoPriority({ publication_date: null }, MON)).toBe("baixa");
  });
});

describe("buildPlan", () => {
  it("concentra gravações no sábado quando o prazo permite (gravação em lote)", () => {
    const cs = [content(), content(), content(), content()];
    const plan = buildPlan({ today: MON, contents: cs, events: [], windows: WINDOWS });
    const sat = plan.days.find((d) => d.date === SAT)!;
    expect(sat.items).toHaveLength(4); // 4 × 45 min = 3h em 4h
    expect(sat.usedMinutes).toBe(180);
    expect(sat.items.map((i) => i.start)).toEqual([540, 585, 630, 675]);
  });

  it("usa a semana quando o sábado lota, e domingo só se necessário", () => {
    // 6 reels (4h30) com publicação na segunda seguinte: prazo = domingo 11/10
    const cs = Array.from({ length: 6 }, () => content({ publication_date: "2026-10-12" }));
    const plan = buildPlan({ today: MON, contents: cs, events: [], windows: WINDOWS });
    const dates = cs.map((c) => plannedDate(plan, c));
    expect(dates.filter((d) => d === SAT)).toHaveLength(5); // 5 × 45 = 3h45
    expect(dates).not.toContain("2026-10-11"); // domingo ficou livre
    expect(dates.filter((d) => d! < SAT)).toHaveLength(1);
  });

  it("antecipa conteúdos cuja publicação vem antes do sábado", () => {
    const urgent = content({ publication_date: "2026-10-08" }); // quinta → gravar até quarta
    const plan = buildPlan({ today: MON, contents: [urgent], events: [], windows: WINDOWS });
    expect(plannedDate(plan, urgent)! <= "2026-10-07").toBe(true);
    expect(plan.alerts).toEqual([]);
  });

  it("stories podem ser gravados no próprio dia da publicação", () => {
    const st = content({ format: "stories", publication_date: MON });
    const plan = buildPlan({ today: MON, contents: [st], events: [], windows: WINDOWS });
    expect(plannedDate(plan, st)).toBe(MON);
    expect(plan.alerts).toEqual([]);
  });

  it("respeita compromissos ao escolher horários", () => {
    const urgent = content({ publication_date: "2026-10-06", estimated_minutes: 45 });
    const busy = event({ date: MON, start_time: "10:00", end_time: "11:00" });
    const plan = buildPlan({ today: MON, contents: [urgent], events: [busy], windows: WINDOWS });
    const { date, item } = plan.byContent.get(urgent.id)!;
    expect(date).toBe(MON);
    expect([item.start, item.end]).toEqual([11 * 60, 11 * 60 + 45]);
  });

  it("agrupa formatos iguais no mesmo dia", () => {
    const cs = [
      content({ format: "reels" }),
      content({ format: "stories" }),
      content({ format: "reels" }),
      content({ format: "stories" }),
    ];
    const plan = buildPlan({ today: MON, contents: cs, events: [], windows: WINDOWS });
    const sat = plan.days.find((d) => d.date === SAT)!;
    expect(sat.items.map((i) => i.content.format)).toEqual(["reels", "reels", "stories", "stories"]);
  });

  it("ignora conteúdos que não precisam mais ser gravados", () => {
    const cs = [
      content({ status: "ideia" }),
      content({ status: "editar" }),
      content({ status: "publicado" }),
    ];
    const plan = buildPlan({ today: MON, contents: cs, events: [], windows: WINDOWS });
    expect(plan.byContent.size).toBe(0);
  });

  it("respeita a data de gravação fixada manualmente", () => {
    const pinned = content({ recording_date: "2026-10-08" });
    const plan = buildPlan({ today: MON, contents: [pinned], events: [], windows: WINDOWS });
    expect(plannedDate(plan, pinned)).toBe("2026-10-08");
    expect(plan.byContent.get(pinned.id)!.item.pinned).toBe(true);
  });

  it("replaneja uma data fixada que já passou", () => {
    const old = content({ recording_date: "2026-10-01" });
    const plan = buildPlan({ today: MON, contents: [old], events: [], windows: WINDOWS });
    expect(plannedDate(plan, old)).toBe(SAT);
  });

  it("sinaliza atraso quando não há tempo antes da publicação", () => {
    const late = content({ publication_date: "2026-10-01" }); // já passou
    const plan = buildPlan({ today: MON, contents: [late], events: [], windows: WINDOWS });
    expect(plannedDate(plan, late)).toBe(MON);
    expect(plan.alerts.map((a) => a.kind)).toEqual(["atrasado"]);
  });

  it("avisa quando não existe nenhuma janela disponível", () => {
    const c = content();
    const plan = buildPlan({ today: MON, contents: [c], events: [], windows: {} });
    expect(plan.alerts.map((a) => a.kind)).toEqual(["sem-horario"]);
  });

  it("avisa quando conteúdos fixados ultrapassam a janela do dia", () => {
    const cs = [
      content({ recording_date: MON, estimated_minutes: 90 }),
      content({ recording_date: MON, estimated_minutes: 90 }),
    ];
    const plan = buildPlan({ today: MON, contents: cs, events: [], windows: WINDOWS });
    expect(plan.alerts.filter((a) => a.kind === "excede-janela")).toHaveLength(2);
    expect(plan.days[0].items).toHaveLength(2);
  });

  it("gravação fixada que passa da janela não cai em cima de compromisso", () => {
    const cs = [
      content({ recording_date: MON, estimated_minutes: 120 }),
      content({ recording_date: MON, estimated_minutes: 60 }),
    ];
    const gym = event({ date: MON, start_time: "12:00", end_time: "13:30" });
    const plan = buildPlan({ today: MON, contents: cs, events: [gym], windows: WINDOWS });
    const times = plan.days[0].items.map((i) => [i.start, i.end]);
    expect(times).toEqual([
      [10 * 60, 12 * 60],
      [13 * 60 + 30, 14 * 60 + 30], // depois da academia
    ]);
  });
});

describe("nextFreeStart", () => {
  it("pula compromissos em sequência", () => {
    const busy = eventsOn(
      [
        event({ date: MON, start_time: "14:00", end_time: "15:00" }),
        event({ date: MON, start_time: "15:00", end_time: "16:00" }),
      ],
      MON,
    );
    expect(nextFreeStart(14 * 60 - 30, 45, busy)).toBe(16 * 60);
    expect(nextFreeStart(12 * 60, 60, busy)).toBe(12 * 60);
  });
});

describe("findConflict", () => {
  const gym = event({ id: "gym", title: "Academia", date: MON, start_time: "09:00", end_time: "10:00", recurrence: "dias_uteis" });

  it("detecta sobreposição e sugere o próximo horário livre", () => {
    const c = findConflict(event({ id: "new", date: "2026-10-07", start_time: "09:30", end_time: "10:30" }), [gym]);
    expect(c?.date).toBe("2026-10-07");
    expect(c?.other.event.title).toBe("Academia");
    expect(c?.nextFree).toBe(10 * 60);
  });

  it("permite começar exatamente quando o anterior termina", () => {
    expect(findConflict(event({ id: "new", start_time: "10:00", end_time: "11:00" }), [gym])).toBeNull();
  });

  it("encontra conflito numa repetição futura", () => {
    const weekly = event({ id: "new", date: SAT, start_time: "09:00", end_time: "09:30", recurrence: "diaria" });
    expect(findConflict(weekly, [gym])?.date).toBe("2026-10-12"); // segunda seguinte
  });

  it("ignora o próprio compromisso ao editar", () => {
    expect(findConflict(gym, [gym])).toBeNull();
  });
});
