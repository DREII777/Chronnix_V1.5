import { Prisma } from "@prisma/client";
import { prisma } from "@/data/prisma";

type CompanySettingsInput = {
  bceFileName?: string | null;
  bceFileUrl?: string | null;
  validUntil?: string | null;
  verified?: boolean;
};

export async function getCompanySettings(accountId: number) {
  return prisma.companySettings.findUnique({
    where: { accountId },
    include: {
      account: true,
    },
  });
}

export async function updateCompanySettings(accountId: number, input: CompanySettingsInput) {
  const data: Prisma.CompanySettingsUpdateInput = {};

  if (input.bceFileName !== undefined) data.bceFileName = input.bceFileName;
  if (input.bceFileUrl !== undefined) data.bceFileUrl = input.bceFileUrl;
  if (input.validUntil !== undefined)
    data.validUntil = input.validUntil ? new Date(input.validUntil) : null;
  if (input.verified !== undefined) data.verified = input.verified;

  return prisma.companySettings.upsert({
    where: { accountId },
    create: {
      accountId,
      bceFileName: input.bceFileName ?? null,
      bceFileUrl: input.bceFileUrl ?? null,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      verified: input.verified ?? false,
    },
    update: data,
  });
}
