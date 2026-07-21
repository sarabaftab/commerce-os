import { redirect } from "next/navigation";

export default function HomePage() {
  const tenantSlug = process.env.DEFAULT_TENANT_SLUG?.trim() || "kin-a2";
  redirect(`/${tenantSlug}`);
}
