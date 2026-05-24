import { DocumentationForm } from "@/components/documentation-form";
import {
  ClipboardPenLine,
  FileText,
  Mic,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";

const FEATURE_BADGES = [
  {
    icon: ShieldCheck,
    label: "HIPAA-aware workflow",
    detail: "Files processed locally",
  },
  {
    icon: Sparkles,
    label: "Medical vocabulary",
    detail: "Chart-aware transcription",
  },
  {
    icon: FileText,
    label: "SOAP generation",
    detail: "Claude-powered notes",
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: 1,
    icon: Search,
    title: "Select a patient",
    description:
      "Search the clinic registry or upload a chart file to load the patient record.",
  },
  {
    step: 2,
    icon: Mic,
    title: "Record dictation",
    description:
      "Speak your visit notes — Whisper transcribes with medical vocabulary from the chart.",
  },
  {
    step: 3,
    icon: Sparkles,
    title: "Generate the note",
    description:
      "Claude builds a structured SOAP note from the chart and your dictation.",
  },
  {
    step: 4,
    icon: Upload,
    title: "Review and download",
    description:
      "Edit the transcript if needed, then download the formatted clinical note.",
  },
] as const;

export default function Home() {
  return (
    <div className="relative min-h-full">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[url('/bg-clinical.svg')] bg-cover bg-center bg-no-repeat"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-background/20 via-background/60 to-background/90"
      />

      <header className="border-b border-primary/10 bg-background/55 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-6 px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
                <ClipboardPenLine className="size-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/90">
                Clinical workspace
              </p>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Voice to <span className="text-primary">Doc</span>
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Search your patient registry, upload charts, dictate visits, and generate
              structured SOAP notes — built for real clinic workflows.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {FEATURE_BADGES.map(({ icon: Icon, label, detail }) => (
            <div
              key={label}
              className="group flex items-start gap-3 rounded-xl border border-primary/10 bg-card/70 px-4 py-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:bg-card/90 hover:shadow-md"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-primary transition-colors duration-200 group-hover:text-primary/90" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <DocumentationForm />

        <section className="mt-14 border-t border-primary/10 pt-10">
          <div className="mb-6 flex items-center gap-2">
            <UserRound className="size-4 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">How it works</h2>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2">
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, description }) => (
              <li
                key={step}
                className="flex gap-3 rounded-xl border border-primary/10 bg-card/60 p-4 backdrop-blur-sm transition-all duration-200 hover:border-primary/20 hover:bg-card/80"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    <span className="mr-1.5 text-primary">{step}.</span>
                    {title}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-3xl px-4 py-10 text-center text-xs text-muted-foreground sm:px-6">
        Built by Kanwar Vig — Voice-to-Documentation AI · May 2026
      </footer>
    </div>
  );
}
