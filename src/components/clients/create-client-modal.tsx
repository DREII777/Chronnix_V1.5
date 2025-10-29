"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { EditableClientProfile } from "@/components/clients/edit-client-modal";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/toast-provider";

const DEFAULT_FORM = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

type Props = {
  open: boolean;
  onClose: () => void;
  defaultValues?: Partial<typeof DEFAULT_FORM>;
  onCreated?: (profile: EditableClientProfile) => void;
};

export function CreateClientModal({ open, onClose, defaultValues, onCreated }: Props) {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ ...DEFAULT_FORM, ...defaultValues });
      setError(null);
    }
  }, [defaultValues, open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: form.name.trim(),
        contactName: form.contactName.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      if (!payload.name) {
        throw new Error("Le nom du client est requis");
      }

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible de créer le client");
      }

      const data = (await response.json()) as { profile?: EditableClientProfile };
      onClose();
      push({ title: "Client créé", description: payload.name, variant: "success" });
      if (onCreated && data.profile) {
        onCreated(data.profile);
      } else {
        router.refresh();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inattendue");
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
          title="Nouveau client"
          description="Renseignez les informations essentielles du client."
        />
        <DialogBody>
          <form id="create-client-form" className="grid gap-4" onSubmit={handleSubmit}>
            <Field
              label="Nom du client"
              value={form.name}
              onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
              required
              autoFocus
            />
            <Field
              label="Interlocuteur"
              value={form.contactName}
              onChange={(value) => setForm((prev) => ({ ...prev, contactName: value }))}
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
            />
            <Field
              label="Téléphone"
              value={form.phone}
              onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
            />
            <Field
              label="Adresse"
              value={form.address}
              onChange={(value) => setForm((prev) => ({ ...prev, address: value }))}
            />
            <TextareaField
              label="Notes"
              value={form.notes}
              onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" form="create-client-form" disabled={submitting}>
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Création...
              </span>
            ) : (
              "Créer le client"
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
  required?: boolean;
  autoFocus?: boolean;
};

function Field({ label, value, onChange, type = "text", required, autoFocus }: FieldProps) {
  return (
    <label className="space-y-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        autoFocus={autoFocus}
      />
    </label>
  );
}

type TextareaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function TextareaField({ label, value, onChange }: TextareaFieldProps) {
  return (
    <label className="space-y-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} />
    </label>
  );
}
