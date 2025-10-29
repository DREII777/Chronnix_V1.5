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

export type EditableClientProfile = {
  id: number;
  name: string;
  slug: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  profile: EditableClientProfile | null;
  onUpdated?: (profile: EditableClientProfile) => void;
};

export function EditClientModal({ open, onClose, profile, onUpdated }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        name: profile?.name ?? "",
        contactName: profile?.contactName ?? "",
        email: profile?.email ?? "",
        phone: profile?.phone ?? "",
        address: profile?.address ?? "",
      });
      setError(null);
    }
  }, [open, profile]);

  if (!profile) {
    return null;
  }

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
      };

      if (!payload.name) {
        throw new Error("Le nom du client est requis");
      }

      const response = await fetch(`/api/clients/${profile.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible de mettre à jour le client");
      }

      const { profile: updatedProfile, slug } = (await response.json()) as {
        profile: EditableClientProfile;
        slug: string;
      };

      onClose();
      onUpdated?.(updatedProfile);
      if (slug !== profile.slug) {
        router.replace(`/clients/${slug}`);
        router.refresh();
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
          title={`Modifier ${profile.name}`}
          description="Mettez à jour les informations du client."
        />
        <DialogBody>
          <form id="edit-client-form" className="grid gap-4" onSubmit={handleSubmit}>
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
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" form="edit-client-form" disabled={submitting}>
            {submitting ? "Enregistrement..." : "Enregistrer"}
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
