export function extractPatientNameFromChart(text: string): string | null {
  const match = text.match(/Patient Name:\s*(.+)/i);
  return match?.[1]?.trim() ?? null;
}
