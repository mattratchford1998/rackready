import Anthropic from "@anthropic-ai/sdk";
import exercisesData from "@/data/exercises.json";
import type { Exercise, LoadType, ParsedWorkout } from "@/lib/types";

const EXERCISES = exercisesData as Exercise[];
const IDS = EXERCISES.map((e) => e.id);
const LOAD_TYPES: LoadType[] = ["barbell", "dumbbell", "kettlebell", "bodyweight"];

// A compact dictionary the model uses to normalize board shorthand → canonical ids.
function dictionaryText(): string {
  return EXERCISES.map(
    (e) => `${e.id} (${e.display_name}, ${e.load_type}) — aliases: ${e.aliases.join(", ")}`
  ).join("\n");
}

// JSON schema mirrors ParsedWorkout, but pins canonical/load_type to known values.
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    detectedDate: { anyOf: [{ type: "string" }, { type: "null" }] },
    blocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                raw: { type: "string" },
                canonical: { anyOf: [{ type: "string", enum: IDS }, { type: "null" }] },
                load_type: { anyOf: [{ type: "string", enum: LOAD_TYPES }, { type: "null" }] },
                sets: { type: "integer" },
                reps: { type: "integer" },
                rpe: { anyOf: [{ type: "number" }, { type: "null" }] },
              },
              required: ["raw", "canonical", "load_type", "sets", "reps", "rpe"],
            },
          },
        },
        required: ["label", "exercises"],
      },
    },
    unparsed: { type: "array", items: { type: "string" } },
  },
  required: ["detectedDate", "blocks", "unparsed"],
} as const;

const SYSTEM = `You read a photo of a gym class whiteboard and turn it into structured JSON.

Rules:
- Map every movement to a canonical id from the provided dictionary. If you are not confident about a match, set "canonical": null (do NOT guess).
- Set "load_type" from the matched exercise; null if unknown.
- Extract sets, reps, and RPE for each movement. RPE is almost always on the board. The one exception is a 1-rep-max test day, where rpe may be null and reps is 1.
- If reps is written as a range (e.g. 8-10), use the lower number.
- Never invent exercises. Put anything illegible or unrecognizable into "unparsed".
- "detectedDate" is the date on the board in YYYY-MM-DD form, or null if none is shown.
- Blocks are labeled sections (A, B, "Strength", "Metcon", etc.). If the board has no labels, use a single block with label "Workout".

Exercise dictionary (canonical_id (display, load_type) — aliases):
${dictionaryText()}`;

export async function parseWorkoutImage(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"
): Promise<ParsedWorkout> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: "Parse this workout board into the required JSON." },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text returned from the parser.");
  }
  const parsed = JSON.parse(textBlock.text) as ParsedWorkout;
  return canonicalizeFallback(parsed);
}

// Safety net: if the model left canonical null but the raw text clearly matches
// an alias/display name, fill it in. Keeps unknowns as null.
function canonicalizeFallback(pw: ParsedWorkout): ParsedWorkout {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const byAlias = new Map<string, Exercise>();
  for (const ex of EXERCISES) {
    byAlias.set(norm(ex.display_name), ex);
    byAlias.set(norm(ex.id), ex);
    for (const a of ex.aliases) byAlias.set(norm(a), ex);
  }

  return {
    ...pw,
    blocks: pw.blocks.map((b) => ({
      ...b,
      exercises: b.exercises.map((e) => {
        if (e.canonical) return e;
        const match = byAlias.get(norm(e.raw));
        return match
          ? { ...e, canonical: match.id, load_type: match.load_type }
          : e;
      }),
    })),
  };
}
