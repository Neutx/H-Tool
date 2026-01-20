"use server";

import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import type { Organization, TeamMember, OrganizationInvite } from "@prisma/client";
import { TeamMemberRole } from "@prisma/client";
import { sendInviteEmail } from "@/lib/email-service";

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createOrganization(
  data: {
    name: string;
    shopifyStoreUrl?: string;
    websiteUrl?: string;
  },
  userId: string
): Promise<ActionResult<Organization & { teamMembers: TeamMember[] }>> {
  try {
    const organization = await prisma.organization.create({
      data: {
        name: data.name,
        shopifyStoreUrl: data.shopifyStoreUrl,
        websiteUrl: data.websiteUrl,
        ownerId: userId,
        teamMembers: {
          create: {
            userId,
            role: TeamMemberRole.owner,
            joinedAt: new Date(),
          },
        },
      },
      include: {
        teamMembers: true,
      },
    });

    // Set as active organization
    await prisma.userSession.upsert({
      where: { userId },
      update: {
        activeOrganizationId: organization.id,
        lastActiveAt: new Date(),
      },
      create: {
        userId,
        activeOrganizationId: organization.id,
        lastActiveAt: new Date(),
      },
    });

    return { success: true, data: organization };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create organization",
    };
  }
}

export async function getUserOrganizations(
  userId: string
): Promise<ActionResult<Organization[]>> {
  try {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
    });

    const organizations = memberships.map((m) => m.organization);
    return { success: true, data: organizations };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get organizations",
    };
  }
}

export async function createInvite(
  organizationId: string,
  role: TeamMemberRole,
  createdBy: string,
  email?: string,
  expiresInDays: number = 7
): Promise<ActionResult<OrganizationInvite>> {
  try {
    // Verify creator has permission (owner or admin)
    const creatorMembership = await prisma.teamMember.findUnique({
      where: {
        userId_organizationId: {
          userId: createdBy,
          organizationId,
        },
      },
    });

    if (!creatorMembership || (creatorMembership.role !== TeamMemberRole.owner && creatorMembership.role !== TeamMemberRole.admin)) {
      return {
        success: false,
        error: "Only owners and admins can create invites",
      };
    }

    // Check for duplicate pending invites
    if (email) {
      const existingInvite = await prisma.organizationInvite.findFirst({
        where: {
          organizationId,
          email,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (existingInvite) {
        return {
          success: false,
          error: "A pending invite already exists for this email",
        };
      }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = await prisma.organizationInvite.create({
      data: {
        organizationId,
        inviteCode: nanoid(12),
        email: email || null,
        role,
        expiresAt,
        createdBy,
      },
    });

    // Send email if email is provided
    if (email && invite) {
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (organization) {
        const emailResult = await sendInviteEmail(invite, organization);
        
        // Update email tracking even if email fails (for logging)
        await prisma.organizationInvite.update({
          where: { id: invite.id },
          data: {
            emailSentAt: emailResult.success ? new Date() : null,
            emailSentCount: emailResult.success ? 1 : 0,
            lastEmailSentAt: emailResult.success ? new Date() : null,
          },
        });

        // Don't fail invite creation if email fails, but log it
        if (!emailResult.success) {
          console.warn("Failed to send invite email:", emailResult.error);
        }
      }
    }

    return { success: true, data: invite };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create invite",
    };
  }
}

export async function acceptInvite(
  inviteCode: string,
  userId: string
): Promise<ActionResult<Organization & { teamMembers: TeamMember[] }>> {
  try {
    const invite = await prisma.organizationInvite.findUnique({
      where: { inviteCode },
      include: { organization: true },
    });

    if (!invite) {
      return {
        success: false,
        error: "Invalid invite code",
      };
    }

    if (invite.usedAt) {
      return {
        success: false,
        error: "This invite has already been used",
      };
    }

    if (invite.expiresAt < new Date()) {
      return {
        success: false,
        error: "This invite has expired",
      };
    }

    if (invite.email) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.email.toLowerCase() !== invite.email.toLowerCase()) {
        return {
          success: false,
          error: "This invite is for a different email address",
        };
      }
    }

    // Check if user is already a member
    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: invite.organizationId,
        },
      },
    });

    if (existingMembership) {
      return {
        success: false,
        error: "You are already a member of this organization",
      };
    }

    // Create team membership
    await prisma.teamMember.create({
      data: {
        userId,
        organizationId: invite.organizationId,
        role: invite.role,
        invitedBy: invite.createdBy,
        joinedAt: new Date(),
      },
    });

    // Mark invite as used
    await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date(),
        usedBy: userId,
      },
    });

    // Get updated organization
    const organization = await prisma.organization.findUnique({
      where: { id: invite.organizationId },
      include: {
        teamMembers: true,
      },
    });

    if (!organization) {
      return {
        success: false,
        error: "Organization not found",
      };
    }

    // Set as active organization
    await prisma.userSession.upsert({
      where: { userId },
      update: {
        activeOrganizationId: organization.id,
        lastActiveAt: new Date(),
      },
      create: {
        userId,
        activeOrganizationId: organization.id,
        lastActiveAt: new Date(),
      },
    });

    return { success: true, data: organization };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to accept invite",
    };
  }
}

