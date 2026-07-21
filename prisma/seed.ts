import { config as loadEnv } from "dotenv";

// Prisma CLI loads `.env`; Next.js prefers `.env.local`. Support both for seed.
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@kina2.com";
  const supabaseUserId = process.env.SEED_ADMIN_SUPABASE_USER_ID || null;

  const tenant = await prisma.tenant.upsert({
    where: { slug: "kin-a2" },
    update: {
      name: "KIN A2 Milk",
      currency: "USD",
      isActive: true,
      config: {
        brand: "KIN A2",
        timezone: "Asia/Phnom_Penh",
        channels: ["telegram"],
        orderSequence: 1,
        checkout: {
          deliveryFeeMinor: 0,
          abaInstructions:
            "Transfer to ABA account KIN A2 Milk. Include your phone number as the payment reference.",
          pickupLocations: [
            {
              id: "kin-showroom",
              name: "KIN Showroom",
              address: "Phnom Penh",
            },
          ],
        },
      },
    },
    create: {
      slug: "kin-a2",
      name: "KIN A2 Milk",
      currency: "USD",
      isActive: true,
      config: {
        brand: "KIN A2",
        timezone: "Asia/Phnom_Penh",
        channels: ["telegram"],
        orderSequence: 1,
        checkout: {
          deliveryFeeMinor: 0,
          abaInstructions:
            "Transfer to ABA account KIN A2 Milk. Include your phone number as the payment reference.",
          pickupLocations: [
            {
              id: "kin-showroom",
              name: "KIN Showroom",
              address: "Phnom Penh",
            },
          ],
        },
      },
    },
  });

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      displayName: "KIN Admin",
      ...(supabaseUserId ? { supabaseUserId } : {}),
    },
    create: {
      email: adminEmail,
      displayName: "KIN Admin",
      supabaseUserId,
    },
  });

  await prisma.userTenantMembership.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: user.id,
      },
    },
    update: { role: "owner" },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: "owner",
    },
  });

  const categories = [
    { name: "Fresh Milk", slug: "fresh-milk", sortOrder: 1 },
    { name: "Bundles", slug: "bundles", sortOrder: 2 },
    { name: "Accessories", slug: "accessories", sortOrder: 3 },
  ];

  const categoryRecords = [];
  for (const category of categories) {
    const record = await prisma.category.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug: category.slug,
        },
      },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: true,
        deletedAt: null,
      },
      create: {
        tenantId: tenant.id,
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
    categoryRecords.push(record);
  }

  const freshMilk = categoryRecords.find((c) => c.slug === "fresh-milk");
  const bundles = categoryRecords.find((c) => c.slug === "bundles");

  const products = [
    {
      name: "KIN A2 Fresh Milk 1L",
      slug: "kin-a2-fresh-milk-1l",
      description: "Grass-fed A2 protein milk, 1 litre bottle.",
      priceMinor: 350,
      categoryId: freshMilk?.id,
      isAvailable: true,
      stockNote: "Daily delivery",
      sortOrder: 1,
    },
    {
      name: "KIN A2 Fresh Milk 500ml",
      slug: "kin-a2-fresh-milk-500ml",
      description: "Grass-fed A2 protein milk, 500ml bottle.",
      priceMinor: 200,
      categoryId: freshMilk?.id,
      isAvailable: true,
      stockNote: null,
      sortOrder: 2,
    },
    {
      name: "Weekly Family Bundle (7x 1L)",
      slug: "weekly-family-bundle-7x1l",
      description: "Seven 1L bottles for the week.",
      priceMinor: 2200,
      categoryId: bundles?.id,
      isAvailable: true,
      stockNote: "Best value",
      sortOrder: 1,
    },
    {
      name: "Starter Pack (3x 1L)",
      slug: "starter-pack-3x1l",
      description: "Try KIN A2 with three 1L bottles.",
      priceMinor: 990,
      categoryId: bundles?.id,
      isAvailable: true,
      stockNote: null,
      sortOrder: 2,
    },
    {
      name: "Gift Bottle Sleeve",
      slug: "gift-bottle-sleeve",
      description: "Reusable insulated sleeve for 1L bottles.",
      priceMinor: 500,
      categoryId: categoryRecords.find((c) => c.slug === "accessories")?.id,
      isAvailable: false,
      stockNote: "Coming soon",
      sortOrder: 1,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug: product.slug,
        },
      },
      update: {
        name: product.name,
        description: product.description,
        priceMinor: product.priceMinor,
        currency: tenant.currency,
        categoryId: product.categoryId,
        isAvailable: product.isAvailable,
        stockNote: product.stockNote,
        sortOrder: product.sortOrder,
        deletedAt: null,
      },
      create: {
        tenantId: tenant.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        priceMinor: product.priceMinor,
        currency: tenant.currency,
        categoryId: product.categoryId,
        isAvailable: product.isAvailable,
        stockNote: product.stockNote,
        sortOrder: product.sortOrder,
      },
    });
  }

  console.log("Seed complete:");
  console.log(`  Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`  Admin:  ${user.email}${supabaseUserId ? " [linked]" : " [no supabase id yet]"}`);
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Products: ${products.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
