import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";

type Props = {
  children: ReactNode;
};

export default async function ProtectedLayout({ children }: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  return <AppShell userEmail={user.email}>{children}</AppShell>;
}
