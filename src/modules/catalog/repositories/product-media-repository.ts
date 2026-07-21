import { prisma } from "@/shared/db/prisma";

export async function replacePrimaryMedia(input: {
  tenantId: string;
  productId: string;
  url: string | null;
  alt?: string | null;
}) {
  await prisma.productMedia.deleteMany({
    where: { productId: input.productId, tenantId: input.tenantId },
  });

  if (!input.url) {
    return null;
  }

  return prisma.productMedia.create({
    data: {
      tenantId: input.tenantId,
      productId: input.productId,
      url: input.url,
      alt: input.alt ?? null,
      sortOrder: 0,
    },
  });
}
