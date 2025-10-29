import { addDays, isAfter } from "date-fns";
import { DocumentKind, WorkerStatus, type CompanySettings } from "@prisma/client";
type WorkerComplianceSource = {
  email: string | null;
  nationalId: string | null;
  status: WorkerStatus;
  vatNumber: string | null;
  documents: Array<{ kind: DocumentKind; validUntil: Date | null }>;
};

const REQUIRED_DOCUMENTS: DocumentKind[] = [
  "CAREER_ATTESTATION",
  "CI",
  "VCA",
];

export type ComplianceResult = {
  isCompliant: boolean;
  missing: string[];
};

export function computeWorkerCompliance(
  worker: WorkerComplianceSource,
  companySettings: CompanySettings | null,
): ComplianceResult {
  const missing: string[] = [];

  if (!worker.email) {
    missing.push("email");
  }

  if (!worker.nationalId) {
    missing.push("nationalId");
  }

  if (!worker.status) {
    missing.push("status");
  }

  if (
    (worker.status === WorkerStatus.INDEPENDANT || worker.status === WorkerStatus.ASSOCIE) &&
    !worker.vatNumber
  ) {
    missing.push("vatNumber");
  }

  if (!hasValidCompanySettings(companySettings)) {
    missing.push("companySettings");
  }

  for (const kind of REQUIRED_DOCUMENTS) {
    const doc = worker.documents.find((document) => document.kind === kind);
    if (!doc) {
      missing.push(`document:${kind}`);
      continue;
    }

    if (!doc.validUntil || !isAfter(adjustDate(doc.validUntil), new Date())) {
      missing.push(`documentExpired:${kind}`);
    }
  }

  return {
    isCompliant: missing.length === 0,
    missing,
  };
}

function adjustDate(date: Date): Date {
  // add one day to consider documents valid through their validUntil date end of day
  return addDays(date, 1);
}

function hasValidCompanySettings(settings: CompanySettings | null): boolean {
  if (!settings) {
    return false;
  }

  if (!settings.verified) {
    return false;
  }

  if (!settings.validUntil) {
    return false;
  }

  return isAfter(adjustDate(settings.validUntil), new Date());
}
