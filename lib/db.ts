import { createClient } from "@supabase/supabase-js";
import type { Exercise, HistorySet, UserSettings } from "@/lib/types";

// Server-side Supabase client (single-user app, anon key, no session persistence).
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function getExercises(): Promise<Exercise[]> {
  const { data, error } = await db().from("exercise").select("*").order("display_name");
  if (error) throw error;
  return (data ?? []) as Exercise[];
}

export async function getUserSettings(): Promise<UserSettings> {
  const { data, error } = await db().from("user_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return {
    bodyweight: Number(data.bodyweight),
    available_dumbbells: (data.available_dumbbells as number[]).map(Number),
    available_kettlebells: (data.available_kettlebells as number[]).map(Number),
    barbell_weight: Number(data.barbell_weight),
    plate_inventory: (data.plate_inventory as number[]).map(Number),
  };
}

export interface PrescribedItem {
  exercise_id: string;
  sets: number;
  reps: number;
  rpe: number | null;
}

export async function createSession(date: string, items: PrescribedItem[]): Promise<string> {
  const client = db();
  const { data: session, error: sErr } = await client
    .from("session")
    .insert({ date })
    .select("id")
    .single();
  if (sErr) throw sErr;

  const rows = items.map((it, i) => ({
    session_id: session.id,
    exercise_id: it.exercise_id,
    order_index: i,
    sets: it.sets,
    reps: it.reps,
    rpe: it.rpe,
  }));
  const { error: pErr } = await client.from("prescribed_exercise").insert(rows);
  if (pErr) throw pErr;

  return session.id as string;
}

export async function getTodaySession(date: string): Promise<{ id: string } | null> {
  const { data, error } = await db()
    .from("session")
    .select("id")
    .eq("date", date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id as string } : null;
}

export interface LoggedSetRow {
  id: string;
  set_number: number;
  weight: number;
  reps: number;
  reps_in_reserve: number;
}

export interface PrescribedWithExercise {
  id: string;
  order_index: number;
  sets: number;
  reps: number;
  rpe: number | null;
  exercise: Exercise;
  logged: LoggedSetRow[];
}

export interface SessionDetail {
  id: string;
  date: string;
  prescriptions: PrescribedWithExercise[];
}

export async function getSessionDetail(id: string): Promise<SessionDetail | null> {
  const { data, error } = await db()
    .from("session")
    .select(
      "id, date, prescribed_exercise(id, order_index, sets, reps, rpe, exercise(*), logged_set(id, set_number, weight, reps, reps_in_reserve))"
    )
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    throw error;
  }

  const prescriptions = (data.prescribed_exercise as unknown[] as (PrescribedWithExercise & {
    logged_set: LoggedSetRow[];
  })[])
    .map((p) => ({
      ...p,
      rpe: p.rpe === null ? null : Number(p.rpe),
      logged: (p.logged_set ?? [])
        .map((l) => ({
          ...l,
          weight: Number(l.weight),
          reps: Number(l.reps),
          reps_in_reserve: Number(l.reps_in_reserve),
        }))
        .sort((a, b) => a.set_number - b.set_number),
    }))
    .sort((a, b) => a.order_index - b.order_index);

  return { id: data.id as string, date: data.date as string, prescriptions };
}

// All logged sets for one movement, across every session — the engine's input.
// A known 1RM (if set) is folded in as a starting data point so recommendations
// work before any real set is logged; it fades as real sessions accumulate.
export async function getHistoryForExercise(exerciseId: string): Promise<HistorySet[]> {
  const client = db();
  const { data, error } = await client
    .from("logged_set")
    .select("weight, reps, reps_in_reserve, prescribed_exercise!inner(exercise_id, session!inner(date))")
    .eq("prescribed_exercise.exercise_id", exerciseId);
  if (error) throw error;

  const history: HistorySet[] = (data ?? []).map((row: Record<string, unknown>) => {
    const pe = row.prescribed_exercise as { session: { date: string } };
    return {
      date: pe.session.date,
      weight: Number(row.weight),
      reps: Number(row.reps),
      reps_in_reserve: Number(row.reps_in_reserve),
    };
  });

  const { data: orm, error: oErr } = await client
    .from("one_rep_max")
    .select("weight, updated_at")
    .eq("exercise_id", exerciseId)
    .maybeSingle();
  if (oErr) throw oErr;
  if (orm) {
    history.push({
      date: String(orm.updated_at).slice(0, 10), // treated as a 1-rep, to-failure set
      weight: Number(orm.weight),
      reps: 1,
      reps_in_reserve: 0,
    });
  }

  return history;
}

