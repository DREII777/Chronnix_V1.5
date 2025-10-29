"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast-provider";

export type TeamMemberInfo = {
  workerId: number;
  role: string;
  worker: {
    id: number;
    firstName: string;
    lastName: string;
    status: string;
  };
};

export type TeamInfo = {
  id: number;
  name: string;
  members: TeamMemberInfo[];
};

type TeamManagerProps = {
  teams: TeamInfo[];
  workers: Array<{
    id: number;
    firstName: string;
    lastName: string;
    status: string;
  }>;
};

export function TeamManager({ teams, workers }: TeamManagerProps) {
  const router = useRouter();
  const { push } = useToast();
  const [teamList, setTeamList] = useState<TeamInfo[]>(teams);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [activeTeamId, setActiveTeamId] = useState<number | null>(null);
  const [renamingTeamId, setRenamingTeamId] = useState<number | null>(null);
  const [renamingValue, setRenamingValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [roleDrafts, setRoleDrafts] = useState<Record<number, string>>({});

  const activeTeam = useMemo(
    () => teamList.find((team) => team.id === activeTeamId) ?? null,
    [activeTeamId, teamList],
  );

  const sortedWorkers = useMemo(
    () =>
      [...workers].sort((a, b) => {
        if (a.lastName === b.lastName) {
          return a.firstName.localeCompare(b.firstName);
        }
        return a.lastName.localeCompare(b.lastName);
      }),
    [workers],
  );

  const assignRoleDrafts = useCallback((team: TeamInfo | null) => {
    if (!team) {
      setRoleDrafts({});
      return;
    }
    const initial: Record<number, string> = {};
    for (const member of team.members) {
      initial[member.workerId] = member.role ?? "Membre";
    }
    setRoleDrafts(initial);
  }, []);

  useEffect(() => {
    if (activeTeamId === null) {
      setRoleDrafts({});
      return;
    }
    const team = teamList.find((item) => item.id === activeTeamId) ?? null;
    assignRoleDrafts(team);
  }, [activeTeamId, assignRoleDrafts, teamList]);

  const handleCreateTeam = async () => {
    const name = createName.trim();
    if (!name) {
      push({ title: "Nom requis", description: "Donnez un nom à l'équipe.", variant: "warning" });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible de créer l'équipe");
      }
      const data = (await response.json()) as { team: TeamInfo };
      setTeamList((prev) => [...prev, data.team]);
      setCreateOpen(false);
      setCreateName("");
      onOpenTeamDialog(data.team.id);
      router.refresh();
      push({ title: "Équipe créée", variant: "success" });
    } catch (error) {
      push({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer l'équipe",
        variant: "warning",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRename = async () => {
    if (!renamingTeamId) return;
    const name = renamingValue.trim();
    if (!name) {
      push({ title: "Nom requis", description: "Donnez un nom à l'équipe.", variant: "warning" });
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/teams/${renamingTeamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible de renommer l'équipe");
      }
      const data = (await response.json()) as { team: TeamInfo };
      setTeamList((prev) => prev.map((team) => (team.id === data.team.id ? data.team : team)));
      setRenamingTeamId(null);
      router.refresh();
      push({ title: "Équipe renommée", variant: "success" });
    } catch (error) {
      push({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de renommer l'équipe",
        variant: "warning",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (teamId: number) => {
    const team = teamList.find((item) => item.id === teamId);
    if (!team) return;
    const confirmDelete = window.confirm(
      team.members.length > 0
        ? `Supprimer l'équipe « ${team.name} » retirera ${team.members.length} membre(s). Continuer ?`
        : `Supprimer l'équipe « ${team.name} » ?`,
    );
    if (!confirmDelete) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/teams/${teamId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible de supprimer l'équipe");
      }
      setTeamList((prev) => prev.filter((team) => team.id !== teamId));
      router.refresh();
      push({ title: "Équipe supprimée", variant: "success" });
    } catch (error) {
      push({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'équipe",
        variant: "warning",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleMember = async (teamId: number, workerId: number, checked: boolean) => {
    const role = roleDrafts[workerId]?.trim() || "Membre";
    setBusy(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: checked ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checked ? { workerId, role } : { workerId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible de mettre à jour l'équipe");
      }
      const data = (await response.json()) as { team: TeamInfo };
      setTeamList((prev) => prev.map((team) => (team.id === data.team.id ? data.team : team)));
      setRoleDrafts((prev) => {
        const next = { ...prev };
        if (!checked) {
          delete next[workerId];
        } else {
          next[workerId] = role;
        }
        return next;
      });
      router.refresh();
    } catch (error) {
      push({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour l'équipe",
        variant: "warning",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = (workerId: number, value: string) => {
    setRoleDrafts((prev) => ({ ...prev, [workerId]: value }));
  };

  const handleRoleCommit = async (teamId: number, workerId: number) => {
    if (busy) return;
    const role = roleDrafts[workerId]?.trim() || "Membre";
    const team = teamList.find((item) => item.id === teamId);
    const currentRole = team?.members.find((member) => member.workerId === workerId)?.role ?? null;
    if (team && currentRole !== null && currentRole === role) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId, role }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "Impossible de mettre à jour le rôle");
      }
      const data = (await response.json()) as { team: TeamInfo };
      setTeamList((prev) => prev.map((team) => (team.id === data.team.id ? data.team : team)));
      setRoleDrafts((prev) => ({ ...prev, [workerId]: role }));
      router.refresh();
      push({ title: "Rôle mis à jour", variant: "success" });
    } catch (error) {
      push({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour le rôle",
        variant: "warning",
      });
    } finally {
      setBusy(false);
    }
  };

  const onOpenTeamDialog = (teamId: number | null) => {
    setActiveTeamId(teamId);
    if (teamId === null) {
      setRoleDrafts({});
      return;
    }
    const team = teamList.find((item) => item.id === teamId) ?? null;
    assignRoleDrafts(team);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold text-slate-900">Équipes</CardTitle>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              Nouvelle équipe
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          {teamList.length === 0 ? (
            <p>Aucune équipe enregistrée. Créez votre première équipe pour organiser vos ouvriers.</p>
          ) : (
            teamList.map((team) => (
              <div
                key={team.id}
                className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{team.name}</p>
                    <p className="text-xs text-slate-500">{team.members.length} membre(s)</p>
                  </div>
                  <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => onOpenTeamDialog(team.id)}>
                Gérer
              </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRenamingTeamId(team.id);
                        setRenamingValue(team.name);
                      }}
                    >
                      Renommer
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-amber-600 hover:bg-amber-50"
                      onClick={() => handleDelete(team.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
                {team.members.length > 0 ? (
                  <div className="space-y-2 text-xs text-slate-500">
                    {team.members.map((member) => (
                      <div key={member.workerId} className="flex items-center justify-between gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">
                            {member.worker.lastName.toUpperCase()} {member.worker.firstName}
                          </span>
                          <span className="text-[11px] text-slate-500">{member.worker.status}</span>
                        </div>
                        <Badge variant="secondary">{member.role || "Membre"}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Aucun membre pour l’instant.</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={(open) => setCreateOpen(open)}>
        <DialogContent maxWidth="max-w-md">
          <DialogHeader
            title="Nouvelle équipe"
            description="Donnez un nom à l'équipe puis ajoutez des membres."
          />
          <DialogBody className="space-y-4">
            <label className="space-y-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nom</span>
              <Input
                autoFocus
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder="Ex : Équipe électricité"
              />
            </label>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateTeam} disabled={busy}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renamingTeamId !== null} onOpenChange={(open) => (open ? null : setRenamingTeamId(null))}>
        <DialogContent maxWidth="max-w-md">
          <DialogHeader title="Renommer l'équipe" />
          <DialogBody className="space-y-4">
            <Input value={renamingValue} onChange={(event) => setRenamingValue(event.target.value)} />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenamingTeamId(null)}>
              Annuler
            </Button>
            <Button onClick={handleRename} disabled={busy}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeTeamId !== null} onOpenChange={(open) => (open ? null : onOpenTeamDialog(null))}>
        <DialogContent maxWidth="max-w-2xl">
          <DialogHeader
            title={activeTeam ? `Membres de l'équipe « ${activeTeam.name} »` : "Membres de l'équipe"}
            description="Sélectionnez les ouvriers à inclure dans cette équipe."
          />
          <DialogBody className="space-y-4">
            {activeTeam ? (
              <div className="grid gap-2 md:grid-cols-2">
                {sortedWorkers.map((worker) => {
                  const checked = activeTeam.members.some((member) => member.workerId === worker.id);
                  const roleValue = roleDrafts[worker.id] ?? "";
                  return (
                    <div
                      key={worker.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => handleToggleMember(activeTeam.id, worker.id, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">
                          {worker.lastName.toUpperCase()} {worker.firstName}
                        </p>
                        <p className="text-xs text-slate-500">{worker.status}</p>
                      </div>
                      {checked ? (
                        <div className="w-36">
                          <Input
                            value={roleValue}
                            placeholder="Rôle"
                            onChange={(event) => handleRoleChange(worker.id, event.target.value)}
                            onBlur={() => handleRoleCommit(activeTeam.id, worker.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleRoleCommit(activeTeam.id, worker.id);
                              }
                            }}
                            onClick={(event) => event.stopPropagation()}
                            onFocus={(event) => event.stopPropagation()}
                            disabled={busy}
                            className="h-8 text-xs"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenTeamDialog(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
