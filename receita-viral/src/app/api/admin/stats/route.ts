import { json, requireAdmin, route } from "@/lib/api";
import { getAdminStats } from "@/app/admin/_lib/stats";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  await requireAdmin(req);
  return json(await getAdminStats());
});
