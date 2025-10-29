import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorker } from "@/data/workers";
import { getCompanySettings } from "@/data/company";
import { computeWorkerCompliance } from "@/utils/compliance";
import WorkerProfile from "@/app/(protected)/(modules)/workers/worker-profile";
import { requireUser } from "@/lib/auth";
export const dynamic = "force-dynamic";

export default async function WorkerProfilePage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    notFound();
  }

  const user = await requireUser();
  const accountId = user.accountId;

  const worker = await getWorker(accountId, id);
  if (!worker) {
    return notFound();
  }

  const companySettings = await getCompanySettings(accountId);
  const compliance = computeWorkerCompliance(worker, companySettings ?? null);

  return (
    <div className="space-y-4">
      <Link href="/workers" className="text-sm text-slate-500 hover:text-slate-700">
        ← Retour à la liste
      </Link>
      <WorkerProfile worker={worker} compliance={compliance} companySettings={companySettings ?? null} />
    </div>
  );
}