export async function getTeamMembers(
  organizationId: string
): Promise<ActionResult<(TeamMember & { user: { id: string; name: string | null; email: string; avatar: string | null } })[]>> {
  try {
    const members = await prisma.teamMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: [
        { role: "asc" },
        { joinedAt: "asc" },
      ],
    });

    return { success: true, data: members };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get team members",
    };
  }
}

export async function updateMemberRole(
  teamMemberId: string,
  role: TeamMemberRole,
  updatedBy: string
): Promise<ActionResult<TeamMember>> {
  try {
    // Get the team member and verify permissions
    const member = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
      include: { organization: true },
    });

    if (!member) {
      return {
        success: false,
        error: "Team member not found",
      };
    }

    // Verify updater has permission (owner or admin, and can't change owner role)
    const updaterMembership = await prisma.teamMember.findUnique({
      where: {
        userId_organizationId: {
          userId: updatedBy,
          organizationId: member.organizationId,
        },
      },
    });

    if (!updaterMembership) {
      return {
        success: false,
        error: "You are not a member of this organization",
      };
    }

    if (updaterMembership.role !== TeamMemberRole.owner && updaterMembership.role !== TeamMemberRole.admin) {
      return {
        success: false,
        error: "Only owners and admins can update roles",
      };
    }

    if (member.role === TeamMemberRole.owner && role !== TeamMemberRole.owner) {
      return {
        success: false,
        error: "Cannot change owner role",
      };
    }

    if (role === TeamMemberRole.owner && member.role !== TeamMemberRole.owner) {
      return {
        success: false,
        error: "Only one owner is allowed per organization",
      };
    }

    const updated = await prisma.teamMember.update({
      where: { id: teamMemberId },
      data: { role },
    });

    return { success: true, data: updated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update member role",
    };
  }
}

export async function removeTeamMember(
  teamMemberId: string,
  removedBy: string
): Promise<ActionResult<void>> {
  try {
    const member = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
      include: { organization: true },
    });

    if (!member) {
      return {
        success: false,
        error: "Team member not found",
      };
    }

    // Verify remover has permission
    const removerMembership = await prisma.teamMember.findUnique({
      where: {
        userId_organizationId: {
          userId: removedBy,
          organizationId: member.organizationId,
        },
      },
    });

    if (!removerMembership) {
      return {
        success: false,
        error: "You are not a member of this organization",
      };
    }

    if (removerMembership.role !== TeamMemberRole.owner && removerMembership.role !== TeamMemberRole.admin) {
      return {
        success: false,
        error: "Only owners and admins can remove members",
      };
    }

    if (member.role === TeamMemberRole.owner) {
      return {
        success: false,
        error: "Cannot remove organization owner",
      };
    }

    await prisma.teamMember.delete({
      where: { id: teamMemberId },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove team member",
    };
  }
}

