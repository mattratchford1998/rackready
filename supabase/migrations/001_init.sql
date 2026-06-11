-- RackReady schema — all weights in lb

create type load_type as enum ('barbell', 'dumbbell', 'kettlebell', 'bodyweight');

create table if not exists exercise (
  id           text primary key,          -- canonical_id, e.g. "romanian_deadlift"
  display_name text not null,
  load_type    load_type not null,
  unilateral   boolean not null default false,
  aliases      text[] not null default '{}',
  default_reps int
);

create table if not exists session (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  photo_url   text,
  raw_parse   jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists prescribed_exercise (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references session(id) on delete cascade,
  exercise_id        text not null references exercise(id),
  order_index        int not null,
  sets               int not null,
  reps               int not null,
  rpe                numeric(3,1),          -- null on 1RM test day
  recommended_weight numeric(6,2)           -- stored for later eval
);

create table if not exists logged_set (
  id               uuid primary key default gen_random_uuid(),
  prescribed_id    uuid not null references prescribed_exercise(id) on delete cascade,
  set_number       int not null,
  weight           numeric(6,2) not null,   -- per-hand for DB/single KB
  reps             int not null,
  reps_in_reserve  int not null default 0,
  created_at       timestamptz not null default now()
);

create table if not exists user_settings (
  id                    int primary key default 1,  -- single-user: always row 1
  bodyweight            numeric(5,1) not null default 185,
  available_dumbbells   numeric[] not null default '{5,10,15,20,25,30,35,40,45,50,55,60,65,70,75,80}',
  available_kettlebells numeric[] not null default '{18,26,35,44,53,62,70}',
  barbell_weight        numeric(5,1) not null default 45,
  plate_inventory       numeric[] not null default '{45,35,25,10,5,2.5}'
);

-- Seed the single user_settings row
insert into user_settings (id) values (1) on conflict do nothing;

-- Indexes for common query patterns
create index on logged_set (prescribed_id);
create index on prescribed_exercise (session_id, exercise_id);
create index on prescribed_exercise (exercise_id);
create index on session (date desc);
