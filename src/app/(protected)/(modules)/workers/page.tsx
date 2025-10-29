import WorkersDirectory from "@/app/(protected)/(modules)/workers/workers-directory";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { listTeams } from "@/data/teams";
import { listWorkers } from "@/data/workers";
import { requireUser } from "@/lib/auth";
export const dynamic = "force-dynamic";

export default async function WorkersPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; teamId?: string; compliant?: string }>;
}) {
  const params = (searchParams ? await searchParams : undefined) ?? {};
  const search = params.search ?? "";
  const teamId = params.teamId ? Number(params.teamId) : undefined;
  const compliant = params.compliant ? params.compliant === "true" : undefined;

  const user = await requireUser();
  const accountId = user.accountId;

  const [workers, teams] = await Promise.all([
    listWorkers(accountId, { search, teamId, compliant }),
    listTeams(accountId),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Ouvriers"
        description="Filtrez vos équipes, suivez la conformité documentaire et attribuez rapidement de nouveaux chantiers."
        helper={
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <Badge variant="success">Astuce</Badge>
            <span>Ouvrez le profil depuis le tableau pour consulter les documents sans quitter la page.</span>
          </div>
        }
      />
      <WorkersDirectory
        filters={{ search, teamId: teamId ?? null, compliant }}
        workers={workers.map((worker) => ({
          id: worker.id,
          firstName: worker.firstName,
          lastName: worker.lastName,
          email: worker.email,
          phone: worker.phone,
          status: worker.status,
          includeInExport: worker.includeInExport,
          nationalId: worker.nationalId ?? null,
          vatNumber: worker.vatNumber ?? null,
          assignments: worker.assignments.map((assignment) => ({
            projectId: assignment.projectId,
            projectName: assignment.project?.name ?? "",
          })),
          teams: worker.teamMemberships.map((membership) => ({
            teamId: membership.teamId,
            teamName: membership.team.name,
            role: membership.role,
          })),
          compliance: worker.compliance,
        }))}
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          members: team.members.map((member) => ({
            workerId: member.workerId,
            role: member.role,
            worker: {
              id: member.worker.id,
              firstName: member.worker.firstName,
              lastName: member.worker.lastName,
              status: member.worker.status,
            },
          })),
        }))}
      />
    </div>
  );
}
