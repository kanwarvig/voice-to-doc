import { randomUUID } from "crypto";
import { unlink, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { tmpdir } from "os";
import { join } from "path";
import { buildWhisperMedicalContext } from "@/lib/medical-vocabulary";
import { runWhisperTranscription } from "@/lib/whisper-runner";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

function extensionForMime(mime: string): string {
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

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

  const patientField = formData.get("patientData");
  const patientData = typeof patientField === "string" ? patientField : "";

  const buffer = Buffer.from(await audio.arrayBuffer());
  const ext = extensionForMime(audio.type);
  const tempPath = join(tmpdir(), `dictation-${randomUUID()}.${ext}`);

  try {
    await writeFile(tempPath, buffer);

    const medicalContext = buildWhisperMedicalContext(patientData);
    const parsed = await runWhisperTranscription(tempPath, medicalContext);

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 502 });
    }

    const transcription = parsed.text?.trim() ?? "";
    if (!transcription) {
      return NextResponse.json(
        { error: "No speech detected. Try recording again." },
        { status: 422 },
      );
    }

    return NextResponse.json({ transcription });
  } catch (error) {
    console.error("Whisper transcription error:", error);

    const message =
      error instanceof Error
        ? error.message.includes("ENOENT")
          ? "Python is not available. Install Python and run: pip install openai-whisper"
          : error.message
        : "Transcription failed. Please try again.";

    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}
