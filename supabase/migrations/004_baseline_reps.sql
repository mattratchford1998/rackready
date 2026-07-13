-- RackReady — let a strength baseline be any rep-max, not just a single.
-- Store the reps the weight was hit for; the engine estimates 1RM from it (Epley).

alter table one_rep_max
  add column if not exists reps integer not null default 1;

alter table one_rep_max
  drop constraint if exists one_rep_max_reps_check;
alter table one_rep_max
  add constraint one_rep_max_reps_check check (reps between 1 and 15);
