-- Schéma initial du quiz de bar (migration depuis Convex).
-- À appliquer via le SQL Editor du dashboard Supabase, ou `supabase db push`
-- si le projet est linké.

create extension if not exists pgcrypto;

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

create table rounds (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  title text not null,
  "order" int not null
);
create index rounds_by_quiz on rounds(quiz_id);

create table questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  "order" int not null,
  type text not null check (type in ('text', 'mcq')),
  text text not null,
  answer text,
  choices jsonb -- tableau de {text, correct}
);
create index questions_by_quiz on questions(quiz_id);
create index questions_by_round on questions(round_id);

create table control_state (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null unique references quizzes(id) on delete cascade,
  active_question_id uuid references questions(id) on delete set null,
  phase text not null default 'idle' check (phase in ('idle', 'question', 'reveal')),
  timer_ends_at bigint -- epoch ms (garde useCountdown inchangé), null = pas de timer
);

-- App publique sans auth : RLS activé + policies permissives pour le rôle anon.
alter table quizzes enable row level security;
alter table rounds enable row level security;
alter table questions enable row level security;
alter table control_state enable row level security;

create policy anon_all on quizzes for all to anon using (true) with check (true);
create policy anon_all on rounds for all to anon using (true) with check (true);
create policy anon_all on questions for all to anon using (true) with check (true);
create policy anon_all on control_state for all to anon using (true) with check (true);

-- Realtime : publier les tables pilotant le direct.
alter publication supabase_realtime add table control_state;
alter publication supabase_realtime add table rounds;
alter publication supabase_realtime add table questions;
alter publication supabase_realtime add table quizzes;
