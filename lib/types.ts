export type LoadType = "barbell" | "dumbbell" | "kettlebell" | "bodyweight";

export interface Exercise {
  id: string;
  display_name: string;
  load_type: LoadType;
  unilateral: boolean;
  aliases: string[];
  default_reps: number | null;
}

export interface Session {
  id: string;
  date: string;               // ISO date, e.g. "2026-06-11"
  photo_url: string | null;
  raw_parse: ParsedWorkout | null;
  created_at: string;
}

export interface PrescribedExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  order_index: number;
  sets: number;
  reps: number;
  rpe: number | null;         // null on 1RM day
  recommended_weight: number | null;
}

export interface LoggedSet {
  id: string;
  prescribed_id: string;
  set_number: number;
  weight: number;             // per-hand for DB/single KB
  reps: number;
  reps_in_reserve: number;
  created_at: string;
}

export interface UserSettings {
  bodyweight: number;
  available_dumbbells: number[];
  available_kettlebells: number[];
  barbell_weight: number;
  plate_inventory: number[];
}

// ── Photo parser output ────────────────────────────────────────────────────

export interface ParsedExercise {
  raw: string;
  canonical: string | null;
  load_type: LoadType | null;
  sets: number;
  reps: number;
  rpe: number | null;
}

export interface ParsedBlock {
  label: string;
  exercises: ParsedExercise[];
}

export interface ParsedWorkout {
  detectedDate: string | null;
  blocks: ParsedBlock[];
  unparsed: string[];
}

// ── Engine types ───────────────────────────────────────────────────────────

export interface HistorySet {
  date: string;               // ISO date
  weight: number;
  reps: number;
  reps_in_reserve: number;
  seed?: boolean;             // a seeded baseline (known rep-max), not a logged working set
}

export interface Recommendation {
  weight: number;
  display: string;            // e.g. "135 lb" or "40 lb dumbbells (each hand)"
  rationale: string;
  e1rm: number;               // current estimate
  last_set: HistorySet | null;
}

export type NoRecommendation = { type: "no_history" } | { type: "first_encounter" };
