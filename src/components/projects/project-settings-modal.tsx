"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ProjectSettings = {
  id: number;
  name: string;
  clientName: string | null;
  billingRate: number | null;
  defaultHours: number | null;
  archived: boolean;
};

type FormState = {
  name: string;
  billingRate: string;
  defaultHours: string;
  archived: boolean;
};

type Props = {
  project: ProjectSettings | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (project: ProjectSettings) => void;
};

const EMPTY_FORM: FormState = {
  name: "",
  billingRate: "",
  defaultHours: "",
  archived: false,
};

export function ProjectSettingsModal({ project, open, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !project) return;
    setForm({
      name: project.name,
      billingRate: project.billingRate !== null ? String(project.billingRate) : "",
      defaultHours: project.defaultHours !== null ? String(project.defaultHours) : "",
      archived: project.archived,
    });
    setError(null);
  }, [open, project]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!project || saving) return;

    const name = form.name.trim();
    if (!name) {
      setError("Le nom du chantier est requis");
      return;
    }

    const payload: Record<string, unknown> = {
      name,
      archived: form.archived,
    };

    payload.billingRate = form.billingRate.trim() ? Number(form.billingRate) : null;
    payload.defaultHours = form.defaultHours.trim() ? Number(form.defaultHours) : null;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible de mettre à jour le chantier");
      }
      const { project: updated } = (await response.json()) as {
        project: {
          id: number;
          name: string;
          clientName: string | null;
          billingRate: number | null;
          defaultHours: number | null;
          archived: boolean;
        };
      };
      onSaved?.({
        id: updated.id,
        name: updated.name,
        clientName: updated.clientName,
        billingRate: updated.billingRate === null ? null : Number(updated.billingRate),
        defaultHours: updated.defaultHours === null ? null : Number(updated.defaultHours),
        archived: updated.archived,
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <Dialog open={open && Boolean(project)} onOpenChange={(value) => (!value ? handleClose() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader
          title="Paramètres du chantier"
          description={project?.clientName ? `Client · ${project.clientName}` : "Ajustez les paramètres du chantier."}
        />
        <DialogBody>
          <form id="project-settings-form" className="grid gap-4" onSubmit={handleSubmit}>
            <Field
              label="Nom du chantier"
              value={form.name}
              onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
              required
              autoFocus
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
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={form.archived}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, archived: event.target.checked }))
                }
              />
              Archiver ce chantier
            </label>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="submit" form="project-settings-form" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoFocus,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoFocus?: boolean;
  min?: string;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        autoFocus={autoFocus}
        min={min}
        step={step}
      />
    </label>
  );
}
