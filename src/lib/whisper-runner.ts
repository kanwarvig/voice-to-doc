import { spawn } from "child_process";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { WhisperMedicalContext } from "@/lib/medical-vocabulary";

const TRANSCRIBE_TIMEOUT_MS = 300_000;

function resolveFfmpegPath(): string | null {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const candidates = [
    "C:\\ffmpeg\\ffmpeg-master-latest-win64-gpl-shared\\bin",
    "C:\\ffmpeg\\bin",
  ];

  for (const candidate of candidates) {
    const exe = join(candidate, "ffmpeg.exe");
    if (existsSync(exe)) return candidate;
  }

  return null;
}

function buildPathEnv(contextFile?: string): NodeJS.ProcessEnv {
  const ffmpegPath = resolveFfmpegPath();
  const basePath = process.env.PATH ?? process.env.Path ?? "";

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PYTHONUNBUFFERED: "1",
  };

  if (contextFile) {
    env.WHISPER_CONTEXT_FILE = contextFile;
  }

  if (!ffmpegPath) return env;

  const separator = process.platform === "win32" ? ";" : ":";
  env.PATH = `${ffmpegPath}${separator}${basePath}`;
  return env;
}

function parseStdout(stdout: string): { text?: string; error?: string } {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error("Whisper produced no output.");
  }

  try {
    return JSON.parse(trimmed) as { text?: string; error?: string };
  } catch {
    const jsonLine = trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("{") && line.endsWith("}"))
      .at(-1);

    if (!jsonLine) {
      throw new Error(`Whisper returned invalid output: ${trimmed.slice(0, 200)}`);
    }

    return JSON.parse(jsonLine) as { text?: string; error?: string };
  }
}

export function runWhisperTranscription(
  audioPath: string,
  medicalContext?: WhisperMedicalContext,
): Promise<{ text?: string; error?: string }> {
  const scriptPath = join(process.cwd(), "scripts", "transcribe_audio.py");
  const python = process.env.PYTHON_PATH?.trim() || "python";

  return new Promise((resolve, reject) => {
    let contextFile: string | undefined;

    void (async () => {
      if (medicalContext) {
        contextFile = join(tmpdir(), `whisper-ctx-${randomUUID()}.json`);
        await writeFile(contextFile, JSON.stringify(medicalContext), "utf-8");
      }

      const child = spawn(python, ["-u", scriptPath, audioPath], {
        env: buildPathEnv(contextFile),
        cwd: join(process.cwd(), "scripts"),
        stdio: ["ignore", "pipe", "ignore"],
        windowsHide: true,
      });

      let stdout = "";
      let stdoutEnded = false;
      let processClosed = false;
      let exitCode: number | null = null;

      const timeout = setTimeout(() => {
        child.kill();
        if (contextFile) void unlink(contextFile).catch(() => {});
        reject(
          new Error(
            "Transcription timed out. First run may take a few minutes while Whisper downloads the model.",
          ),
        );
      }, TRANSCRIBE_TIMEOUT_MS);

      function finish() {
        if (!stdoutEnded || !processClosed) return;
        clearTimeout(timeout);
        if (contextFile) void unlink(contextFile).catch(() => {});

        try {
          const parsed = parseStdout(stdout);

          if (exitCode !== 0 || parsed.error) {
            resolve({
              error:
                parsed.error ??
                "Transcription failed. Ensure openai-whisper and ffmpeg are installed.",
            });
            return;
          }

          resolve(parsed);
        } catch (error) {
          reject(error instanceof Error ? error : new Error("Whisper returned invalid output."));
        }
      }

      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stdout.on("end", () => {
        stdoutEnded = true;
        finish();
      });

      child.on("error", (err) => {
        clearTimeout(timeout);
        if (contextFile) void unlink(contextFile).catch(() => {});
        reject(err);
      });

      child.on("close", (code) => {
        exitCode = code;
        processClosed = true;
        finish();
      });
    })().catch(reject);
  });
}
