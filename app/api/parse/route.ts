import { NextResponse } from "next/server";
import { parseWorkoutImage } from "@/lib/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type Allowed = (typeof ALLOWED)[number];

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Photo parsing isn't set up yet — add your Anthropic API key." },
      { status: 503 }
    );
  }

  let body: { base64?: string; mediaType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { base64, mediaType } = body;
  if (!base64 || !mediaType || !ALLOWED.includes(mediaType as Allowed)) {
    return NextResponse.json(
      { error: "Send a JPEG, PNG, WebP, or GIF image." },
      { status: 400 }
    );
  }

  try {
    const parsed = await parseWorkoutImage(base64, mediaType as Allowed);
    return NextResponse.json(parsed);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not read that photo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
