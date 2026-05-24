"use client";

import { useMemo, useRef, useState } from "react";
import { FileText, Loader2, Download, Upload, FileUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClinicalNoteMarkdown } from "@/components/clinical-note-markdown";
import { DictationRecorder } from "@/components/dictation-recorder";
import {
  PatientSearchCombobox,
  type PatientDatabaseEntry,
} from "@/components/patient-search-combobox";
import { extractPatientNameFromChart } from "@/lib/extract-patient-name";
import {
  assignFileToInput,
  readPatientFile,
} from "@/lib/process-patient-file";
import { SAMPLE_PATIENTS } from "@/lib/sample-patients";

function toDatabaseEntry(
  patient: (typeof SAMPLE_PATIENTS)[number],
): PatientDatabaseEntry {
  return { ...patient, source: "database" };
}

export function DocumentationForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadCacheRef = useRef<Map<string, File>>(new Map());

  const [registry, setRegistry] = useState<PatientDatabaseEntry[]>(() =>
    SAMPLE_PATIENTS.map(toDatabaseEntry),
  );
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientData, setPatientData] = useState("");
  const [patientFileName, setPatientFileName] = useState<string | null>(null);
  const [loadingPatientId, setLoadingPatientId] = useState<string | null>(null);
  const [dictation, setDictation] = useState("");
  const [clinicalNote, setClinicalNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sortedRegistry = useMemo(
    () => [...registry].sort((a, b) => a.name.localeCompare(b.name)),
    [registry],
  );

  async function applyPatientFile(
    file: File,
    patientId: string,
    fileName: string,
  ) {
    const result = await readPatientFile(file);

    if (!result.ok) {
      setError(result.error);
      setPatientData("");
      setPatientFileName(null);
      setSelectedPatientId(null);
      return;
    }

    setPatientData(result.text);
    setPatientFileName(fileName);
    setSelectedPatientId(patientId);
    setError(null);
    setClinicalNote("");
    uploadCacheRef.current.set(patientId, file);
    assignFileToInput(fileInputRef.current, file);
  }

  async function loadPatientFromRegistry(patient: PatientDatabaseEntry) {
    setLoadingPatientId(patient.id);
    setError(null);

    try {
      const cached = uploadCacheRef.current.get(patient.id);
      if (cached) {
        await applyPatientFile(cached, patient.id, patient.fileName);
        return;
      }

      const response = await fetch(patient.fileUrl);
      if (!response.ok) throw new Error("Failed to fetch patient chart");

      const blob = await response.blob();
      const file = new File([blob], patient.fileName, { type: "text/plain" });
      await applyPatientFile(file, patient.id, patient.fileName);
    } catch {
      setError(`Could not load chart for ${patient.name}.`);
      setSelectedPatientId(null);
    } finally {
      setLoadingPatientId(null);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoadingPatientId("upload");
    setError(null);

    const result = await readPatientFile(file);
    if (!result.ok) {
      setError(result.error);
      setLoadingPatientId(null);
      return;
    }

    const existing = registry.find((p) => p.fileName === file.name);
    if (existing) {
      await applyPatientFile(file, existing.id, file.name);
      setLoadingPatientId(null);
      return;
    }

    const extractedName = extractPatientNameFromChart(result.text);
    const id = `upload-${Date.now()}`;
    const entry: PatientDatabaseEntry = {
      id,
      name: extractedName ?? file.name.replace(/\.txt$/i, ""),
      specialty: "Uploaded chart",
      fileName: file.name,
      fileUrl: "",
      source: "upload",
    };

    setRegistry((prev) => [...prev, entry]);
    await applyPatientFile(file, id, file.name);
    setLoadingPatientId(null);
  }

  async function handleGenerate() {
    setError(null);
    setClinicalNote("");

    if (!patientData.trim()) {
      setError("Please select or upload a patient record first.");
      return;
    }
    if (!dictation.trim()) {
      setError("Please record or enter your dictation first.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientData, dictation }),
      });

      const data = (await response.json()) as {
        clinicalNote?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setClinicalNote(data.clinicalNote ?? "");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleDownload() {
    if (!clinicalNote) return;
    const blob = new Blob([clinicalNote], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `clinical_note_${patientFileName ?? "note"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="glass-card border-primary/15 shadow-lg shadow-primary/5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              1
            </span>
            <div>
              <CardTitle className="text-base font-semibold">Patient record</CardTitle>
              <CardDescription>
                Search the clinic registry or upload a new chart (.txt)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PatientSearchCombobox
            patients={sortedRegistry}
            value={selectedPatientId}
            onSelect={loadPatientFromRegistry}
            loading={loadingPatientId !== null && loadingPatientId !== "upload"}
            disabled={loadingPatientId === "upload"}
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              className="sr-only"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 bg-background/80 shadow-sm"
              disabled={loadingPatientId !== null}
              onClick={() => fileInputRef.current?.click()}
            >
              {loadingPatientId === "upload" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <FileUp className="size-4" />
                  Upload new patient
                </>
              )}
            </Button>
          </div>

          {patientFileName ? (
            <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/[0.04] px-3 py-2 text-xs">
              <Upload className="size-3.5 text-primary" />
              <span className="text-muted-foreground">Chart loaded:</span>
              <span className="font-medium text-foreground">{patientFileName}</span>
            </div>
          ) : null}

          {patientData ? (
            <details className="group rounded-xl border border-border/60 bg-background/50 px-4 py-3 text-sm backdrop-blur-sm">
              <summary className="cursor-pointer font-medium text-muted-foreground group-open:mb-3 group-open:text-foreground">
                Preview record
              </summary>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/90">
                {patientData}
              </pre>
            </details>
          ) : null}
        </CardContent>
      </Card>

      <Card className="glass-card border-primary/15 shadow-lg shadow-primary/5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              2
            </span>
            <div>
              <CardTitle className="text-base font-semibold">Voice dictation</CardTitle>
              <CardDescription>
                Record visit notes — vocabulary tuned to the selected chart
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DictationRecorder
            value={dictation}
            onChange={setDictation}
            onError={setError}
            patientData={patientData}
            disabled={isLoading}
          />
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive" className="glass-card">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="h-12 w-full text-base shadow-lg shadow-primary/25"
        disabled={isLoading}
        onClick={handleGenerate}
      >
        {isLoading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Generating clinical note…
          </>
        ) : (
          <>
            <FileText className="size-4" />
            Generate clinical note
          </>
        )}
      </Button>

      {clinicalNote ? (
        <Card className="glass-card border-primary/25 shadow-xl shadow-primary/10">
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-base font-semibold">Clinical note</CardTitle>
              <CardDescription>SOAP-format documentation</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
              <Download className="size-4" />
              Download
            </Button>
          </CardHeader>
          <CardContent>
            <ClinicalNoteMarkdown content={clinicalNote} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
