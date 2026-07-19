/**
 * Transactional email templates for Kyntha.
 *
 * PHI BOUNDARY: Templates must not include raw PHI in subject/body/html.
 * Callers are responsible for ensuring content is non-clinical before invoking.
 */

export function emailVerificationEmail({
  name,
  verifyLink,
}: {
  name: string
  verifyLink: string
}): { subject: string; html: string } {
  const subject = 'Verify your Kyntha account'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #065f46;">Welcome to Kyntha, ${escapeHtml(name)}!</h2>
      <p style="color: #374151; font-size: 16px;">
        Please verify your email address to get started. This link expires in 60 minutes.
      </p>
      <p style="margin: 24px 0;">
        <a href="${verifyLink}" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Verify Email
        </a>
      </p>
      <p style="font-size: 12px; color: #6b7280;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <span style="word-break: break-all;">${escapeHtml(verifyLink)}</span>
      </p>
    </div>
  `
  return { subject, html }
}

export function appointmentConfirmationEmail({
  patientName,
  doctorName,
  date,
  time,
}: {
  patientName: string
  doctorName: string
  date: string
  time: string
}): { subject: string; html: string } {
  const subject = 'Appointment Confirmation'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #065f46;">Appointment Confirmed</h2>
      <p style="color: #374151; font-size: 16px;">
        Hi ${escapeHtml(patientName)}, your appointment has been booked.
      </p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Doctor:</strong> ${escapeHtml(doctorName)}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${escapeHtml(date)}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${escapeHtml(time)}</p>
      </div>
      <p style="font-size: 12px; color: #6b7280;">
        Please arrive 10 minutes before your scheduled time.
      </p>
    </div>
  `
  return { subject, html }
}

export function labResultsEmail({
  patientName,
  testName,
  date,
}: {
  patientName: string
  testName: string
  date: string
}): { subject: string; html: string } {
  const subject = 'Lab Results Ready'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #065f46;">Lab Results Available</h2>
      <p style="color: #374151; font-size: 16px;">
        Hi ${escapeHtml(patientName)}, your lab results are ready to view.
      </p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Test:</strong> ${escapeHtml(testName)}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${escapeHtml(date)}</p>
      </div>
      <p style="font-size: 12px; color: #6b7280;">
        Log in to your Kyntha account to view the full results.
      </p>
    </div>
  `
  return { subject, html }
}

export function medicationReminderEmail({
  patientName,
  medicationName,
  time,
}: {
  patientName: string
  medicationName: string
  time: string
}): { subject: string; html: string } {
  const subject = 'Medication Reminder'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #065f46;">Medication Reminder</h2>
      <p style="color: #374151; font-size: 16px;">
        Hi ${escapeHtml(patientName)}, it's time to take your medication.
      </p>
      <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>Medication:</strong> ${escapeHtml(medicationName)}</p>
        <p style="margin: 4px 0;"><strong>Time:</strong> ${escapeHtml(time)}</p>
      </div>
      <p style="font-size: 12px; color: #6b7280;">
        If you have questions about your medication, contact your provider.
      </p>
    </div>
  `
  return { subject, html }
}

export function familyInviteEmail({
  inviterName,
  familyName,
  inviteLink,
}: {
  inviterName: string
  familyName: string
  inviteLink: string
}): { subject: string; html: string } {
  const subject = 'You\'ve Been Invited to Join a Family on Kyntha'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #065f46;">Family Invitation</h2>
      <p style="color: #374151; font-size: 16px;">
        ${escapeHtml(inviterName)} has invited you to join <strong>${escapeHtml(familyName)}</strong> on Kyntha.
      </p>
      <p style="margin: 24px 0;">
        <a href="${inviteLink}" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Accept Invitation
        </a>
      </p>
      <p style="font-size: 12px; color: #6b7280;">
        If the button doesn't work, copy and paste this link into your browser:<br/>
        <span style="word-break: break-all;">${escapeHtml(inviteLink)}</span>
      </p>
    </div>
  `
  return { subject, html }
}

export function doctorVerificationEmail({
  doctorName,
  status,
}: {
  doctorName: string
  status: 'approved' | 'rejected'
}): { subject: string; html: string } {
  const isApproved = status === 'approved'
  const subject = isApproved
    ? 'Doctor Verification Approved'
    : 'Doctor Verification Update'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #065f46;">
        ${isApproved ? 'Verification Approved' : 'Verification Update'}
      </h2>
      <p style="color: #374151; font-size: 16px;">
        Hi Dr. ${escapeHtml(doctorName)}, your verification has been <strong>${escapeHtml(status)}</strong>.
      </p>
      ${isApproved
        ? '<p style="color: #374151; font-size: 16px;">You can now start accepting patients on Kyntha.</p>'
        : '<p style="color: #374151; font-size: 16px;">Please contact support for more details.</p>'
      }
    </div>
  `
  return { subject, html }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function passwordResetEmail({
  name,
  resetLink,
  expiresInMinutes = 30,
}: {
  name: string
  resetLink: string
  expiresInMinutes?: number
}): { subject: string; html: string } {
  const subject = 'Reset your Kyntha password'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #065f46;">Password reset requested</h2>
      <p style="color: #374151; font-size: 16px;">
        Hi ${escapeHtml(name)}, we received a request to reset your Kyntha password.
        This link expires in 30 minutes.
      </p>
      <p style="margin: 24px 0;">
        <a href="${resetLink}" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p style="font-size: 12px; color: #6b7280;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `
  return { subject, html }
}
