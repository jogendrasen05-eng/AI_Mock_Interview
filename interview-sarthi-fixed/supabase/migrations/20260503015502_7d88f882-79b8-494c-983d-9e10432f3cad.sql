-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- interviews
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  score numeric,
  status text not null default 'in_progress',
  metrics jsonb,
  ai_summary jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.interviews enable row level security;
create policy "own interviews all" on public.interviews for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- questions
create table public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references public.interviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_index int not null default 0,
  question text not null,
  user_answer text,
  ai_feedback jsonb,
  score numeric,
  created_at timestamptz not null default now()
);
alter table public.interview_questions enable row level security;
create policy "own questions all" on public.interview_questions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- handle_new_user trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();