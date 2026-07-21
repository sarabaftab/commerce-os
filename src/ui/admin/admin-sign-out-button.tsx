"use client";

import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/shared/auth/supabase/client";
import { Button } from "@/ui/components/ui/button";

export function AdminSignOutButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-full"
      onClick={async () => {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        router.push("/admin/login");
        router.refresh();
      }}
    >
      Sign out
    </Button>
  );
}
