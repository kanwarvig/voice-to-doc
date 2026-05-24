export function buildClinicalNotePrompt(patientData: string, dictation: string): string {
  return `You are a medical documentation assistant. Using the physician's dictation and the patient's existing record, generate a complete, structured clinical note in SOAP format.

PATIENT RECORD:
${patientData}

PHYSICIAN DICTATION:
${dictation}

Generate a complete clinical note with the following sections:
- Date of Visit
- Subjective (patient complaints and history)
- Objective (vitals, observations, test results)
- Assessment (diagnosis and clinical impression)
- Plan (treatment, medications, follow-up)
- Physician Sign-off line

Format the note in Markdown:
- Use ## for each major section header (e.g. ## Subjective)
- Use **bold** for field labels within sections (e.g. **Chief Complaint:**)
- Use bullet lists where appropriate

Keep it professional, concise, and medically accurate based on the information provided.`;
}
