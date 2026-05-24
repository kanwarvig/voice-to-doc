import dictionary from "../../data/medical-dictionary.json";

const MAX_PROMPT_CHARS = 2000;
const MAX_TERMS_IN_PROMPT = 80;

type MedicalDictionary = {
  terms: string[];
  mishearings: Record<string, string>;
};

const medicalDictionary = dictionary as MedicalDictionary;

export function getMedicalTerms(): string[] {
  return medicalDictionary.terms;
}

/** Pull medication names, conditions, and labs from the uploaded chart. */
export function extractPatientTerms(patientData: string): string[] {
  const found = new Set<string>();

  const medicationLine = patientData.match(
    /(?:current medications?|medications?|meds?)\s*:\s*([^\n]+)/i,
  );
  if (medicationLine?.[1]) {
    for (const part of medicationLine[1].split(/[,;]/)) {
      const drug = extractDrugName(part);
      if (drug) found.add(drug);
    }
  }

  const historyLine = patientData.match(
    /(?:medical history|past medical history|pmh|diagnoses?|chief complaint)\s*:\s*([^\n]+)/i,
  );
  if (historyLine?.[1]) {
    for (const part of historyLine[1].split(/[,;]/)) {
      const term = cleanTerm(part);
      if (term) found.add(term);
    }
  }

  const labLine = patientData.match(/(?:recent labs?|labs?)\s*:\s*([^\n]+)/i);
  if (labLine?.[1]) {
    for (const part of labLine[1].split(/[,;]/)) {
      const term = cleanTerm(part);
      if (term) found.add(term);
    }
  }

  const drugPattern =
    /\b([A-Za-z]+(?:statin|pril|olol|sartan|pine|mycin|cillin|azole|formin|ide|tan))\b/gi;
  for (const match of patientData.matchAll(drugPattern)) {
    if (match[1]) found.add(match[1].toLowerCase());
  }

  return [...found];
}

function extractDrugName(raw: string): string {
  const match = raw.match(
    /\b([A-Za-z]+(?:statin|pril|olol|sartan|pine|mycin|cillin|azole|formin))\b/i,
  );
  if (match?.[1]) return match[1].toLowerCase();

  return cleanTerm(raw);
}

function cleanTerm(raw: string): string {
  const term = raw
    .replace(/\d+(\.\d+)?\s*(mg|mcg|g|ml|units?|mmol\/l|%)\b/gi, "")
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .toLowerCase();

  return term.length >= 3 ? term : "";
}

export type WhisperMedicalContext = {
  initial_prompt: string;
  terms: string[];
};

/** Build Whisper initial prompt + full term list for post-correction. */
export function buildWhisperMedicalContext(patientData?: string): WhisperMedicalContext {
  const patientTerms = patientData ? extractPatientTerms(patientData) : [];
  const patientMeds = patientTerms.filter(
    (t) =>
      t.endsWith("statin") ||
      t.endsWith("pril") ||
      t.endsWith("olol") ||
      t.endsWith("formin") ||
      t.endsWith("sartan") ||
      t.endsWith("pine"),
  );

  const baseTerms = medicalDictionary.terms.map((t) => t.toLowerCase());
  const allTerms = [...new Set([...patientTerms, ...baseTerms])];

  let initial_prompt: string;

  if (patientMeds.length > 0) {
    const medList = patientMeds.join(", ");
    const supportTerms = patientTerms
      .filter((t) => !patientMeds.includes(t))
      .slice(0, 15)
      .join(", ");

    initial_prompt = `Physician dictating a clinical note. The patient is on ${medList}. Spell medication names exactly: ${medList}.`;
    if (supportTerms) {
      initial_prompt += ` Chart terms: ${supportTerms}.`;
    }
    if (initial_prompt.length < MAX_PROMPT_CHARS - 200) {
      const extra = baseTerms
        .filter((t) => !allTerms.includes(t))
        .slice(0, 40)
        .join(", ");
      initial_prompt += ` Common terms: ${extra}.`;
    }
  } else {
    const promptTerms = allTerms.slice(0, MAX_TERMS_IN_PROMPT).join(", ");
    initial_prompt = `Physician clinical dictation. Medical terminology: ${promptTerms}.`;
  }

  if (initial_prompt.length > MAX_PROMPT_CHARS) {
    initial_prompt = initial_prompt.slice(0, MAX_PROMPT_CHARS - 3) + "...";
  }

  return {
    initial_prompt,
    terms: allTerms,
  };
}
