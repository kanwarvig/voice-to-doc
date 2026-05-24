import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeClinicalNoteMarkdown } from "@/lib/normalize-markdown";

type ClinicalNoteMarkdownProps = {
  content: string;
};

export function ClinicalNoteMarkdown({ content }: ClinicalNoteMarkdownProps) {
  const normalized = normalizeClinicalNoteMarkdown(content);

  return (
    <div className="clinical-note rounded-lg border border-primary/10 bg-muted/40 px-5 py-4 text-sm leading-relaxed text-foreground/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-3 text-lg font-semibold tracking-tight text-foreground">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 border-b border-primary/15 pb-1.5 text-base font-semibold text-primary first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-sm font-semibold text-foreground">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          hr: () => <hr className="my-4 border-primary/10" />,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
