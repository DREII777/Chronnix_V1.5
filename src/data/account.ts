import { Prisma } from "@prisma/client";
import { prisma } from "@/data/prisma";

type AccountInput = {
  name?: string;
  primaryEmail?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  locale?: string | null;
  timezone?: string | null;
};

export async function getAccount(accountId: number) {
  return prisma.account.findUnique({ where: { id: accountId } });
}

export async function updateAccount(accountId: number, input: AccountInput) {
  const data: Prisma.AccountUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.primaryEmail !== undefined) data.primaryEmail = input.primaryEmail;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.addressLine1 !== undefined) data.addressLine1 = input.addressLine1;
  if (input.addressLine2 !== undefined) data.addressLine2 = input.addressLine2;
  if (input.postalCode !== undefined) data.postalCode = input.postalCode;
  if (input.city !== undefined) data.city = input.city;
  if (input.country !== undefined) data.country = input.country;
  if (input.locale !== undefined) data.locale = input.locale;
  if (input.timezone !== undefined) data.timezone = input.timezone;

  return prisma.account.update({
    where: { id: accountId },
    data,
  });
}
