-- RackReady — known-1RM onboarding + dumbbell variants of the compound lifts.

-- 1) Store a known 1RM per movement (per-hand for dumbbell moves). ------------
create table if not exists one_rep_max (
  exercise_id text primary key references exercise(id) on delete cascade,
  weight numeric not null check (weight > 0),
  updated_at timestamptz not null default now()
);

alter table one_rep_max enable row level security;
drop policy if exists "public_all" on one_rep_max;
create policy "public_all" on one_rep_max for all using (true) with check (true);

-- 2) Dumbbell versions of the compounds (Dumbbell Bench already exists). ------
insert into exercise (id, display_name, load_type, unilateral, aliases, default_reps) values
  ('db_deadlift','Dumbbell Deadlift','dumbbell',false,array['db deadlift','dumbbell dl','db dl'],5),
  ('db_squat','Dumbbell Squat','dumbbell',false,array['db squat','dumbbell squat','db back squat'],5),
  ('db_romanian_deadlift','Dumbbell RDL','dumbbell',false,array['db rdl','dumbbell rdl','db romanian deadlift','db romanian dl'],8),
  ('db_push_press','Dumbbell Push Press','dumbbell',false,array['db push press','dumbbell push press','db pp'],5),
  ('db_bent_over_row','Dumbbell Bent-Over Row','dumbbell',false,array['db bent over row','dumbbell bent-over row','two arm db row','2-arm db row','bent over db row'],8)
on conflict (id) do update set
  display_name = excluded.display_name,
  load_type = excluded.load_type,
  unilateral = excluded.unilateral,
  aliases = excluded.aliases,
  default_reps = excluded.default_reps;
