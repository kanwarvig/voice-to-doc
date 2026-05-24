"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type DictationRecorderProps = {
  value: string;
  onChange: (text: string) => void;
  onError: (message: string | null) => void;
  patientData?: string;
  disabled?: boolean;
};

export function DictationRecorder({
  value,
  onChange,
  onError,
  patientData = "",
  disabled = false,
}: DictationRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      cleanupStream();
      if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    };
  }, [cleanupStream, recordingUrl]);

  async function transcribeAudio(blob: Blob) {
    setIsTranscribing(true);
    onError(null);

    const formData = new FormData();
    formData.append("audio", blob, `dictation.${blob.type.includes("webm") ? "webm" : "wav"}`);
    if (patientData.trim()) {
      formData.append("patientData", patientData);
    }

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        transcription?: string;
        error?: string;
      };

      if (!response.ok) {
        onError(data.error ?? "Transcription failed.");
        return;
      }

      onChange(data.transcription ?? "");
    } catch {
      onError("Could not reach the transcription service.");
    } finally {
      setIsTranscribing(false);
    }
  }

  async function startRecording() {
    onError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        cleanupStream();
        const blob = new Blob(chunksRef.current, { type: mimeType });

        if (recordingUrl) URL.revokeObjectURL(recordingUrl);
        setRecordingUrl(URL.createObjectURL(blob));

        await transcribeAudio(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      onError("Microphone access denied or unavailable.");
      cleanupStream();
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") {
      recorder.stop();
    }
    setIsRecording(false);
  }

  const busy = disabled || isTranscribing;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {!isRecording ? (
          <Button
            type="button"
            variant={isTranscribing ? "outline" : "default"}
            className="gap-2 shadow-sm shadow-primary/15"
            disabled={busy}
            onClick={startRecording}
          >
            {isTranscribing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Transcribing… (first run may take 1–2 min)
              </>
            ) : (
              <>
                <Mic className="size-4" />
                Record dictation
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            className="gap-2"
            onClick={stopRecording}
          >
            <Square className="size-3.5 fill-current" />
            Stop recording
          </Button>
        )}

        {isRecording ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-destructive" />
            </span>
            Listening…
          </span>
        ) : null}
      </div>

      {recordingUrl ? (
        <audio controls src={recordingUrl} className="w-full" />
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="dictation">Transcript</Label>
        <Textarea
          id="dictation"
          placeholder="Record your visit notes, or edit the transcript here."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={6}
          className="min-h-[140px] resize-y"
          disabled={busy && !value}
        />
        <p className="text-xs text-muted-foreground">
          Upload the patient chart first — medications like atorvastatin are pulled from the
          record and auto-corrected after transcription. You can still edit the transcript.
        </p>
      </div>
    </div>
  );
}
