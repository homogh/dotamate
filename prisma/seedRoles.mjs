import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RESOURCES = [
  "USERS",
  "POSTS",
  "REPORTS",
  "SESSIONS",
  "REFERENCE_DATA",
  "ANNOUNCEMENTS",
  "AUDIT_LOG",
  "BLOG",
  "ROLES",
  "TICKETS",
];

const ROLES = [
  {
    name: "مدیر کل",
    description: "کنترل مطلق و همه‌جانبه روی تمامی بخش‌ها، دسترسی تام امنیتی",
    editable: false,
    permissions: Object.fromEntries(RESOURCES.map((r) => [r, "EDIT"])),
  },
  {
    name: "ادمین بن و گزارش",
    description: "مدیریت گزارش‌های تخلف، انسداد موقت و دائمی کاربران خاطی",
    editable: true,
    permissions: {
      USERS: "EDIT",
      POSTS: "EDIT",
      REPORTS: "EDIT",
      SESSIONS: "VIEW",
      REFERENCE_DATA: "NONE",
      ANNOUNCEMENTS: "VIEW",
      AUDIT_LOG: "NONE",
      BLOG: "VIEW",
      ROLES: "NONE",
      TICKETS: "VIEW",
    },
  },
  {
    name: "ادیتور وبلاگ",
    description: "نگارش، ویرایش و تایید مقالات، اخبار و راهنماهای دیسکورد",
    editable: true,
    permissions: {
      USERS: "NONE",
      POSTS: "NONE",
      REPORTS: "NONE",
      SESSIONS: "NONE",
      REFERENCE_DATA: "NONE",
      ANNOUNCEMENTS: "NONE",
      AUDIT_LOG: "NONE",
      BLOG: "EDIT",
      ROLES: "NONE",
      TICKETS: "NONE",
    },
  },
];

for (const roleDef of ROLES) {
  const role = await prisma.role.upsert({
    where: { name: roleDef.name },
    create: { name: roleDef.name, description: roleDef.description, editable: roleDef.editable },
    update: { description: roleDef.description, editable: roleDef.editable },
  });

  for (const resource of RESOURCES) {
    const level = roleDef.permissions[resource] ?? "NONE";
    await prisma.rolePermission.upsert({
      where: { roleId_resource: { roleId: role.id, resource } },
      create: { roleId: role.id, resource, level },
      update: { level },
    });
  }

  console.log(`Seeded role: ${roleDef.name} (id ${role.id})`);
}

const referenceEntries = [
  ...["HERALD", "GUARDIAN", "CRUSADER", "ARCHON", "LEGEND", "ANCIENT", "DIVINE", "IMMORTAL"].map((key, i) => ({
    category: "RANK",
    key,
    label: key.charAt(0) + key.slice(1).toLowerCase(),
    sortOrder: i + 1,
  })),
  ...[
    ["POS1", "Pos 1 - Carry", 1],
    ["POS2", "Pos 2 - Mid", 2],
    ["POS3", "Pos 3 - Offlane", 3],
    ["POS4", "Pos 4 - Soft Support", 4],
    ["POS5", "Pos 5 - Hard Support", 5],
  ].map(([key, label, sortOrder]) => ({ category: "POSITION", key, label, sortOrder })),
  ...[
    ["EU_WEST", "اروپا غربی", 1, true],
    ["EU_EAST", "اروپا شرقی", 2, true],
    ["RUSSIA", "روسیه", 3, true],
    ["DUBAI", "دبی", 4, true],
  ].map(([key, label, sortOrder, active]) => ({ category: "REGION", key, label, sortOrder, active })),
  ...[
    ["RANKED_ALL_PICK", "Ranked All Pick", 1],
    ["ALL_PICK", "All Pick", 2],
    ["TURBO", "Turbo", 3],
    ["CAPTAINS_MODE", "Captains Mode", 4],
  ].map(([key, label, sortOrder]) => ({ category: "GAME_MODE", key, label, sortOrder })),
];

for (const entry of referenceEntries) {
  await prisma.referenceEntry.upsert({
    where: { category_key: { category: entry.category, key: entry.key } },
    create: { ...entry, active: entry.active ?? true },
    update: { label: entry.label, sortOrder: entry.sortOrder },
  });
}
console.log(`Seeded ${referenceEntries.length} reference entries`);

await prisma.$disconnect();
