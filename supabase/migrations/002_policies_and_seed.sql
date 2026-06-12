-- RackReady — open up tables for the single-user app, then seed the exercise dictionary.
-- NOTE: this grants the public (anon) key full read/write. Fine for a private,
-- single-user gym log; revisit with real auth before any multi-user use.

-- 1) Permissive RLS policies on every table (idempotent) ----------------------
do $$
declare t text;
begin
  foreach t in array array['exercise','session','prescribed_exercise','logged_set','user_settings']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "public_all" on %I;', t);
    execute format('create policy "public_all" on %I for all using (true) with check (true);', t);
  end loop;
end $$;

-- 2) Seed the exercise dictionary (upsert) ------------------------------------
insert into exercise (id, display_name, load_type, unilateral, aliases, default_reps) values
  ('deadlift','Deadlift','barbell',false,array['dl','conventional deadlift','conv dl','barbell deadlift'],5),
  ('romanian_deadlift','Romanian Deadlift','barbell',false,array['rdl','bb rdl','barbell rdl','romanian dl','db rdl','dumbbell rdl'],8),
  ('single_leg_rdl','Single-Leg RDL','dumbbell',true,array['sl rdl','single leg rdl','sl romanian deadlift','1-leg rdl'],8),
  ('kettlebell_swing','Kettlebell Swing','kettlebell',false,array['kb swing','kb swings','two-hand swing','american swing'],15),
  ('back_squat','Back Squat','barbell',false,array['squat','bb squat','barbell squat','high bar squat','low bar squat'],5),
  ('front_squat','Front Squat','barbell',false,array['fs','barbell front squat'],5),
  ('goblet_squat','Goblet Squat','kettlebell',false,array['kb goblet squat','db goblet squat','goblet'],10),
  ('lunge','Lunge','dumbbell',true,array['lunges','walking lunge','walking lunges','db lunge','bb lunge','barbell lunge'],10),
  ('bulgarian_split_squat','Bulgarian Split Squat','dumbbell',true,array['bss','bsss','split squat','rear foot elevated split squat','rfess'],8),
  ('step_up','Step-Up','dumbbell',true,array['step ups','db step up','weighted step up'],10),
  ('bench_press','Bench Press','barbell',false,array['bench','bb bench','barbell bench','flat bench','flat bench press'],5),
  ('db_bench_press','Dumbbell Bench Press','dumbbell',false,array['db bench','dumbbell bench','db chest press'],8),
  ('overhead_press','Overhead Press','barbell',false,array['ohp','press','shoulder press','bb press','strict press','military press'],5),
  ('db_shoulder_press','Dumbbell Shoulder Press','dumbbell',false,array['db press','db ohp','dumbbell press','seated db press','arnold press'],8),
  ('push_press','Push Press','barbell',false,array['push-press','bb push press'],5),
  ('pull_up','Pull-Up','bodyweight',false,array['pullup','pull-up','pullups','pull-ups','weighted pull-up','chin up','chin-up'],5),
  ('bent_over_row','Bent-Over Row','barbell',false,array['row','bb row','barbell row','pendlay row','bent over row'],8),
  ('db_row','Dumbbell Row','dumbbell',true,array['db rows','single arm row','1-arm row','one arm row','dumbbell row'],10),
  ('lat_pulldown','Lat Pulldown','bodyweight',false,array['lat pull-down','pulldown','pull-down'],10),
  ('hip_thrust','Hip Thrust','barbell',false,array['barbell hip thrust','bb hip thrust','glute bridge','weighted glute bridge'],10),
  ('glute_bridge','Glute Bridge','bodyweight',false,array['bw glute bridge','bodyweight glute bridge'],15),
  ('good_morning','Good Morning','barbell',false,array['good mornings','bb good morning'],10),
  ('farmers_carry','Farmer''s Carry','dumbbell',false,array['farmers walk','farmer carry','farmer''s walk','kb farmers carry'],40),
  ('dip','Dip','bodyweight',false,array['dips','weighted dip','tricep dip','chest dip'],8)
on conflict (id) do update set
  display_name = excluded.display_name,
  load_type = excluded.load_type,
  unilateral = excluded.unilateral,
  aliases = excluded.aliases,
  default_reps = excluded.default_reps;
