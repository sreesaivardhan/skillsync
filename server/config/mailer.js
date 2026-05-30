// Email sender — uses Resend HTTP API (no SMTP, works on Render free tier)
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendMail = async ({ to, subject, html }) => {
  const { data, error } = await resend.emails.send({
    from: 'SkillSync <onboarding@resend.dev>',
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message || 'Resend API error');
  }

  return data;
};

