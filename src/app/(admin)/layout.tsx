import { getAdminSession } from "@/shared/auth/admin-session";
import { AdminShell } from "@/ui/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page renders without shell; authenticated pages get the shell.
  const session = await getAdminSession();

  if (!session) {
    return children;
  }

  return <AdminShell session={session}>{children}</AdminShell>;
}
