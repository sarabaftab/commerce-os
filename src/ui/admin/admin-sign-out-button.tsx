"use client";

import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/shared/auth/supabase/client";
import { Button } from "@/ui/components/ui/button";
import { cn } from "@/ui/lib/utils";

type AdminSignOutButtonProps = {
  compact?: boolean;
};

export function AdminSignOutButton({ compact = false }: AdminSignOutButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "border-[color:var(--admin-line)] bg-transparent text-[color:var(--admin-ink)] hover:bg-[color:var(--admin-surface)]",
        compact ? "h-8 px-3" : "w-full",
      )}
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
