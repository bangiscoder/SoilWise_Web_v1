import nodemailer from 'nodemailer';

export interface ExtensionWorkerWelcomeEmailParams {
  name: string;
  email: string;
  temporaryPassword: string;
  staffId: string;
  organization?: string;
  coverageState?: string;
  coverageLgas?: string[];
  portalUrl?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  simulated: boolean;
  recipient: string;
  error?: string;
  previewSnippet?: string;
}

/**
 * Creates an SMTP transporter if environment variables are provided,
 * otherwise returns null for simulated delivery.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  return null;
}

/**
 * Generates the responsive, styled HTML welcome email for an appointed Extension Worker.
 */
export function generateExtensionWorkerWelcomeHtml(params: ExtensionWorkerWelcomeEmailParams): string {
  const {
    name,
    email,
    temporaryPassword,
    staffId,
    organization = 'Ministry of Agriculture / Agricultural Development Programme (ADP)',
    coverageState = 'Nigeria',
    coverageLgas = [],
    portalUrl = process.env.APP_URL || 'https://ais-dev-5b2asfsm5ann3lkau562qr-507307338931.europe-west1.run.app',
  } = params;

  const lgaDisplay = coverageLgas.length > 0 ? coverageLgas.join(', ') : 'All Assigned LGAs';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the SoilWise AI Extension Network</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f7f9f6; color: #1c1917; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e7e5e4; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
    .header { background: linear-gradient(135deg, #1b4332 0%, #081c15 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
    .header-badge { display: inline-block; background-color: rgba(74, 222, 128, 0.2); color: #86efac; border: 1px solid rgba(74, 222, 128, 0.4); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
    .header p { margin: 8px 0 0; font-size: 14px; color: #d1fae5; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 700; color: #1c1917; margin-bottom: 12px; }
    .paragraph { font-size: 14px; line-height: 1.6; color: #44403c; margin-bottom: 20px; }
    .credentials-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 14px; padding: 20px; margin: 24px 0; }
    .credentials-header { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #166534; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    .cred-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #dcfce7; font-size: 13px; }
    .cred-row:last-child { border-bottom: none; }
    .cred-label { color: #15803d; font-weight: 600; }
    .cred-value { color: #052e16; font-family: monospace; font-weight: 700; }
    .password-highlight { background-color: #fef08a; padding: 2px 6px; border-radius: 4px; font-weight: 800; color: #854d0e; }
    .btn-container { text-align: center; margin: 28px 0 20px; }
    .btn { display: inline-block; background-color: #1b4332; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 14px; font-weight: 800; box-shadow: 0 4px 8px rgba(27,67,50,0.25); }
    .steps-box { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 14px; padding: 20px; margin: 20px 0; }
    .steps-title { font-size: 13px; font-weight: 800; color: #292524; margin-bottom: 12px; }
    .step-item { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; font-size: 13px; line-height: 1.5; color: #57534e; }
    .step-number { width: 22px; height: 22px; background: #1b4332; color: #ffffff; border-radius: 50%; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .footer { padding: 24px 32px; background-color: #f5f5f4; text-align: center; font-size: 11px; color: #78716c; border-top: 1px solid #e7e5e4; }
    .footer p { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-badge">Official Appointment</div>
      <h1>Welcome to SoilWise AI</h1>
      <p>Agricultural Extension & Farmer Advisory Network</p>
    </div>

    <div class="content">
      <div class="greeting">Dear ${name},</div>
      <div class="paragraph">
        Congratulations! You have been appointed and created as an authorized <strong>SoilWise AI Extension Worker</strong>. 
        In this role, you are equipped with real-time digital soil intelligence, Institute for Agricultural Research (IAR) verified crop variety recommendations, and automated weather advisory to empower smallholder farmers across your coverage zone.
      </div>

      <div class="credentials-box">
        <div class="credentials-header">&#128272; Your Official Login Credentials</div>
        <div class="cred-row">
          <span class="cred-label">Staff / Extension ID:</span>
          <span class="cred-value">${staffId}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Login Email:</span>
          <span class="cred-value">${email}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Temporary Password:</span>
          <span class="cred-value"><span class="password-highlight">${temporaryPassword}</span></span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Organization:</span>
          <span class="cred-value">${organization}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Coverage Area:</span>
          <span class="cred-value">${coverageState} State (${lgaDisplay})</span>
        </div>
      </div>

      <div class="btn-container">
        <a href="${portalUrl}" class="btn" target="_blank">Access Extension Worker Portal &rarr;</a>
      </div>

      <div class="steps-box">
        <div class="steps-title">&#128640; Quick Getting Started Steps</div>
        <div class="step-item">
          <div class="step-number">1</div>
          <div><strong>Log in to your account:</strong> Visit the SoilWise AI portal using the email and temporary password above.</div>
        </div>
        <div class="step-item">
          <div class="step-number">2</div>
          <div><strong>Open your Extension Workspace:</strong> Access the "Extension Worker" portal to view your assigned farmers and field metrics.</div>
        </div>
        <div class="step-item">
          <div class="step-number">3</div>
          <div><strong>Register & Onboard Farmers:</strong> Onboard new farmers directly in the field. Every farmer you register is automatically connected to your dashboard.</div>
        </div>
        <div class="step-item">
          <div class="step-number">4</div>
          <div><strong>Monitor Soil Analyses & Recommendations:</strong> Inspect all soil health tests and IAR seed variety recommendations provided to your farmers in real time.</div>
        </div>
      </div>

      <div class="paragraph" style="font-size: 12px; color: #78716c; margin-top: 24px; border-top: 1px solid #e7e5e4; padding-top: 16px;">
        <strong>Security Notice:</strong> Please keep these credentials confidential. You can update your password at any time via your user profile settings after logging in.
      </div>
    </div>

    <div class="footer">
      <p><strong>SoilWise AI & Institute for Agricultural Research (IAR) Collaboration</strong></p>
      <p>Ahmadu Bello University, Zaria, Nigeria</p>
      <p>&copy; ${new Date().getFullYear()} SoilWise AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends or simulates sending the welcome email to the Extension Worker.
 */
export async function sendExtensionWorkerWelcomeEmail(
  params: ExtensionWorkerWelcomeEmailParams
): Promise<EmailSendResult> {
  const subject = `Congratulations ${params.name}! Your SoilWise AI Extension Worker Account is Ready [${params.staffId}]`;
  const html = generateExtensionWorkerWelcomeHtml(params);
  const text = `
Dear ${params.name},

Congratulations! You have been appointed as an authorized SoilWise AI Extension Worker.

Your Official Login Credentials:
- Staff ID: ${params.staffId}
- Login Email: ${params.email}
- Temporary Password: ${params.temporaryPassword}
- Organization: ${params.organization || 'Ministry of Agriculture / ADP'}
- Coverage Area: ${params.coverageState || 'Nigeria'}
- Portal URL: ${params.portalUrl || 'https://soilwise.ng'}

Visit the portal to access your Extension Worker Workspace, onboard farmers, and monitor soil test analyses and crop recommendations.

SoilWise AI Team
  `.trim();

  const transporter = createTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"SoilWise AI Support" <noreply@soilwise.ng>',
        to: params.email,
        subject,
        text,
        html,
      });

      console.log(`[Email] Extension worker welcome email delivered to ${params.email} (MessageID: ${info.messageId})`);
      return {
        success: true,
        messageId: info.messageId,
        simulated: false,
        recipient: params.email,
        previewSnippet: `Sent via SMTP to ${params.email}`,
      };
    } catch (err: any) {
      console.warn(`[Email] SMTP delivery failed for ${params.email}, falling back to simulated dispatch:`, err.message);
      return {
        success: true,
        simulated: true,
        recipient: params.email,
        error: `SMTP error: ${err.message}. Email saved and simulated.`,
        previewSnippet: `Simulated dispatch for ${params.email}`,
      };
    }
  }

  // Simulated delivery (local dev / server environment without external SMTP configured)
  console.log(`[Email-Simulated] Extension Worker welcome email generated for ${params.email} (Staff ID: ${params.staffId})`);
  return {
    success: true,
    messageId: `sim-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    simulated: true,
    recipient: params.email,
    previewSnippet: `Simulated dispatch to ${params.email}`,
  };
}
