/** Normalize common LLM markdown quirks before rendering */
export function normalizeClinicalNoteMarkdown(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}(?=[^\s#])/gm, (match) => `${match} `)
    .replace(/\*\*([^*\n]+)\*\*/g, "**$1**")
    .trim();
}
