import { redirect } from "next/navigation";
import { cache } from "react";

import { AUTH_ROUTES } from "@/lib/auth-config";
import { getAuthenticatedUserId, getMiniAuthLoginUrl, getMiniAuthLogoutUrl, revokeMiniAuthSession } from "@/lib/auth-service";
import { prisma } from "@/lib/prisma";

export const getCurrentUser = cache(async () => {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          workspace: true,
        },
        orderBy: {
          workspace: {
            name: "asc",
          },
        },
      },
    },
  });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(getMiniAuthLoginUrl(AUTH_ROUTES.postLogin));
  }
  return user;
}

export { getMiniAuthLoginUrl, getMiniAuthLogoutUrl, revokeMiniAuthSession };
