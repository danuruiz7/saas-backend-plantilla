import { Resend } from 'resend';
import { env } from '@/config/env.js';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: `Reset your password — ${env.APP_NAME}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Password Reset</h2>
        <p>You requested a password reset for your <strong>${env.APP_NAME}</strong> account.</p>
        <p>Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;border-radius:6px;text-decoration:none;margin:16px 0;">
          Reset Password
        </a>
        <p style="color:#666;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#666;font-size:13px;">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  });
}

export async function sendInvitationEmail(to: string, tenantName: string, inviteUrl: string): Promise<void> {
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: `Has sido invitado a unirte a ${tenantName} en ${env.APP_NAME}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Invitación al equipo</h2>
        <p>Has sido invitado para unirte al equipo de <strong>${tenantName}</strong> en ${env.APP_NAME}.</p>
        <p>Haz clic en el botón de abajo para configurar tu cuenta. Este enlace expira en <strong>7 días</strong>.</p>
        <a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;border-radius:6px;text-decoration:none;margin:16px 0;">
          Aceptar Invitación
        </a>
        <p style="color:#666;font-size:13px;">Si no esperabas esta invitación, puedes ignorarla.</p>
        <p style="color:#666;font-size:13px;">O copia el enlace: ${inviteUrl}</p>
      </div>
    `,
  });
}
