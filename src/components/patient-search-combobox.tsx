"use client";

import { useState } from "react";
import { ChevronsUpDown, Loader2, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { SamplePatient } from "@/lib/sample-patients";

export type PatientDatabaseEntry = SamplePatient & {
  source: "database" | "upload";
};

type PatientSearchComboboxProps = {
  patients: PatientDatabaseEntry[];
  value: string | null;
  onSelect: (patient: PatientDatabaseEntry) => void;
  loading?: boolean;
  disabled?: boolean;
};

export function PatientSearchCombobox({
  patients,
  value,
  onSelect,
  loading = false,
  disabled = false,
}: PatientSearchComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = patients.find((p) => p.id === value);

  return (
    <div className="space-y-2">
      <Label htmlFor="patient-search">Patient database</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id="patient-search"
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled || loading}
              className="h-11 w-full justify-between bg-background/80 font-normal shadow-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading chart…
                </span>
              ) : selected ? (
                <span className="flex items-center gap-2 truncate">
                  <UserRound className="size-4 shrink-0 text-primary" />
                  <span className="truncate">{selected.name}</span>
                  <Badge variant="secondary" className="ml-1 hidden sm:inline-flex">
                    {selected.specialty}
                  </Badge>
                </span>
              ) : (
                <span className="text-muted-foreground">Search or select a patient…</span>
              )}
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Type patient name…" />
            <CommandList>
              <CommandEmpty>No patients found.</CommandEmpty>
              <CommandGroup heading="Clinic registry">
                {patients.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={`${patient.name} ${patient.specialty} ${patient.fileName}`}
                    onSelect={() => {
                      onSelect(patient);
                      setOpen(false);
                    }}
                    className={cn(value === patient.id && "bg-primary/5")}
                  >
                    <UserRound className="size-4 text-primary/70" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{patient.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {patient.specialty}
                      </span>
                    </div>
                    {patient.source === "upload" ? (
                      <Badge variant="outline" className="text-[10px]">
                        Uploaded
                      </Badge>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
