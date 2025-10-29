"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatCurrency } from "@/lib/utils";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";

const workerStatusOptions = [
  { value: "SALARIE", label: "Salarié" },
  { value: "INDEPENDANT", label: "Indépendant" },
  { value: "ASSOCIE", label: "Associé" },
];

const tabs = [
  { id: "identity", label: "Identité" },
  { id: "documents", label: "Documents" },
  { id: "collaboration", label: "Équipes & affectations" },
  { id: "costs", label: "Coûts & export" },
];

type WorkerProfileData = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationalId: string;
  status: string;
  vatNumber: string;
  payRate: number;
  chargesAmount: number;
  includeInExport: boolean;
  documents: Array<{
    id: number;
    kind: string;
    label: string | null;
    fileName: string;
    fileUrl: string;
    validUntil: string | null;
  }>;
  additionalCosts: Array<{
    id: number;
    label: string;
    unit: "HOUR" | "DAY";
    amount: number;
  }>;
  teams: Array<{
    id: number;
    teamId: number;
    teamName: string;
    role: string;
  }>;
  assignments: Array<{
    projectId: number;
    projectName: string;
  }>;
  timeEntries: Array<{
    projectId: number;
    date: string;
    hours: number;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type WorkerDocument = WorkerProfileData["documents"][number];

type ComplianceResult = {
  isCompliant: boolean;
  missing: string[];
};

type CompanySettings = {
  id: number;
  bceFileName: string | null;
  bceFileUrl: string | null;
  validUntil: string | null;
  verified: boolean;
} | null;

type Props = {
  worker: WorkerProfileData;
  compliance: ComplianceResult;
  companySettings: CompanySettings;
};

export default function WorkerProfileTabs({ worker, compliance, companySettings }: Props) {
  const [activeTab, setActiveTab] = useState<string>(tabs[0].id);
  const [identity, setIdentity] = useState({
    firstName: worker.firstName,
    lastName: worker.lastName,
    email: worker.email,
    phone: worker.phone,
    nationalId: worker.nationalId,
    status: worker.status,
    vatNumber: worker.vatNumber,
  });
  const [costs, setCosts] = useState({
    payRate: worker.payRate,
    chargesAmount: worker.chargesAmount,
    includeInExport: worker.includeInExport,
  });
  const [additionalCosts, setAdditionalCosts] = useState(worker.additionalCosts);
  const [newCost, setNewCost] = useState({ label: "", amount: "", unit: "HOUR" as "HOUR" | "DAY" });
  const [savingAdditionalCost, setSavingAdditionalCost] = useState(false);
  const [additionalCostError, setAdditionalCostError] = useState<string | null>(null);
  const [deletingAdditionalCostId, setDeletingAdditionalCostId] = useState<number | null>(null);
  const [documents, setDocuments] = useState(worker.documents);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [openTeamIds, setOpenTeamIds] = useState<number[]>([]);

  useEffect(() => {
    setOpenTeamIds([]);
  }, [worker.id]);

  const toggleTeam = (teamMembershipId: number) => {
    setOpenTeamIds((prev) =>
      prev.includes(teamMembershipId)
        ? prev.filter((id) => id !== teamMembershipId)
        : [...prev, teamMembershipId],
    );
  };

  const companyStatus = (() => {
    if (!companySettings?.bceFileUrl) return "BCE manquante";
    if (!companySettings.verified) return "BCE à valider";
    if (companySettings.validUntil && new Date(companySettings.validUntil) < new Date()) {
      return "BCE expirée";
    }
    return "BCE valide";
  })();

  const saveIdentity = async () => {
    setStatusMessage("Sauvegarde en cours...");
    try {
      const response = await fetch(`/api/workers/${worker.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(identity),
      });
      if (!response.ok) throw new Error("Une erreur est survenue");
      setStatusMessage("Identité mise à jour");
    } catch (error) {
      console.error(error);
      setStatusMessage("Impossible de sauvegarder les modifications");
    }
  };

  const saveCosts = async () => {
    setStatusMessage("Sauvegarde en cours...");
    try {
      const response = await fetch(`/api/workers/${worker.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payRate: costs.payRate,
          chargesPct: costs.chargesAmount,
          includeInExport: costs.includeInExport,
        }),
      });
      if (!response.ok) throw new Error("Une erreur est survenue");
      setStatusMessage("Coûts mis à jour");
    } catch (error) {
      console.error(error);
      setStatusMessage("Impossible de sauvegarder les modifications");
    }
  };

  const handleDocumentUploaded = (document: WorkerDocument) => {
    setDocuments((prev) => {
      const next = [...prev];
      const byIdIndex = next.findIndex((doc) => doc.id === document.id);
      if (byIdIndex >= 0) {
        next[byIdIndex] = document;
        return next;
      }

      if (document.kind !== "OTHER") {
        const byKindIndex = next.findIndex((doc) => doc.kind === document.kind);
        if (byKindIndex >= 0) {
          next[byKindIndex] = document;
          return next;
        }
      }

      next.push(document);
      return next;
    });
    setStatusMessage("Document mis à jour");
  };

  const deleteDocument = async (documentId: number) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Suppression impossible");
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
      setStatusMessage("Document supprimé");
      return true;
    } catch (error) {
      console.error(error);
      setStatusMessage(
        error instanceof Error ? error.message : "Impossible de supprimer le document pour le moment",
      );
      return false;
    }
  };

  const addAdditionalCost = async () => {
    const label = newCost.label.trim();
    const amountValue = Number(newCost.amount);

    if (!label) {
      setAdditionalCostError("Le libellé est requis.");
      return;
    }
    if (!amountValue || Number.isNaN(amountValue) || amountValue <= 0) {
      setAdditionalCostError("Le montant doit être supérieur à zéro.");
      return;
    }

    setSavingAdditionalCost(true);
    setAdditionalCostError(null);
    setStatusMessage("Ajout du coût en cours...");

    try {
      const response = await fetch(`/api/workers/${worker.id}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          amount: amountValue,
          unit: newCost.unit,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible d'ajouter le coût.");
      }

      const data = await response.json();
      const cost = data.cost as { id: number; label: string; unit: "HOUR" | "DAY"; amount: number };

      setAdditionalCosts((prev) => [...prev, cost]);
      setNewCost({ label: "", amount: "", unit: newCost.unit });
      setStatusMessage("Coût spécifique ajouté");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Impossible d'ajouter le coût.";
      setAdditionalCostError(message);
      setStatusMessage(message);
    } finally {
      setSavingAdditionalCost(false);
    }
  };

  const deleteAdditionalCost = async (costId: number) => {
    setAdditionalCostError(null);
    setDeletingAdditionalCostId(costId);
    setStatusMessage("Suppression du coût...");

    try {
      const response = await fetch(`/api/workers/${worker.id}/costs/${costId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible de supprimer le coût.");
      }

      setAdditionalCosts((prev) => prev.filter((cost) => cost.id !== costId));
      setStatusMessage("Coût spécifique supprimé");
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Impossible de supprimer le coût.";
      setAdditionalCostError(message);
      setStatusMessage(message);
    } finally {
      setDeletingAdditionalCostId(null);
    }
  };

  const isIndependent = identity.status === "INDEPENDANT";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-2xl font-semibold text-slate-900">
              {worker.lastName.toUpperCase()} {worker.firstName}
            </CardTitle>
            <CardDescription>Statut : {labelForStatus(worker.status)}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={compliance.isCompliant ? "success" : "warning"}>
              {compliance.isCompliant ? "Conforme" : `${compliance.missing.length} élément(s)`}
            </Badge>
            <Badge variant={companyStatus === "BCE valide" ? "success" : "warning"}>{companyStatus}</Badge>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-slate-500">
          Créé le {new Date(worker.createdAt).toLocaleDateString("fr-BE")}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="identity" className="space-y-4 pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <InputField
                  label="Prénom"
                  value={identity.firstName}
                  onChange={(value) => setIdentity((prev) => ({ ...prev, firstName: value }))}
                />
                <InputField
                  label="Nom"
                  value={identity.lastName}
                  onChange={(value) => setIdentity((prev) => ({ ...prev, lastName: value }))}
                />
                <InputField
                  label="Email"
                  value={identity.email}
                  onChange={(value) => setIdentity((prev) => ({ ...prev, email: value }))}
                />
                <InputField
                  label="Téléphone"
                  value={identity.phone}
                  onChange={(value) => setIdentity((prev) => ({ ...prev, phone: value }))}
                />
                <InputField
                  label="N° national"
                  value={identity.nationalId}
                  onChange={(value) => setIdentity((prev) => ({ ...prev, nationalId: value }))}
                />
                <SelectField
                  label="Statut"
                  value={identity.status}
                  onChange={(value) =>
                    setIdentity((prev) => ({
                      ...prev,
                      status: value,
                      vatNumber: value === "INDEPENDANT" ? prev.vatNumber : "",
                    }))
                  }
                  options={workerStatusOptions}
                />
                {isIndependent ? (
                  <InputField
                    label="TVA"
                    value={identity.vatNumber}
                    onChange={(value) => setIdentity((prev) => ({ ...prev, vatNumber: value }))}
                  />
                ) : null}
              </div>
              <Button onClick={saveIdentity} className="md:w-fit">Enregistrer</Button>
            </TabsContent>

            <TabsContent value="documents" className="pt-6">
              <DocumentsTab
                documents={documents}
                workerId={worker.id}
                onUploaded={handleDocumentUploaded}
                onDeleted={deleteDocument}
              />
            </TabsContent>

            <TabsContent value="collaboration" className="space-y-6 pt-6 text-sm text-slate-600">
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Équipes</h3>
                {worker.teams.length === 0 ? (
                  <p className="text-slate-500">Aucune équipe assignée.</p>
                ) : (
                  worker.teams.map((team) => {
                    const isOpen = openTeamIds.includes(team.id);
                    return (
                      <div
                        key={team.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 shadow-sm transition"
                      >
                        <button
                          type="button"
                          onClick={() => toggleTeam(team.id)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center justify-between gap-3 bg-transparent text-left"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">{team.teamName}</p>
                            {!isOpen ? null : (
                              <p className="text-xs text-slate-500">Cliquez pour refermer</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{team.role || "Membre"}</Badge>
                            <span
                              className={cn(
                                "text-base leading-none text-slate-400 transition-transform",
                                isOpen ? "rotate-90" : "rotate-0",
                              )}
                              aria-hidden
                            >
                              &gt;
                            </span>
                          </div>
                        </button>
                        {isOpen ? (
                          <div className="mt-3 space-y-1 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-500">
                            <p>
                              <span className="font-semibold text-slate-700">Rôle :</span> {team.role || "Membre"}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-700">Identifiant équipe :</span> #{team.teamId}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Affectations</h3>
                {worker.assignments.length === 0 ? (
                  <p className="text-slate-500">Aucune affectation.</p>
                ) : (
                  worker.assignments.map((assignment) => (
                    <div
                      key={assignment.projectId}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                    >
                      <span className="font-semibold text-slate-800">{assignment.projectName}</span>
                      <Link
                        href={`/timesheets?projectId=${assignment.projectId}`}
                        className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Voir chantier
                      </Link>
                    </div>
                  ))
                )}
              </section>
            </TabsContent>

            <TabsContent value="costs" className="space-y-4 pt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <NumberField
                  label="Taux horaire (€)"
                  value={costs.payRate}
                  onChange={(value) => setCosts((prev) => ({ ...prev, payRate: value }))}
                />
                <NumberField
                  label="Charges (€)"
                  value={costs.chargesAmount}
                  onChange={(value) => setCosts((prev) => ({ ...prev, chargesAmount: value }))}
                />
              </div>
              <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={costs.includeInExport}
                  onChange={(event) => setCosts((prev) => ({ ...prev, includeInExport: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Inclure dans les exports paie
              </label>
              <Button onClick={saveCosts} className="md:w-fit">Enregistrer</Button>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Coûts spécifiques
                </h3>
                {additionalCosts.length === 0 ? (
                  <p className="text-slate-500">Aucun coût spécifique enregistré.</p>
                ) : (
                  <div className="space-y-3">
                    {additionalCosts.map((cost) => (
                      <div
                        key={cost.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{cost.label}</p>
                          <p className="text-xs text-slate-500">
                            {cost.unit === "HOUR" ? "Par heure" : "Par jour"} · {formatCurrency(cost.amount)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deletingAdditionalCostId === cost.id}
                          onClick={() => deleteAdditionalCost(cost.id)}
                        >
                          {deletingAdditionalCostId === cost.id ? "Suppression..." : "Supprimer"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-4 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input
                      placeholder="Libellé"
                      value={newCost.label}
                      onChange={(event) => setNewCost((prev) => ({ ...prev, label: event.target.value }))}
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Montant"
                      value={newCost.amount}
                      onChange={(event) => setNewCost((prev) => ({ ...prev, amount: event.target.value }))}
                    />
                    <Select
                      value={newCost.unit}
                      onChange={(event) =>
                        setNewCost((prev) => ({ ...prev, unit: event.target.value as "HOUR" | "DAY" }))
                      }
                    >
                      <option value="HOUR">Par heure</option>
                      <option value="DAY">Par jour</option>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={addAdditionalCost}
                      disabled={savingAdditionalCost}
                      className="md:w-fit"
                    >
                      {savingAdditionalCost ? "Ajout..." : "Ajouter un coût"}
                    </Button>
                    {additionalCostError ? (
                      <p className="text-sm text-red-600">{additionalCostError}</p>
                    ) : null}
                  </div>
                </div>
              </section>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {statusMessage && (
        <Card>
          <CardContent className="text-sm text-slate-600">{statusMessage}</CardContent>
        </Card>
      )}
    </div>
  );
}

function labelForStatus(value: string) {
  const match = workerStatusOptions.find((option) => option.value === value);
  return match ? match.label : value;
}

type InputFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function InputField({ label, value, onChange }: InputFieldProps) {
  return (
    <label className="space-y-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
};

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <label className="space-y-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <label className="space-y-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <Input
        type="number"
        value={Number.isNaN(value) ? "" : value}
        onChange={(event) => onChange(parseFloat(event.target.value) || 0)}
        min="0"
        step="0.01"
      />
    </label>
  );
}

function DocumentsTab({
  documents,
  workerId,
  onUploaded,
  onDeleted,
}: {
  documents: WorkerProfileData["documents"];
  workerId: number;
  onUploaded: (document: WorkerDocument) => void;
  onDeleted: (documentId: number) => Promise<boolean>;
}) {
  type DialogState =
    | { type: "predefined"; kind: string }
    | { type: "custom"; documentId: number | null };

  const [dialogState, setDialogState] = useState<DialogState | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const kinds: Array<{ value: string; label: string; priority?: boolean }> = [
    {
      value: "CAREER_ATTESTATION",
      label: "Attestation de carrière",
      priority: true,
    },
    { value: "CI", label: "Carte d'identité" },
    { value: "VCA", label: "Certification VCA" },
  ];

  const customDocuments = documents.filter((document) => !kinds.some((kind) => kind.value === document.kind));

  const dialog = (() => {
    if (!dialogState) return null;

    if (dialogState.type === "predefined") {
      const definition = kinds.find((kind) => kind.value === dialogState.kind);
      if (!definition) return null;
      const document = documents.find((doc) => doc.kind === definition.value) ?? null;
      return (
        <DocumentUploadDialog
          key={`predefined-${definition.value}`}
          open
          onOpenChange={(open) => {
            if (!open) setDialogState(null);
          }}
          workerId={workerId}
          target={{ type: "predefined", definition, document }}
          onUploaded={(doc) => {
            onUploaded(doc);
            setDialogState(null);
          }}
        />
      );
    }

    const document = dialogState.documentId
      ? documents.find((doc) => doc.id === dialogState.documentId) ?? null
      : null;

    return (
      <DocumentUploadDialog
        key={`custom-${document?.id ?? "new"}`}
        open
        onOpenChange={(open) => {
          if (!open) setDialogState(null);
        }}
        workerId={workerId}
        target={{ type: "custom", document }}
        onUploaded={(doc) => {
          onUploaded(doc);
          setDialogState(null);
        }}
      />
    );
  })();

  return (
    <>
      <div className="space-y-4">
        {kinds.map((kind) => {
          const document = documents.find((doc) => doc.kind === kind.value) ?? null;
          const hasValidity = Boolean(document?.validUntil);
          const isValid =
            hasValidity && document?.validUntil
              ? new Date(document.validUntil) >= new Date()
              : false;
          const isMissing = !document;

          return (
            <Card
              key={kind.value}
              className={cn(
                "border-dashed",
                kind.priority && "border-amber-300 bg-amber-50/70",
              )}
            >
              <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base font-semibold text-slate-900">{kind.label}</CardTitle>
                    {kind.priority && <Badge variant="warning">Prioritaire</Badge>}
                  </div>
                  <CardDescription>
                    {document ? (
                      <>
                        {document.fileName}
                        {document.validUntil && (
                          <span className="ml-2">({new Date(document.validUntil).toLocaleDateString("fr-BE")})</span>
                        )}
                      </>
                    ) : (
                      <>Document non fourni</>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {kind.priority && isMissing && <Badge variant="destructive">À fournir</Badge>}
                  {document && hasValidity && (
                    <Badge variant={isValid ? "success" : "warning"}>
                      {isValid ? "Valide" : "Expiré"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                {document ? (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <a href={document.fileUrl} target="_blank" rel="noreferrer">
                        Télécharger
                      </a>
                    </Button>
                    <Button size="sm" onClick={() => setDialogState({ type: "predefined", kind: kind.value })}>
                      Remplacer le document
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => setDialogState({ type: "predefined", kind: kind.value })}>
                    Ajouter le document
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Autres documents
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogState({ type: "custom", documentId: null })}
          >
            Ajouter un document
          </Button>
        </div>

        {customDocuments.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun document supplémentaire.</p>
        ) : (
          customDocuments.map((document) => {
            const hasValidity = Boolean(document.validUntil);
            const isValid =
              hasValidity && document.validUntil
                ? new Date(document.validUntil) >= new Date()
                : true;

            return (
              <Card key={`custom-${document.id}`} className="border-slate-200">
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {document.label ?? document.fileName}
                    </CardTitle>
                    <CardDescription>{document.fileName}</CardDescription>
                    {document.validUntil ? (
                      <p className="text-xs text-slate-500">
                        Valide jusqu’au {new Date(document.validUntil).toLocaleDateString("fr-BE")}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">Pas de date de validité enregistrée</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasValidity ? (
                      <Badge variant={isValid ? "success" : "warning"}>{isValid ? "Valide" : "Expiré"}</Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <Button asChild variant="outline" size="sm">
                    <a href={document.fileUrl} target="_blank" rel="noreferrer">
                      Télécharger
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setDialogState({ type: "custom", documentId: document.id })}
                  >
                    Remplacer le document
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deletingId === document.id}
                    onClick={async () => {
                      setDeleteError(null);
                      setDeletingId(document.id);
                      try {
                        const success = await onDeleted(document.id);
                        if (!success) {
                          setDeleteError("Impossible de supprimer le document.");
                        }
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                  >
                    {deletingId === document.id ? "Suppression..." : "Supprimer"}
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
        {deleteError ? <p className="text-xs text-red-600">{deleteError}</p> : null}
      </div>

      {dialog}
    </>
  );
}

type DocumentUploadTarget =
  | { type: "predefined"; definition: { value: string; label: string }; document: WorkerDocument | null }
  | { type: "custom"; document: WorkerDocument | null };

type DocumentUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workerId: number;
  target: DocumentUploadTarget;
  onUploaded: (document: WorkerDocument) => void;
};

function DocumentUploadDialog({ open, onOpenChange, workerId, target, onUploaded }: DocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [validUntil, setValidUntil] = useState<string>("");
  const [customLabel, setCustomLabel] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isCustom = target.type === "custom";
  const targetDocument = target.document;

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setError(null);
    setValidUntil(targetDocument?.validUntil ? targetDocument.validUntil.slice(0, 10) : "");
    setCustomLabel(isCustom ? targetDocument?.label ?? "" : "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [open, targetDocument, isCustom]);

  const handleSubmit = async () => {
    if (!file) {
      setError("Sélectionnez un fichier à téléverser.");
      return;
    }

    if (isCustom && !customLabel.trim()) {
      setError("Indiquez un intitulé pour le document.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const documentIdPayload = targetDocument?.id ? { documentId: targetDocument.id } : {};
      const presignBody = {
        workerId,
        kind: target.type === "predefined" ? target.definition.value : "OTHER",
        fileName: file.name,
        ...(isCustom ? { label: customLabel.trim() } : {}),
        ...documentIdPayload,
      } satisfies Record<string, unknown>;

      const presignResponse = await fetch("/api/documents/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(presignBody),
      });
      if (!presignResponse.ok) {
        const data = await presignResponse.json().catch(() => ({}));
        throw new Error(data.error ?? "Échec de la préparation de l'upload");
      }

      const { uploadUrl } = await presignResponse.json();
      const formData = new FormData();
      formData.set("file", file);
      if (validUntil) {
        formData.set("validUntil", validUntil);
      }

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json().catch(() => ({}));
        throw new Error(data.error ?? "Échec du téléversement");
      }

      const result = await uploadResponse.json();
      if (!result?.document) {
        throw new Error("Réponse inattendue du serveur");
      }

      onUploaded({
        id: result.document.id,
        kind: result.document.kind,
        label: result.document.label ?? null,
        fileName: result.document.fileName,
        fileUrl: result.document.fileUrl,
        validUntil: result.document.validUntil,
      });
      onOpenChange(false);
    } catch (caught) {
      console.error(caught);
      setError(caught instanceof Error ? caught.message : "Impossible de téléverser le document. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader
          title={
            target.type === "predefined"
              ? `${targetDocument ? "Mettre à jour" : "Ajouter"} ${target.definition.label.toLowerCase()}`
              : `${targetDocument ? "Mettre à jour" : "Ajouter"} un document`
          }
          description={
            target.type === "predefined"
              ? "Téléversez le fichier et, si nécessaire, mettez à jour sa date de validité."
              : "Ajoutez un document supplémentaire pour cet ouvrier. La date de validité est facultative."
          }
        />
        <DialogBody className="space-y-4 text-sm text-slate-600">
          {isCustom ? (
            <label className="space-y-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Intitulé</span>
              <Input
                value={customLabel}
                onChange={(event) => setCustomLabel(event.target.value)}
                placeholder="Ex. Certificat médical"
              />
            </label>
          ) : null}

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fichier</span>
            <Input
              ref={fileInputRef}
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
            />
            <p className="text-xs text-slate-500">Formats acceptés : PDF, Word ou image.</p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date de validité</span>
            <Input
              type="date"
              value={validUntil}
              onChange={(event) => setValidUntil(event.target.value)}
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !file || (isCustom && !customLabel.trim())}
          >
            {submitting ? "Envoi..." : targetDocument ? "Remplacer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
