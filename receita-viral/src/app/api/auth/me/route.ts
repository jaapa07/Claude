import { json, route } from "@/lib/api";
import { getUserFromRequest } from "@/lib/auth/session";

export const GET = route(async (req) => json({ user: await getUserFromRequest(req) }));
