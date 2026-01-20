import nodemailer from "nodemailer";
import type { OrganizationInvite, Organization } from "@prisma/client";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Generic email sender
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn("SMTP credentials not configured, skipping email send");
      return { success: false, error: "Email service not configured" };
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"H-Tool" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent successfully:", info.messageId);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Generate HTML email template for invite
 */
function getInviteEmailTemplate(
  inviteLink: string,
  orgName: string,
  role: string,
  expiresInDays: number
): string {
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to join ${orgName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">You've been invited!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      You've been invited to join <strong>${orgName}</strong> as a <strong>${roleDisplay}</strong>.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 30px;">
      Click the button below to accept your invitation and get started:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${inviteLink}" style="display: inline-block; background: #10b981; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        Accept Invitation
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Or copy and paste this link into your browser:<br>
      <a href="${inviteLink}" style="color: #10b981; word-break: break-all;">${inviteLink}</a>
    </p>
    
    <p style="font-size: 12px; color: #9ca3af; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      This invitation will expire in ${expiresInDays} day${expiresInDays !== 1 ? 's' : ''}. 
      If you didn't expect this invitation, you can safely ignore this email.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>© ${new Date().getFullYear()} H-Tool. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send invite email with magic link
 */
export async function sendInviteEmail(
  invite: OrganizationInvite,
  organization: Organization | null
): Promise<{ success: boolean; error?: string }> {
  if (!invite.email) {
    return { success: false, error: "Invite email is required" };
  }

  if (!organization) {
    return { success: false, error: "Organization not found" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteLink = `${appUrl}/accept-invite/${invite.inviteCode}`;

  // Calculate days until expiration
  const expiresInDays = Math.ceil(
    (invite.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const html = getInviteEmailTemplate(
    inviteLink,
    organization.name,
    invite.role,
    expiresInDays
  );

  const result = await sendEmail(
    invite.email,
    `You've been invited to join ${organization.name} on H-Tool`,
    html
  );

  return result;
}
