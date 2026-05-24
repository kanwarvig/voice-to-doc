import { z } from "zod";

export const generateNoteSchema = z.object({
  patientData: z.string().trim().min(1, "Patient record is required"),
  dictation: z.string().trim().min(1, "Dictation is required"),
});

export type GenerateNoteInput = z.infer<typeof generateNoteSchema>;
