import { notFound } from "next/navigation";
import { ClientDetailView } from "@/app/(protected)/clients/client-detail";
import { getClientBySlug } from "@/data/clients";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const user = await requireUser();
  const client = await getClientBySlug(user.accountId, params.slug);

  if (!client) {
    notFound();
  }

  const projects = client.projects.map((project) => ({
    id: project.id,
    name: project.name,
    archived: project.archived,
    billingRate: project.billingRate !== null ? Number(project.billingRate) : null,
    defaultHours: project.defaultHours !== null ? Number(project.defaultHours) : null,
    clientName: project.clientName,
    totalHours: project.totalHours,
    totalAmount: project.totalAmount,
    workerCount: project.workerCount,
    lastActivity: project.lastActivity ? project.lastActivity.toISOString() : null,
  }));

  return (
    <ClientDetailView
      client={{
        name: client.name,
        slug: client.slug,
        profile: client.profile
          ? {
              id: client.profile.id,
              name: client.profile.name,
              slug: client.profile.slug,
              contactName: client.profile.contactName,
              email: client.profile.email,
              phone: client.profile.phone,
              address: client.profile.address,
              notes: client.profile.notes,
            }
          : null,
        projects,
      }}
    />
  );
}