export async function getOrganizationInvites(
  organizationId: string
): Promise<ActionResult<OrganizationInvite[]>> {
  try {
    const invites = await prisma.organizationInvite.findMany({
      where: {
        organizationId,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { success: true, data: invites };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get invites",
    };
  }
}

export async function deleteInvite(
  inviteId: string,
  deletedBy: string
): Promise<ActionResult<void>> {
  try {
    const invite = await prisma.organizationInvite.findUnique({
      where: { id: inviteId },
      include: { organization: true },
    });

    if (!invite) {
      return {
        success: false,
        error: "Invite not found",
      };
    }

    // Verify deleter has permission
    const deleterMembership = await prisma.teamMember.findUnique({
      where: {
        userId_organizationId: {
          userId: deletedBy,
          organizationId: invite.organizationId,
        },
      },
    });

    if (!deleterMembership || (deleterMembership.role !== TeamMemberRole.owner && deleterMembership.role !== TeamMemberRole.admin)) {
      return {
        success: false,
        error: "Only owners and admins can delete invites",
      };
    }

    await prisma.organizationInvite.delete({
      where: { id: inviteId },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete invite",
    };
  }
}

export async function resendInviteEmail(
  inviteId: string,
  resendBy: string
): Promise<ActionResult<void>> {
  try {
    const invite = await prisma.organizationInvite.findUnique({
      where: { id: inviteId },
      include: { organization: true },
    });

    if (!invite) {
      return {
        success: false,
        error: "Invite not found",
      };
    }

    // Verify resender has permission
    const resenderMembership = await prisma.teamMember.findUnique({
      where: {
        userId_organizationId: {
          userId: resendBy,
          organizationId: invite.organizationId,
        },
      },
    });

    if (!resenderMembership || (resenderMembership.role !== TeamMemberRole.owner && resenderMembership.role !== TeamMemberRole.admin)) {
      return {
        success: false,
        error: "Only owners and admins can resend invites",
      };
    }

    // Check if invite is already used
    if (invite.usedAt) {
      return {
        success: false,
        error: "This invite has already been used",
      };
    }

    // Check if invite is expired
    if (invite.expiresAt < new Date()) {
      return {
        success: false,
        error: "This invite has expired",
      };
    }

    // Rate limiting: max 3 sends per invite
    if (invite.emailSentCount >= 3) {
      return {
        success: false,
        error: "Maximum resend limit reached (3 emails per invite)",
      };
    }

    // Check if last email was sent less than 1 hour ago
    if (invite.lastEmailSentAt) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (invite.lastEmailSentAt > oneHourAgo) {
        return {
          success: false,
          error: "Please wait at least 1 hour before resending",
        };
      }
    }

    if (!invite.email) {
      return {
        success: false,
        error: "Invite email is required",
      };
    }

    // Send email
    const emailResult = await sendInviteEmail(invite, invite.organization);

    // Update email tracking
    await prisma.organizationInvite.update({
      where: { id: inviteId },
      data: {
        emailSentAt: invite.emailSentAt || (emailResult.success ? new Date() : null),
        emailSentCount: invite.emailSentCount + (emailResult.success ? 1 : 0),
        lastEmailSentAt: emailResult.success ? new Date() : invite.lastEmailSentAt,
      },
    });

    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.error || "Failed to send email",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to resend invite email",
    };
  }
}

export async function updateOrganization(
  organizationId: string,
  data: {
    name?: string;
    shopifyStoreUrl?: string;
    websiteUrl?: string;
  },
  updatedBy: string
): Promise<ActionResult<Organization>> {
  try {
    // Verify updater has permission
    const updaterMembership = await prisma.teamMember.findUnique({
      where: {
        userId_organizationId: {
          userId: updatedBy,
          organizationId,
        },
      },
    });

    if (!updaterMembership || (updaterMembership.role !== TeamMemberRole.owner && updaterMembership.role !== TeamMemberRole.admin)) {
      return {
        success: false,
        error: "Only owners and admins can update organization",
      };
    }

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: data.name,
        shopifyStoreUrl: data.shopifyStoreUrl,
        websiteUrl: data.websiteUrl,
      },
    });

    return { success: true, data: organization };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update organization",
    };
  }
}
