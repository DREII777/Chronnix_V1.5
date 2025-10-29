"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { formatDisplayDate } from "@/utils/date";
import { CreateProjectModal } from "@/components/timesheets/create-project-modal";
import { CreateClientModal } from "@/components/clients/create-client-modal";
import { EditClientModal, type EditableClientProfile } from "@/components/clients/edit-client-modal";
import { ProjectSettingsModal, type ProjectSettings } from "@/components/projects/project-settings-modal";
import { Textarea } from "@/components/ui/textarea";

type ClientDetailModel = {
  name: string;
  slug: string;
  profile: EditableClientProfile | null;
  projects: Array<{
    id: number;
    name: string;
    archived: boolean;
    billingRate: number | null;
    defaultHours: number | null;
    clientName: string | null;
    totalHours: number;
    totalAmount: number;
    workerCount: number;
    lastActivity: string | null;
  }>;
};

type Props = {
  client: ClientDetailModel;
};

export function ClientDetailView({ client }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [createProfileOpen, setCreateProfileOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [profile, setProfile] = useState<EditableClientProfile | null>(client.profile);
  const [projectSettingsId, setProjectSettingsId] = useState<number | null>(null);

  useEffect(() => {
    setProfile(client.profile);
  }, [client.profile]);

  const handleProfileUpdated = (updated: EditableClientProfile) => {
    setProfile(updated);
    router.refresh();
  };

  const aggregates = useMemo(() => {
    const totalHours = client.projects.reduce((sum, project) => sum + project.totalHours, 0);
    const totalAmount = client.projects.reduce((sum, project) => sum + project.totalAmount, 0);
    const activeProjects = client.projects.filter((project) => !project.archived).length;
    const lastActivity = client.projects
      .map((project) => (project.lastActivity ? new Date(project.lastActivity) : null))
      .filter((value): value is Date => value !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      totalHours,
      totalAmount,
      activeProjects,
      lastActivity,
    };
  }, [client.projects]);

  const projects = client.projects;

  const settingsProject = useMemo(() => {
    if (projectSettingsId === null) return null;
    return projects.find((project) => project.id === projectSettingsId) ?? null;
  }, [projectSettingsId, projects]);

  const handleProjectCreated = () => {
    router.refresh();
  };

  const projectSettingsData: ProjectSettings | null = settingsProject
    ? {
        id: settingsProject.id,
        name: settingsProject.name,
        clientName: settingsProject.clientName ?? client.name,
        billingRate: settingsProject.billingRate,
        defaultHours: settingsProject.defaultHours,
        archived: settingsProject.archived,
      }
    : null;

  return (
    <div className="space-y-6">
      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultClientName={client.name}
        onCreated={handleProjectCreated}
      />
      <CreateClientModal
        open={createProfileOpen}
        onClose={() => setCreateProfileOpen(false)}
        defaultValues={{ name: client.name }}
        onCreated={(created) => {
          handleProfileUpdated(created);
          setCreateProfileOpen(false);
        }}
      />
      <EditClientModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        profile={profile}
        onUpdated={(updated) => {
          handleProfileUpdated(updated);
          setEditProfileOpen(false);
        }}
      />
      <ProjectSettingsModal
        open={projectSettingsId !== null && Boolean(projectSettingsData)}
        onClose={() => setProjectSettingsId(null)}
        project={projectSettingsData}
        onSaved={() => {
          setProjectSettingsId(null);
          router.refresh();
        }}
      />
      <div className="flex flex-col gap-4">
        <Link href="/clients" className="text-sm text-slate-500 transition hover:text-slate-900">
          ← Retour aux clients
        </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900">{client.name}</h1>
              <p className="text-sm text-slate-500">{client.projects.length} chantier(s) suivi(s)</p>
            </div>
            <Button onClick={() => setModalOpen(true)}>Ajouter un chantier</Button>
          </div>
      </div>

      <Card>
        <CardHeader className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-base font-semibold text-slate-900">Synthèse client</CardTitle>
              <CardDescription>Coordonnées clés et indicateurs rapides.</CardDescription>
              <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
                <ProfileField label="Interlocuteur" value={profile?.contactName ?? null} />
                <ProfileField label="Téléphone" value={profile?.phone ?? null} />
                <ProfileField label="Email" value={profile?.email ?? null} />
                <ProfileField label="Adresse" value={profile?.address ?? null} multiline />
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:w-72">
              {profile ? (
                <>
                  <ProfileNotes slug={profile.slug} value={profile.notes} onUpdated={handleProfileUpdated} />
                  <Button variant="outline" size="sm" onClick={() => setEditProfileOpen(true)} className="self-end">
                    Modifier le profil
                  </Button>
                </>
              ) : (
                <div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 text-sm text-slate-500">
                  <p>Ajoutez les informations de contact pour faciliter vos relances.</p>
                  <Button size="sm" onClick={() => setCreateProfileOpen(true)}>
                    Créer le profil client
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="grid gap-4 rounded-xl border border-slate-200/70 bg-white/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryItem label="Chantiers actifs" value={formatNumber(aggregates.activeProjects)} compact />
            <SummaryItem label="Heures cumulées" value={formatHoursToHHMM(aggregates.totalHours)} compact />
            <SummaryItem label="Montant estimé" value={formatCurrency(aggregates.totalAmount)} compact />
            <SummaryItem
              label="Dernière activité"
              value={
                aggregates.lastActivity ? formatDisplayDate(aggregates.lastActivity) : "Aucune activité récente"
              }
              compact
            />
          </div>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold text-slate-900">Chantiers</CardTitle>
            <CardDescription>
              Consultez vos chantiers et accédez au pointage ou aux paramètres en un clic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aucun chantier n&apos;est encore associé à ce client. Créez-en un pour commencer le suivi.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {projects.map((project) => (
                  <Card key={project.id} className="border-slate-200">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <CardTitle className="text-base font-semibold text-slate-900">{project.name}</CardTitle>
                          <p className="text-xs text-slate-500">
                            {project.lastActivity
                              ? `Dernière activité · ${formatDisplayDate(new Date(project.lastActivity))}`
                              : "Aucune activité récente"}
                          </p>
                        </div>
                        {project.archived ? <Badge variant="secondary">Archivé</Badge> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/timesheets?projectId=${project.id}&fromClient=${client.slug}&tab=pointage`}>
                            Ouvrir le pointage
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setProjectSettingsId(project.id)}
                        >
                          Paramètres
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                      <ProjectMetric label="Heures cumulées" value={formatHoursToHHMM(project.totalHours)} />
                      <ProjectMetric label="Montant estimé" value={formatCurrency(project.totalAmount)} />
                      <ProjectMetric
                        label="Taux facturation"
                        value={project.billingRate !== null ? formatCurrency(project.billingRate) : "Non défini"}
                      />
                      <ProjectMetric
                        label="Heures par défaut"
                        value={project.defaultHours !== null ? formatHoursToHHMM(project.defaultHours) : "Non défini"}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-1 rounded-lg border border-slate-200 bg-white px-4", compact ? "py-2" : "py-3")}> 
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("font-semibold text-slate-900", compact ? "text-base" : "text-sm")}>{value}</p>
    </div>
  );
}

function ProjectMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function formatHoursToHHMM(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function ProfileField({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null;
  multiline?: boolean;
}) {
  const display = value && value.trim().length > 0 ? value : null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <span
        className={cn(
          "text-sm",
          display ? "text-slate-700" : "text-slate-400 italic",
          multiline ? "whitespace-pre-wrap" : "truncate",
        )}
      >
        {display ?? "—"}
      </span>
    </div>
  );
}

function ProfileNotes({
  slug,
  value,
  onUpdated,
}: {
  slug: string;
  value: string | null;
  onUpdated: (profile: EditableClientProfile) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(value ?? "");
      setError(null);
    }
  }, [open, value]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/clients/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draft.trim().length > 0 ? draft : null }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible d'enregistrer la note");
      }
      const { profile } = (await response.json()) as { profile: EditableClientProfile };
      onUpdated(profile);
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setOpen(false);
  };

  const preview = value && value.trim().length > 0 ? value : "Cliquer pour ajouter une note interne";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-white/60 p-3 text-left transition hover:border-sky-300 hover:bg-sky-50"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes internes</span>
        <p className={cn("text-sm", value ? "text-slate-700 line-clamp-3" : "text-slate-400 italic")}>{preview}</p>
      </button>

      <Dialog open={open} onOpenChange={(next) => (!next ? handleClose() : setOpen(true))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader
            title="Notes internes"
            description="Conservez ici les informations importantes sur votre relation client."
          />
          <DialogBody className="space-y-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={10}
              placeholder="Ajoutez vos notes internes..."
              className="h-64"
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={handleClose} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