export async function getOneRepMaxes(): Promise<Record<string, number>> {
  const { data, error } = await db().from("one_rep_max").select("exercise_id, weight");
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const r of (data ?? []) as { exercise_id: string; weight: number }[]) {
    out[r.exercise_id] = Number(r.weight);
  }
  return out;
}

export interface OneRepMaxEntry {
  exercise_id: string;
  weight: number | null; // null clears it
}

export async function saveOneRepMaxes(entries: OneRepMaxEntry[]): Promise<void> {
  const client = db();
  const now = new Date().toISOString();
  const toUpsert = entries
    .filter((e) => e.weight != null && e.weight > 0)
    .map((e) => ({ exercise_id: e.exercise_id, weight: e.weight as number, updated_at: now }));
  const toDelete = entries
    .filter((e) => e.weight == null || !(e.weight > 0))
    .map((e) => e.exercise_id);

  if (toUpsert.length) {
    const { error } = await client.from("one_rep_max").upsert(toUpsert, { onConflict: "exercise_id" });
    if (error) throw error;
  }
  if (toDelete.length) {
    const { error } = await client.from("one_rep_max").delete().in("exercise_id", toDelete);
    if (error) throw error;
  }
}

// Record one performed set against a prescription. set_number is the next index.
export async function logSet(
  prescribedId: string,
  weight: number,
  reps: number,
  reps_in_reserve: number
): Promise<void> {
  const client = db();
  const { count, error: cErr } = await client
    .from("logged_set")
    .select("id", { count: "exact", head: true })
    .eq("prescribed_id", prescribedId);
  if (cErr) throw cErr;

  const { error } = await client.from("logged_set").insert({
    prescribed_id: prescribedId,
    set_number: (count ?? 0) + 1,
    weight,
    reps,
    reps_in_reserve,
  });
  if (error) throw error;
}

// Overwrite the single settings row (id=1) with edited equipment.
export async function updateUserSettings(s: UserSettings): Promise<void> {
  const { error } = await db()
    .from("user_settings")
    .update({
      bodyweight: s.bodyweight,
      available_dumbbells: s.available_dumbbells,
      available_kettlebells: s.available_kettlebells,
      barbell_weight: s.barbell_weight,
      plate_inventory: s.plate_inventory,
    })
    .eq("id", 1);
  if (error) throw error;
}

export interface ExerciseHistory {
  exercise: Exercise;
  sets: HistorySet[]; // newest first
}

// Every logged set, grouped by movement — the history screen's input.
export async function getAllHistory(): Promise<ExerciseHistory[]> {
  const { data, error } = await db()
    .from("logged_set")
    .select(
      "weight, reps, reps_in_reserve, prescribed_exercise!inner(exercise:exercise_id(*), session:session_id(date))"
    );
  if (error) throw error;

  const groups = new Map<string, ExerciseHistory>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const pe = row.prescribed_exercise as { exercise: Exercise; session: { date: string } };
    const ex = pe.exercise;
    if (!ex) continue;
    if (!groups.has(ex.id)) groups.set(ex.id, { exercise: ex, sets: [] });
    groups.get(ex.id)!.sets.push({
      date: pe.session.date,
      weight: Number(row.weight),
      reps: Number(row.reps),
      reps_in_reserve: Number(row.reps_in_reserve),
    });
  }

  const out = [...groups.values()];
  for (const g of out) g.sets.sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
  out.sort((a, b) => a.exercise.display_name.localeCompare(b.exercise.display_name));
  return out;
}
