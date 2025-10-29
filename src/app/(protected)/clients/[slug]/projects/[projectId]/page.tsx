import { redirect } from "next/navigation";

export default function ClientProjectRedirect({
  params,
  searchParams,
}: {
  params: { slug: string; projectId: string };
  searchParams?: { month?: string };
}) {
  const query = new URLSearchParams();
  if (params.projectId) {
    query.set("projectId", params.projectId);
  }
  if (searchParams?.month) {
    query.set("month", searchParams.month);
  }
  const target = query.toString()
    ? `/clients/${params.slug}?${query.toString()}`
    : `/clients/${params.slug}`;
  redirect(target);
}
