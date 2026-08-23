import { handleTelegramSessionFormPost } from "@/channels/telegram/server/session-form";

type RouteContext = {
  params: Promise<{ tenantSlug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { tenantSlug } = await context.params;
  return handleTelegramSessionFormPost(request, tenantSlug);
}
