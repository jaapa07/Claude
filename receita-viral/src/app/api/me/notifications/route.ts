import { z } from "zod";
import { prisma } from "@/lib/db";
import { json, parseBody, requireUser, route } from "@/lib/api";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const take = Math.min(Number(new URL(req.url).searchParams.get("take")) || 50, 100);
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);
  return json({ items, unread });
});

export const PATCH = route(async (req) => {
  const user = await requireUser(req);
  const body = await parseBody(req, z.object({ all: z.boolean().optional(), ids: z.array(z.string()).max(100).optional() }));
  await prisma.notification.updateMany({
    where: { userId: user.id, ...(body.all ? {} : { id: { in: body.ids ?? [] } }) },
    data: { read: true },
  });
  return json({ ok: true });
});

export const DELETE = route(async (req) => {
  const user = await requireUser(req);
  await prisma.notification.deleteMany({ where: { userId: user.id, read: true } });
  return json({ ok: true });
});
