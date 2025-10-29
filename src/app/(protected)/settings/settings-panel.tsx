"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Hint } from "@/components/hint";

const LOCALE_OPTIONS = [
  { value: "fr-BE", label: "Français (Belgique)" },
  { value: "nl-BE", label: "Néerlandais (Belgique)" },
  { value: "fr-FR", label: "Français (France)" },
  { value: "en-GB", label: "English (UK)" },
];

const TIMEZONE_OPTIONS = [
  "Europe/Brussels",
  "Europe/Paris",
  "Europe/Amsterdam",
  "UTC",
];

type Settings = {
  id: number;
  bceFileName: string | null;
  bceFileUrl: string | null;
  validUntil: string | null;
  verified: boolean;
} | null;

type Account = {
  id: number;
  name: string;
  primaryEmail: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
  locale: string;
  timezone: string;
} | null;

type Props = {
  settings: Settings;
  account: Account;
};

export default function SettingsPanel({ settings, account }: Props) {
  const [companyState, setCompanyState] = useState(settings);
  const [file, setFile] = useState<File | null>(null);
  const [validUntil, setValidUntil] = useState(settings?.validUntil ?? "");
  const [verified, setVerified] = useState(settings?.verified ?? false);
  const [activeTab, setActiveTab] = useState<"account" | "bce" | "notifications" | "integrations">("account");

  const [accountState, setAccountState] = useState(() =>
    account ?? {
      id: 0,
      name: "",
      primaryEmail: "",
      phone: "",
      addressLine1: "",
      addressLine2: "",
      postalCode: "",
      city: "",
      country: "",
      locale: "fr-BE",
      timezone: "Europe/Brussels",
    },
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const bceStatus = useMemo(() => {
    if (!companyState?.bceFileUrl) return { label: "BCE manquante", variant: "warning" as const };
    if (!companyState.verified) return { label: "BCE à valider", variant: "warning" as const };
    if (companyState.validUntil && new Date(companyState.validUntil) < new Date()) {
      return { label: "BCE expirée", variant: "warning" as const };
    }
    return { label: "BCE valide", variant: "success" as const };
  }, [companyState]);

  const uploadBce = async () => {
    if (!file) {
      setStatusMessage("Sélectionnez un fichier BCE avant d'enregistrer");
      return;
    }

    setStatusMessage("Envoi du document BCE...");
    const formData = new FormData();
    formData.set("file", file);
    if (validUntil) formData.set("validUntil", validUntil);
    formData.set("verified", String(verified));

    try {
      const response = await fetch("/api/company/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const { settings: nextSettings } = await response.json();
      setCompanyState(nextSettings);
      setValidUntil(nextSettings?.validUntil ?? "");
      setVerified(nextSettings?.verified ?? false);
      setFile(null);
      setStatusMessage("Document BCE mis à jour");
    } catch (error) {
      console.error(error);
      setStatusMessage("Impossible de mettre à jour la BCE");
    }
  };

  const saveAccount = async () => {
    setStatusMessage("Sauvegarde des paramètres du compte...");
    try {
      const response = await fetch("/api/account/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountState),
      });
      if (!response.ok) throw new Error("Update failed");
      const { account: nextAccount } = await response.json();
      setAccountState((prev) => ({ ...prev, ...nextAccount }));
      setStatusMessage("Paramètres du compte enregistrés");
    } catch (error) {
      console.error(error);
      setStatusMessage("Impossible de sauvegarder les paramètres du compte");
    }
  };

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "account" | "bce" | "notifications" | "integrations")}
        className="space-y-6"
      >
        <TabsList className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
          <TabsTrigger value="account">Compte</TabsTrigger>
          <TabsTrigger value="bce">BCE</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Intégrations</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-semibold text-slate-900">Identité</CardTitle>
              <CardDescription>
                Ces informations alimentent vos exports et sont visibles par les équipes Chronnix.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <StatBlock label="Nom" value={accountState.name || "—"} />
              <StatBlock label="Email" value={accountState.primaryEmail || "—"} />
              <StatBlock label="Fuseau horaire" value={accountState.timezone} />
              <StatBlock label="Langue" value={accountState.locale} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900">Mettre à jour les coordonnées</CardTitle>
              <CardDescription>Modifiez les informations qui apparaîtront sur vos exports et bulletins.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Nom" value={accountState.name} onChange={(value) => setAccountState((prev) => ({ ...prev, name: value }))} />
              <Field label="Email principal" value={accountState.primaryEmail} onChange={(value) => setAccountState((prev) => ({ ...prev, primaryEmail: value }))} />
              <Field label="Téléphone" value={accountState.phone} onChange={(value) => setAccountState((prev) => ({ ...prev, phone: value }))} />
              <div className="space-y-2 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fuseau horaire</span>
                <Select
                  value={accountState.timezone}
                  onChange={(event) => setAccountState((prev) => ({ ...prev, timezone: event.target.value }))}
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Langue par défaut</span>
                <Select
                  value={accountState.locale}
                  onChange={(event) => setAccountState((prev) => ({ ...prev, locale: event.target.value }))}
                >
                  {LOCALE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <Field label="Adresse" value={accountState.addressLine1} onChange={(value) => setAccountState((prev) => ({ ...prev, addressLine1: value }))} />
              <Field label="Complément" value={accountState.addressLine2} onChange={(value) => setAccountState((prev) => ({ ...prev, addressLine2: value }))} />
              <Field label="Code postal" value={accountState.postalCode} onChange={(value) => setAccountState((prev) => ({ ...prev, postalCode: value }))} />
              <Field label="Ville" value={accountState.city} onChange={(value) => setAccountState((prev) => ({ ...prev, city: value }))} />
              <Field label="Pays" value={accountState.country} onChange={(value) => setAccountState((prev) => ({ ...prev, country: value }))} />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={saveAccount}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="bce">
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-slate-900">Conformité BCE</CardTitle>
                  <CardDescription>Maintenez votre dossier BCE à jour pour sécuriser vos exports paie.</CardDescription>
                </div>
                <Badge variant={bceStatus.variant}>{bceStatus.label}</Badge>
              </div>
              <Hint label="Pensez à renouveler le document avant expiration" />
            </CardHeader>
            <CardContent className="space-y-4">
              {companyState?.bceFileName ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Document actuel : {companyState.bceFileName}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Aucun document BCE importé pour le moment.
                </div>
              )}
              <Separator />
              <div className="grid gap-4 md:grid-cols-[1fr,180px]">
                <div className="flex flex-col gap-3">
                  <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="text-sm" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2 text-sm">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Validité</span>
                      <Input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
                    </div>
                    <label className="mt-6 inline-flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={verified}
                        onChange={(event) => setVerified(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Document vérifié
                    </label>
                  </div>
                </div>
                <div className="flex items-end">
                  <Button onClick={uploadBce} disabled={!file} className="w-full">
                    {file ? "Téléverser" : "Choisir un fichier"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900">Notifications & alertes</CardTitle>
              <CardDescription>Paramétrez les rappels liés au pointage, aux absences et à la conformité.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <p>
                Les notifications email et Slack arrivent bientôt. Définissez ci-dessous vos préférences souhaitées
                pour préparer l&apos;activation.
              </p>
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span>Alertes de conformité BCE</span>
                  <Badge variant="secondary">À venir</Badge>
                </label>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span>Relance d&apos;absences quotidiennes</span>
                  <Badge variant="secondary">À venir</Badge>
                </label>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span>Notifications exports</span>
                  <Badge variant="secondary">À venir</Badge>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-slate-900">Intégrations</CardTitle>
              <CardDescription>
                Synchronisez Chronnix avec vos outils de paie ou de comptabilité. Indiquez vos priorités.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <p>
                Les connecteurs vers Partena, SD Worx et Exact Online sont en préparation. Dites-nous quels flux sont
                essentiels afin de prioriser leur mise à disposition.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">Paie</p>
                  <p className="text-xs text-slate-500">Exports vers Partena, SD Worx, Securex.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">Comptabilité</p>
                  <p className="text-xs text-slate-500">Exports pour Exact Online et Odoo.</p>
                </div>
              </div>
              <Button variant="secondary" disabled>
                S&apos;inscrire à la bêta
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {statusMessage && (
        <Card>
          <CardContent className="text-sm text-slate-600">{statusMessage}</CardContent>
        </Card>
      )}
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function Field({ label, value, onChange }: FieldProps) {
  return (
    <label className="space-y-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

type StatBlockProps = {
  label: string;
  value: string;
};

function StatBlock({ label, value }: StatBlockProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}
