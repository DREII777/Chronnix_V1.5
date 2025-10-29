"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast-provider";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultClientName?: string;
  onCreated?: (projectId: number | null) => void;
};

type FormState = {
  name: string;
  clientName: string;
  billingRate: string;
  defaultHours: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  clientName: "",
  billingRate: "",
  defaultHours: "8",
};

export function CreateProjectModal({ open, onClose, defaultClientName, onCreated }: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientLocked = Boolean(defaultClientName);

  useEffect(() => {
    if (open) {
      setForm({ ...DEFAULT_FORM, clientName: defaultClientName ?? "" });
      setError(null);
    }
  }, [defaultClientName, open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
      };

      if (!payload.name) {
        throw new Error("Le nom du chantier est requis");
      }

      if (clientLocked) {
        payload.clientName = defaultClientName?.trim() ?? "";
      } else if (form.clientName.trim()) {
        payload.clientName = form.clientName.trim();
      }
      if (form.billingRate.trim()) {
        payload.billingRate = Number(form.billingRate);
      }
      if (form.defaultHours.trim()) {
        payload.defaultHours = Number(form.defaultHours);
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible de créer le chantier");
      }

      const data = await response.json();
      const projectId = data.project?.id;

      onClose();
      push({
        title: "Chantier créé",
        description: form.name.trim() || undefined,
        variant: "success",
      });
      if (onCreated) {
        onCreated(projectId ?? null);
      } else if (projectId) {
        router.push(`/timesheets?projectId=${projectId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? handleClose() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader
          title="Nouveau chantier"
          description="Définissez les informations de base. Vous pourrez compléter le reste plus tard."
        />
        <DialogBody>
          <form id="create-project-form" className="space-y-4" onSubmit={handleSubmit}>
            {clientLocked ? (
              <ReadOnlyField label="Client" value={defaultClientName ?? ""} />
            ) : (
              <Field
                label="Client (optionnel)"
                value={form.clientName}
                onChange={(value) => setForm((prev) => ({ ...prev, clientName: value }))}
              />
            )}
            <Field
              label="Nom du chantier"
              value={form.name}
              onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
              required
              autoFocus={!clientLocked}
            />
            <Field
              label="Taux de facturation (€)"
              type="number"
              min="0"
              step="0.01"
              value={form.billingRate}
              onChange={(value) => setForm((prev) => ({ ...prev, billingRate: value }))}
            />
            <Field
              label="Heures par défaut"
              type="number"
              min="0"
              step="0.25"
              value={form.defaultHours}
              onChange={(value) => setForm((prev) => ({ ...prev, defaultHours: value }))}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" form="create-project-form" disabled={submitting}>
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Création...
              </span>
            ) : (
              "Créer le chantier"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoFocus?: boolean;
  required?: boolean;
  min?: string;
  step?: string;
};

function Field({ label, value, onChange, type = "text", autoFocus, required, min, step }: FieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoFocus={autoFocus}
        required={required}
        min={min}
        step={step}
      />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
        {value}
      </div>
    </div>
  );
}
