import SettingsPanel from "@/app/(protected)/settings/settings-panel";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { getAccount } from "@/data/account";
import { getCompanySettings } from "@/data/company";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
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
    <div className="space-y-8">
      <PageHeader
        title="Paramètres"
        description="Centralisez les informations de votre compte, suivez la conformité BCE et préparez vos futures intégrations."
        helper={
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <Badge variant="warning">Priorité</Badge>
            <span>La conformité BCE influence les exports paie : vérifiez vos documents avant chaque envoi.</span>
          </div>
        }
      />
      <SettingsPanel
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
    </div>
  );
}
