import { ClientDirectory } from "@/app/(protected)/clients/client-directory";
import { PageHeader } from "@/components/page-header";
import { listClients } from "@/data/clients";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await requireUser();
  const clients = await listClients(user.accountId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clients"
        description="Gérez vos clients, visualisez leurs chantiers et anticipez les besoins en ouvriers."
        helper="Filtrez par activité pour cibler vos prochaines relances."
      />
      <ClientDirectory
        clients={clients.map((client) => ({
          name: client.name,
          slug: client.slug,
          totalProjects: client.totalProjects,
          activeProjects: client.activeProjects,
          totalHours: client.totalHours,
          totalAmount: client.totalAmount,
          workerCount: client.workerCount,
          lastActivity: client.lastActivity ? client.lastActivity.toISOString() : null,
          contactName: client.profile?.contactName ?? null,
          email: client.profile?.email ?? null,
          phone: client.profile?.phone ?? null,
        }))}
      />
    </div>
  );
}
