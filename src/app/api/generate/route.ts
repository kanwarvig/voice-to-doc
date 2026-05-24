import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { CLINICAL_NOTE_MODEL, MAX_OUTPUT_TOKENS } from "@/lib/constants";
import { buildClinicalNotePrompt } from "@/lib/prompt";
import { generateNoteSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set in .env" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = generateNoteSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { patientData, dictation } = parsed.data;
  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: CLINICAL_NOTE_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [
        {
          role: "user",
          content: buildClinicalNotePrompt(patientData, dictation),
        },
      ],
    });

    const block = message.content[0];
    const clinicalNote = block?.type === "text" ? block.text : "";

    return NextResponse.json({ clinicalNote });
  } catch (error) {
    console.error("Anthropic API error:", error);

    const apiMessage =
      error instanceof Anthropic.APIError
        ? error.message
        : "Failed to generate clinical note. Please try again.";

    const status = error instanceof Anthropic.APIError ? error.status : 502;

    return NextResponse.json({ error: apiMessage }, { status });
  }
}
