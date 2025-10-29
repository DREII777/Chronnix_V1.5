"use client";

import { useMemo, useState } from "react";

const STATUS_CLASSES: Record<string, string> = {
  valid: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
};

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

export default function CompanySettingsPanel({ settings, account }: Props) {
  const [companyState, setCompanyState] = useState(settings);
  const [file, setFile] = useState<File | null>(null);
  const [validUntil, setValidUntil] = useState(settings?.validUntil ?? "");
  const [verified, setVerified] = useState(settings?.verified ?? false);

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

  const statusLabel = useMemo(() => {
    if (!companyState?.bceFileUrl) return { label: "BCE manquante", type: "warning" } as const;
    if (!companyState.verified) return { label: "BCE à valider", type: "warning" } as const;
    if (companyState.validUntil && new Date(companyState.validUntil) < new Date()) {
      return { label: "BCE expirée", type: "warning" } as const;
    }
    return { label: "BCE valide", type: "valid" } as const;
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
      <header className="rounded-lg border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-800">Paramètres du compte entreprise</h1>
        <p className="text-sm text-slate-500">
          Préparez les informations globales qui seront partagées par tous les utilisateurs Chronnix.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-700">Paramètres globaux</h2>
            <p className="text-sm text-slate-500">
              Ces informations seront réutilisées pour les exports et, plus tard, pour vos accès utilisateurs.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextField
            label="Nom de l'entreprise"
            value={accountState.name}
            onChange={(value) => setAccountState((prev) => ({ ...prev, name: value }))}
          />
          <TextField
            label="Email principal"
            value={accountState.primaryEmail}
            onChange={(value) => setAccountState((prev) => ({ ...prev, primaryEmail: value }))}
          />
          <TextField
            label="Téléphone"
            value={accountState.phone}
            onChange={(value) => setAccountState((prev) => ({ ...prev, phone: value }))}
          />
          <TextField
            label="Fuseau horaire"
            value={accountState.timezone}
            onChange={(value) => setAccountState((prev) => ({ ...prev, timezone: value }))}
            as="select"
            options={TIMEZONE_OPTIONS.map((tz) => ({ value: tz, label: tz }))}
          />
          <TextField
            label="Langue par défaut"
            value={accountState.locale}
            onChange={(value) => setAccountState((prev) => ({ ...prev, locale: value }))}
            as="select"
            options={LOCALE_OPTIONS}
          />
          <TextField
            label="Adresse"
            value={accountState.addressLine1}
            onChange={(value) => setAccountState((prev) => ({ ...prev, addressLine1: value }))}
          />
          <TextField
            label="Complément"
            value={accountState.addressLine2}
            onChange={(value) => setAccountState((prev) => ({ ...prev, addressLine2: value }))}
          />
          <div className="grid grid-cols-3 gap-3 md:col-span-2">
            <TextField
              label="Code postal"
              value={accountState.postalCode}
              onChange={(value) => setAccountState((prev) => ({ ...prev, postalCode: value }))}
            />
            <TextField
              label="Ville"
              value={accountState.city}
              onChange={(value) => setAccountState((prev) => ({ ...prev, city: value }))}
            />
            <TextField
              label="Pays"
              value={accountState.country}
              onChange={(value) => setAccountState((prev) => ({ ...prev, country: value }))}
            />
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={saveAccount}
            className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
          >
            Enregistrer le compte
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-700">Dossier BCE</h2>
            {companyState?.bceFileName && (
              <p className="text-sm text-slate-500">
                Actuel : {companyState.bceFileName}{" "}
                {companyState.validUntil
                  ? `(valide jusqu\u0027au ${new Date(companyState.validUntil).toLocaleDateString()})`
                  : ""}
              </p>
            )}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_CLASSES[statusLabel.type]}`}>
            {statusLabel.label}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600">
          <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              Valide jusqu\u0027au
              <input
                type="date"
                value={validUntil}
                onChange={(event) => setValidUntil(event.target.value)}
                className="rounded-md border border-slate-200 px-2 py-1"
              />
            </label>
            <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                type="checkbox"
                checked={verified}
                onChange={(event) => setVerified(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-400"
              />
              BCE vérifiée
            </label>
          </div>
          <div>
            <button
              type="button"
              onClick={uploadBce}
              className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
            >
              Mettre à jour la BCE
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 py-6 text-sm text-slate-500">
        <h2 className="text-base font-semibold text-slate-700">Accès & authentification (à venir)</h2>
        <p className="mt-1">
          Cette section accueillera prochainement la gestion des utilisateurs, des invitations et la connexion via OAuth.
          Les informations de compte ci-dessus serviront de base à cette future configuration.
        </p>
      </section>

      {statusMessage && (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          {statusMessage}
        </div>
      )}
    </div>
  );
}

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  as?: "input" | "select";
  options?: Array<{ value: string; label: string }>;
};

function TextField({ label, value, onChange, as = "input", options }: TextFieldProps) {
  return (
    <label className="space-y-1 text-sm">
      <span className="text-slate-500">{label}</span>
      {as === "select" ? (
        <select
          className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {(options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-400 focus:outline-none"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}
