# ContentFlow

Plataforma pessoal que transforma ideias de conteúdo em uma rotina de produção. Veja o [PRD](PRD_ContentFlow.md).

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth) · Tailwind CSS 4 · PWA

## Rodando localmente

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, rode o conteúdo de [`supabase/migrations/20261002000000_init.sql`](supabase/migrations/20261002000000_init.sql).
3. Em **Authentication → Providers → Email**, desative *Confirm email* se quiser entrar sem confirmar o e-mail (uso pessoal).
4. Copie `.env.example` para `.env.local` e preencha com os dados de **Project Settings → API**.
5. Rode:

```bash
pnpm install
pnpm dev
```

Abra http://localhost:3000, crie sua conta e comece colando suas ideias.

## Scripts

| Comando      | O que faz                          |
| ------------ | ---------------------------------- |
| `pnpm dev`   | servidor de desenvolvimento        |
| `pnpm build` | build de produção                  |
| `pnpm test`  | testes do interpretador e planejador |
| `pnpm lint`  | ESLint                             |

## Onde fica cada coisa

- [`src/lib/planner.ts`](src/lib/planner.ts) — algoritmo que decide o que gravar em cada dia (sábado primeiro, depois dias de semana, domingo só se necessário; agrupa formatos iguais; respeita compromissos e prazos de publicação).
- [`src/lib/parse-ideas.ts`](src/lib/parse-ideas.ts) — interpreta ideias coladas, uma por linha (`Reels — título 05/10`).
- [`src/app/actions.ts`](src/app/actions.ts) — todas as gravações no banco (Server Actions).
- [`src/app/(app)/`](src/app/(app)/) — telas: Hoje, Calendário, Conteúdos, Ideias, Agenda, Métricas, Configurações.

O plano de gravação é recalculado a cada acesso a partir dos conteúdos, compromissos e janelas de gravação. Fixar uma data de gravação num conteúdo faz o planejador respeitá-la.
