import { getUniqueOrganizationSlug } from "@/app/_domains/organization/_services/get-unique-organization-slug";
import { prisma } from "@workspace/db";
import type { BetterAuthOptions } from "better-auth";

export const databaseHooks: NonNullable<BetterAuthOptions["databaseHooks"]> = {
  user: {
    create: {
      after: async (user) => {
        // A Reviewer signing in (ADR-0021) is a client, not a workspace user:
        // no default Organization, no marketing preferences. Their Reviewer
        // name travels onto the user record so the admin list names them.
        const reviewer = await prisma.reviewer.findFirst({
          where: {
            email: { equals: user.email, mode: "insensitive" },
            isActive: true,
          },
          select: { id: true, name: true },
        });
        if (reviewer) {
          await prisma.user.update({
            where: { id: user.id },
            data: { name: reviewer.name },
          });
          return;
        }

        // Create marketing preferences record
        await prisma.marketingPreferences.create({
          data: {
            userId: user.id,
            acceptsNewsletter: false,
            acceptsMarketing: false,
          },
        });

        // Generate a unique slug for the default organization
        const organizationSlug =
          await getUniqueOrganizationSlug("My organization");

        // Create a default organization for every new user
        await prisma.organization.create({
          data: {
            name: "My organization",
            slug: organizationSlug,
            isDefault: true,
            members: {
              create: [
                {
                  userId: user.id,
                  role: "owner",
                },
              ],
            },
          },
        });
      },
    },
    update: {
      // Better Auth passes the updated user directly, not { data, oldData }
      after: async (user) => {
        console.info(`[audit] user.updated userId=${user.id}`);
      },
    },
  },

  session: {
    create: {
      before: async (session) => {
        try {
          // Retrieve the user's default organization
          const defaultOrg = await prisma.organization.findFirst({
            where: {
              members: {
                some: {
                  userId: session.userId,
                },
              },
              isDefault: true,
            },
          });

          // Return the modified session with activeOrganizationId set
          // This directly modifies the session before database persistence
          return {
            data: {
              ...session,
              activeOrganizationId: defaultOrg?.id ?? null,
            },
          };
        } catch (error) {
          console.error(
            "Error setting default organization for user session:",
            error,
          );

          // Return session without active organization on error
          return {
            data: {
              ...session,
              activeOrganizationId: null,
            },
          };
        }
      },
      after: async (session) => {
        console.info(`[audit] session.created userId=${session.userId}`);
      },
    },
  },
};
