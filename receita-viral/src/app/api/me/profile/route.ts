import { prisma } from "@/lib/db";
import { json, parseBody, requireUser, route } from "@/lib/api";
import { profileSchema } from "@/lib/validation";

export const GET = route(async (req) => {
  const user = await requireUser(req);
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, bio: true, avatarUrl: true, dietaryPrefs: true, allergies: true, notifyNewRecipes: true, role: true, createdAt: true },
  });
  return json({ profile });
});

export const PUT = route(async (req) => {
  const user = await requireUser(req);
  const data = await parseBody(req, profileSchema);
  const profile = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.name,
      bio: data.bio ?? null,
      avatarUrl: data.avatarUrl || null,
      dietaryPrefs: data.dietaryPrefs,
      allergies: data.allergies,
      notifyNewRecipes: data.notifyNewRecipes,
    },
    select: { id: true, name: true, bio: true, avatarUrl: true, dietaryPrefs: true, allergies: true, notifyNewRecipes: true },
  });
  return json({ profile });
});
