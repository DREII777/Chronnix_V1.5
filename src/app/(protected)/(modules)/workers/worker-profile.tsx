import WorkerProfileTabs from "@/app/(protected)/(modules)/workers/worker-profile-tabs";
import type { WorkerWithRelations } from "@/types/workers";
import type { ComplianceResult } from "@/utils/compliance";
import type { CompanySettings } from "@prisma/client";

export default function WorkerProfile({
  worker,
  compliance,
  companySettings,
}: {
  worker: WorkerWithRelations;
  compliance: ComplianceResult;
  companySettings: CompanySettings | null;
}) {
  const profile = {
    id: worker.id,
    firstName: worker.firstName,
    lastName: worker.lastName,
    email: worker.email ?? "",
    phone: worker.phone ?? "",
    nationalId: worker.nationalId ?? "",
    status: worker.status,
    vatNumber: worker.vatNumber ?? "",
    payRate: worker.payRate ? Number(worker.payRate) : 0,
    chargesAmount: worker.chargesPct ? Number(worker.chargesPct) : 0,
    includeInExport: worker.includeInExport,
    additionalCosts: worker.additionalCosts.map((cost) => ({
      id: cost.id,
      label: cost.label,
      unit: cost.unit,
      amount: Number(cost.amount),
    })),
    documents: worker.documents.map((document) => ({
      id: document.id,
      kind: document.kind,
      label: document.label,
      fileName: document.fileName,
      fileUrl: document.fileUrl,
      validUntil: document.validUntil ? document.validUntil.toISOString().slice(0, 10) : null,
    })),
    teams: worker.teamMemberships.map((membership) => ({
      id: membership.id,
      teamId: membership.teamId,
      teamName: membership.team.name,
      role: membership.role,
    })),
    assignments: worker.assignments.map((assignment) => ({
      projectId: assignment.projectId,
      projectName: assignment.project?.name ?? "",
    })),
    timeEntries: worker.timeEntries.map((entry) => ({
      projectId: entry.projectId,
      date: entry.date.toISOString().slice(0, 10),
      hours: Number(entry.hours),
      status: entry.status,
    })),
    createdAt: worker.createdAt.toISOString(),
    updatedAt: worker.updatedAt.toISOString(),
  };

  const serializedSettings = companySettings
    ? {
        id: companySettings.id,
        bceFileName: companySettings.bceFileName,
        bceFileUrl: companySettings.bceFileUrl,
        validUntil: companySettings.validUntil
          ? companySettings.validUntil.toISOString().slice(0, 10)
          : null,
        verified: companySettings.verified,
      }
    : null;

  return (
    <WorkerProfileTabs
      worker={profile}
      compliance={compliance}
      companySettings={serializedSettings}
    />
  );
}
