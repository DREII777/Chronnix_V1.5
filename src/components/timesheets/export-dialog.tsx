"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ExportKind = "payroll" | "detail" | "global";

type ExportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedKind: ExportKind;
  onSelectKind: (kind: ExportKind) => void;
  applyPrintSetup: boolean;
  onTogglePrintSetup: (next: boolean) => void;
  applyColors: boolean;
  onToggleColors: (next: boolean) => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
};

const EXPORT_CHOICES: Array<{
  value: ExportKind;
  label: string;
  description: string;
}> = [
  {
    value: "payroll",
    label: "Paie",
    description: "Synthèse des heures travaillées par ouvrier avec calcul du coût total.",
  },
  {
    value: "detail",
    label: "Détail",
    description: "Tableau quotidien HH:MM avec total automatique par ouvrier et par jour.",
  },
  {
    value: "global",
    label: "Global",
    description: "Vue consolidée des heures et jours prestés pour chaque ouvrier.",
  },
];

export function ExportDialog({
  open,
  onOpenChange,
  selectedKind,
  onSelectKind,
  applyPrintSetup,
  onTogglePrintSetup,
  applyColors,
  onToggleColors,
  onConfirm,
  confirmDisabled,
}: ExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent maxWidth="max-w-xl">
        <DialogHeader
          title="Exporter les pointages"
          description="Choisissez le format et les options de mise en page avant de télécharger."
        />
        <DialogBody className="space-y-6">
          <section className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Format</p>
            <div className="space-y-2">
              {EXPORT_CHOICES.map((choice) => (
                <label
                  key={choice.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition",
                    selectedKind === choice.value
                      ? "border-sky-300 bg-sky-50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <input
                    type="radio"
                    name="export-kind"
                    value={choice.value}
                    checked={selectedKind === choice.value}
                    onChange={() => onSelectKind(choice.value)}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-800">{choice.label}</p>
                    <p className="text-xs text-slate-500">{choice.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-sm font-semibold text-slate-700">Options</p>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={applyPrintSetup}
                  onChange={(event) => onTogglePrintSetup(event.target.checked)}
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-800">Mise en page 1 page</p>
                  <p className="text-xs text-slate-500">
                    Ajuste les marges, l&apos;orientation paysage et cadre l&apos;impression sur une page.
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50">
                <input type="checkbox" checked={applyColors} onChange={(event) => onToggleColors(event.target.checked)} />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-800">Couleurs & zébrage</p>
                  <p className="text-xs text-slate-500">
                    Applique un en-tête bleu et un fond alterné pour faciliter la lecture à l&apos;écran.
                  </p>
                </div>
              </label>
            </div>
          </section>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onConfirm} disabled={confirmDisabled}>
            Télécharger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

