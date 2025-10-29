import { getAccount } from "@/data/account";
import { getCompanySettings } from "@/data/company";
import CompanySettingsPanel from "@/app/(protected)/(modules)/company/settings-panel";
import { requireUser } from "@/lib/auth";
export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const user = await requireUser();
  const accountId = user.accountId;

  const [settings, account] = await Promise.all([getCompanySettings(accountId), getAccount(accountId)]);

  const serializedSettings = settings
    ? {
        id: settings.id,
        bceFileName: settings.bceFileName,
        bceFileUrl: settings.bceFileUrl,
        validUntil: settings.validUntil ? settings.validUntil.toISOString().slice(0, 10) : null,
        verified: settings.verified,
      }
    : null;

  const serializedAccount = account ?? settings?.account;

  return (
    <CompanySettingsPanel
      settings={serializedSettings}
      account={
        serializedAccount
          ? {
              id: serializedAccount.id,
              name: serializedAccount.name,
              primaryEmail: serializedAccount.primaryEmail ?? "",
              phone: serializedAccount.phone ?? "",
              addressLine1: serializedAccount.addressLine1 ?? "",
              addressLine2: serializedAccount.addressLine2 ?? "",
              postalCode: serializedAccount.postalCode ?? "",
              city: serializedAccount.city ?? "",
              country: serializedAccount.country ?? "",
              locale: serializedAccount.locale ?? "fr-BE",
              timezone: serializedAccount.timezone ?? "Europe/Brussels",
            }
          : null
      }
    />
  );
}
