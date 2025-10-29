import { Prisma } from "@prisma/client";

export type WorkerWithRelations = Prisma.WorkerGetPayload<{
  include: {
    documents: true;
    additionalCosts: true;
    teamMemberships: { include: { team: true } };
    assignments: { include: { project: true } };
    timeEntries: true;
  };
}>;

export type WorkerFilters = {
  search?: string;
  teamId?: number;
  compliant?: boolean;
};
