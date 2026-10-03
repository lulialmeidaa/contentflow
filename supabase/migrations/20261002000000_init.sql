-- ContentFlow — esquema inicial
-- Cada linha pertence a uma usuária (user_id) e é protegida por RLS.

create type content_format as enum ('reels', 'stories', 'foto', 'carrossel', 'outro');

create type content_status as enum (
  'ideia', 'planejado', 'roteiro', 'gravar', 'editar', 'legenda', 'finalizado', 'publicado'
);

create type content_priority as enum ('alta', 'media', 'baixa');

create type event_recurrence as enum ('nenhuma', 'diaria', 'dias_uteis', 'semanal', 'mensal');

-- Perfil e preferências de planejamento ------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  timezone text not null default 'America/Sao_Paulo',
  -- Janelas de gravação por dia da semana (0 = domingo … 6 = sábado).
  -- null = sem gravação naquele dia.
  recording_windows jsonb not null default '{
    "0": {"start": "09:00", "end": "13:00"},
    "1": {"start": "10:00", "end": "12:00"},
    "2": {"start": "10:00", "end": "12:00"},
    "3": {"start": "10:00", "end": "12:00"},
    "4": {"start": "10:00", "end": "12:00"},
    "5": {"start": "10:00", "end": "12:00"},
    "6": {"start": "09:00", "end": "13:00"}
  }'::jsonb,
  created_at timestamptz not null default now()
);

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Conteúdos -----------------------------------------------------------------
-- Ideias do banco de ideias são conteúdos com status 'ideia'.

create table contents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  format content_format not null default 'outro',
  status content_status not null default 'planejado',
  -- null = prioridade automática pela proximidade da publicação
  priority content_priority,
  script text not null default '',
  caption text not null default '',
  notes text not null default '',
  category text,
  publication_date date,
  -- Data de gravação fixada manualmente; null = o planejador decide.
  recording_date date,
  estimated_minutes integer not null default 30 check (estimated_minutes between 5 and 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index contents_user_status_idx on contents (user_id, status);

create function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contents_touch before update on contents
  for each row execute function touch_updated_at();

create table content_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  content_id uuid not null references contents (id) on delete cascade,
  type text not null default 'link' check (type in ('texto', 'link', 'imagem', 'video', 'arquivo')),
  url text,
  file_path text,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table content_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  content_id uuid not null references contents (id) on delete cascade,
  file_path text not null,
  file_type text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table content_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  content_id uuid not null references contents (id) on delete cascade,
  views integer,
  likes integer,
  comments integer,
  shares integer,
  saves integer,
  reach integer,
  followers_gained integer,
  recorded_at timestamptz not null default now()
);

-- Compromissos pessoais -----------------------------------------------------
-- Horários locais (fuso do perfil); recorrência expandida no planejador.

create table personal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  recurrence event_recurrence not null default 'nenhuma',
  recurrence_until date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index personal_events_user_date_idx on personal_events (user_id, date);

-- RLS -----------------------------------------------------------------------

alter table profiles enable row level security;
alter table contents enable row level security;
alter table content_references enable row level security;
alter table content_assets enable row level security;
alter table content_metrics enable row level security;
alter table personal_events enable row level security;

create policy "own profile" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own contents" on contents
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own references" on content_references
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own assets" on content_assets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own metrics" on content_metrics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own events" on personal_events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
