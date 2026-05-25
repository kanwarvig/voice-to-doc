// updated: openai whisper api v3
import { NextResponse } from "next/server";
import OpenAI from "openai";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "No audio recording provided" }, { status: 400 });
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Recording is too large (max 25 MB)" }, { status: 413 });
  }

  try {
    const file = new File([audio], "dictation.webm", { type: "audio/webm" });

    const response = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      response_format: "text",
    });

    const transcription = response.trim();

    if (!transcription) {
      return NextResponse.json(
        { error: "No speech detected. Try recording again." },
        { status: 422 },
      );
    }

    return NextResponse.json({ transcription });
  } catch (error) {
    console.error("Whisper transcription error:", error);
    const message = error instanceof Error ? error.message : "Transcription failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
