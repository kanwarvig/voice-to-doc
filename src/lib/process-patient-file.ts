export type PatientFileResult =
  | { ok: true; text: string; fileName: string }
  | { ok: false; error: string };

export async function readPatientFile(file: File): Promise<PatientFileResult> {
  if (!file.name.toLowerCase().endsWith(".txt") && file.type !== "text/plain") {
    return { ok: false, error: "Please upload a plain-text patient chart (.txt)." };
  }

  try {
    const text = await file.text();
    if (!text.trim()) {
      return { ok: false, error: "The uploaded file is empty." };
    }
    return { ok: true, text, fileName: file.name };
  } catch {
    return { ok: false, error: "Could not read the patient record file." };
  }
}

export function assignFileToInput(input: HTMLInputElement | null, file: File) {
  if (!input) return;
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  input.files = dataTransfer.files;
}
