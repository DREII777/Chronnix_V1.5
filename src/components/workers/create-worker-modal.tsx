"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { WorkerStatus } from "@prisma/client";

type Props = {
  open: boolean;
  onClose: () => void;
};

type FormState = {
  firstName: string;
  lastName: string;
  status: WorkerStatus;
  payRate: string;
  chargesAmount: string;
  vatNumber: string;
  nationalId: string;
};

const STATUS_OPTIONS: Array<{ value: WorkerStatus; label: string }> = [
  { value: WorkerStatus.SALARIE, label: "Salarié" },
  { value: WorkerStatus.INDEPENDANT, label: "Indépendant" },
  { value: WorkerStatus.ASSOCIE, label: "Associé" },
];

const DEFAULT_FORM: FormState = {
  firstName: "",
  lastName: "",
  status: WorkerStatus.SALARIE,
  payRate: "",
  chargesAmount: "",
  vatNumber: "",
  nationalId: "",
};

export function CreateWorkerModal({ open, onClose }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(DEFAULT_FORM);
      setError(null);
    }
  }, [open]);

  const handleStatusChange = (status: WorkerStatus) => {
    setForm((prev) => ({
      ...prev,
      status,
      vatNumber: status === WorkerStatus.INDEPENDANT ? prev.vatNumber : "",
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        status: form.status,
        nationalId: form.nationalId.trim(),
      };

      if (!payload.firstName || !payload.lastName) {
        throw new Error("Nom et prénom obligatoires");
      }

      if (!payload.nationalId) {
        throw new Error("Le numéro national est obligatoire");
      }

      if (!form.payRate.trim()) {
        throw new Error("Le taux horaire est requis");
      }

      payload.payRate = Number(form.payRate);
      payload.chargesPct = form.chargesAmount ? Number(form.chargesAmount) : 0;

      if (form.status === WorkerStatus.INDEPENDANT) {
        if (!form.vatNumber.trim()) {
          throw new Error("Le numéro de TVA est requis pour un indépendant");
        }
        payload.vatNumber = form.vatNumber.trim();
      }

      const response = await fetch("/api/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible de créer l'ouvrier");
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  };

  const showVat = form.status === WorkerStatus.INDEPENDANT;

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? handleClose() : undefined)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader
          title="Nouvel ouvrier"
          description="Renseignez les informations principales du profil."
        />
        <DialogBody>
          <form id="create-worker-form" className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prénom</label>
              <Input
                value={form.firstName}
                onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nom</label>
              <Input
                value={form.lastName}
                onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Statut</label>
              <Select
                value={form.status}
                onChange={(event) => handleStatusChange(event.target.value as WorkerStatus)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Numéro national
              </label>
              <Input
                value={form.nationalId}
                onChange={(event) => setForm((prev) => ({ ...prev, nationalId: event.target.value }))}
                placeholder="93.07.17-123.45"
                required
              />
            </div>
            {showVat ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Numéro de TVA
                </label>
                <Input
                  value={form.vatNumber}
                  onChange={(event) => setForm((prev) => ({ ...prev, vatNumber: event.target.value }))}
                  placeholder="BE0123456789"
                  required
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Taux horaire (€)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.payRate}
                onChange={(event) => setForm((prev) => ({ ...prev, payRate: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Charges (€)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.chargesAmount}
                onChange={(event) => setForm((prev) => ({ ...prev, chargesAmount: event.target.value }))}
                placeholder="0.00"
              />
            </div>
          </form>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" form="create-worker-form" disabled={submitting}>
            {submitting ? "Création..." : "Créer l'ouvrier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
