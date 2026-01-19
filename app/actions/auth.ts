"use server";

import { prisma } from "@/lib/prisma";
import type { User, UserSession, TeamMember } from "@prisma/client";

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function syncUserToDatabase(
  firebaseUid: string
): Promise<ActionResult<User & { teamMemberships: TeamMember[] }>> {
  try {
    // This will be called from client, but we need Firebase user data
    // For now, we'll need to pass the user data from client
    // In a real implementation, you'd verify the Firebase token server-side
    throw new Error("syncUserToDatabase should be called with user data from client");
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync user",
    };
  }
}

export async function syncUserToDatabaseWithData(
  firebaseUid: string,
  email: string,
  name?: string,
  avatar?: string
): Promise<ActionResult<User & { teamMemberships: TeamMember[] }>> {
  try {
    // Find or create user
    const user = await prisma.user.upsert({
      where: { firebaseUid },
      update: {
        email,
        name: name || undefined,
        avatar: avatar || undefined,
        updatedAt: new Date(),
      },
      create: {
        firebaseUid,
        email,
        name: name || undefined,
        avatar: avatar || undefined,
      },
      include: {
        teamMemberships: true,
      },
    });

    return { success: true, data: user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync user",
    };
  }
}

export async function getUserSession(
  userId: string
): Promise<ActionResult<UserSession>> {
  try {
    let session = await prisma.userSession.findUnique({
      where: { userId },
    });

    if (!session) {
      session = await prisma.userSession.create({
        data: {
          userId,
          lastActiveAt: new Date(),
        },
      });
    } else {
      // Update last active time
      session = await prisma.userSession.update({
        where: { userId },
        data: {
          lastActiveAt: new Date(),
        },
      });
    }

    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get user session",
    };
  }
}

export async function setActiveOrganization(
  userId: string,
  organizationId: string
): Promise<ActionResult<UserSession>> {
  try {
    // Verify user is a member of this organization
    const membership = await prisma.teamMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      return {
        success: false,
        error: "User is not a member of this organization",
      };
    }

    // Update or create session
    const session = await prisma.userSession.upsert({
      where: { userId },
      update: {
        activeOrganizationId: organizationId,
        lastActiveAt: new Date(),
      },
      create: {
        userId,
        activeOrganizationId: organizationId,
        lastActiveAt: new Date(),
      },
    });

    return { success: true, data: session };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to set active organization",
    };
  }
}
