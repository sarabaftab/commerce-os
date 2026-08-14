import { Inter, Manrope } from "next/font/google";

import { getAdminSession } from "@/shared/auth/admin-session";
import { AdminShell } from "@/ui/admin/admin-shell";

export const dynamic = "force-dynamic";

const adminSans = Inter({
  subsets: ["latin"],
  variable: "--font-admin-sans",
});

const adminDisplay = Manrope({
  subsets: ["latin"],
  variable: "--font-admin-display",
});

export default async function AdminGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page renders without shell; authenticated pages get the shell.
  const session = await getAdminSession();

  return (
    <div className={`${adminSans.variable} ${adminDisplay.variable}`}>
      {!session ? children : <AdminShell session={session}>{children}</AdminShell>}
    </div>
  );
}
