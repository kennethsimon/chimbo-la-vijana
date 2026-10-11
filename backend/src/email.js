import { readFileSync } from "node:fs";
import QRCode from "qrcode";
import { Resend } from "resend";
import { config } from "./config.js";

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;
const logoBuffer = readFileSync(new URL("../../frontend/public/chimbo-logo.png", import.meta.url));

export async function makeQrPng(ticketCode) {
  return QRCode.toBuffer(ticketCode, {
    type: "png",
    margin: 2,
    width: 360,
    errorCorrectionLevel: "M"
  });
}

export async function sendTicketEmail({ attendee, ticketCode }) {
  const qrBuffer = await makeQrPng(ticketCode);
  const qrBase64 = qrBuffer.toString("base64");
  const logoBase64 = logoBuffer.toString("base64");
  const eventName = escapeHtml(config.eventName);
  const attendeeName = escapeHtml(attendee.name);
  const safeTicketCode = escapeHtml(ticketCode);
  const ticketSvg = makeTicketSvg({ eventName, attendeeName, safeTicketCode, qrBase64, logoBase64 });
  const html = `
    <div style="margin:0;padding:0;background:#f4f7f7;font-family:Arial,Helvetica,sans-serif;color:#142326;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f7;margin:0;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #dfe8e8;border-radius:22px;overflow:hidden;">
              <tr>
                <td style="background:#0d4f4f;padding:24px 28px;color:#ffffff;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="width:74px;vertical-align:top;padding:0 18px 0 0;">
                        <img alt="Chimbo logo" src="cid:chimbo-logo" width="62" height="62" style="display:block;width:62px;height:62px;border:0;border-radius:12px;background:#ffffff;" />
                      </td>
                      <td style="vertical-align:top;">
                        <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f6c453;font-weight:700;">Tiketi imethibitishwa</p>
                        <h1 style="margin:0;font-size:32px;line-height:1.08;font-weight:800;">${eventName}</h1>
                        <p style="margin:10px 0 0;font-size:15px;line-height:1.5;color:#d9efef;">Karibu kwenye tukio. Hii ndiyo tiketi yako rasmi ya kuingia na kuthibitishwa kwenye huduma.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:26px 28px 10px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="vertical-align:top;padding:0 20px 20px 0;">
                        <p style="margin:0 0 6px;font-size:13px;color:#6b7b7c;">Jina la mshiriki</p>
                        <p style="margin:0 0 22px;font-size:22px;line-height:1.25;font-weight:700;color:#111b1e;">${attendeeName}</p>

                        <p style="margin:0 0 6px;font-size:13px;color:#6b7b7c;">Namba ya tiketi</p>
                        <div style="display:inline-block;margin:0 0 20px;padding:12px 16px;border:1px dashed #0d8f87;border-radius:12px;background:#effafa;color:#0a5d58;font-size:28px;font-weight:800;letter-spacing:2px;">${safeTicketCode}</div>

                        <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:2px;">
                          <tr>
                            <td style="padding:0 18px 12px 0;">
                              <p style="margin:0 0 4px;font-size:12px;color:#6b7b7c;text-transform:uppercase;letter-spacing:.8px;">Tarehe</p>
                              <p style="margin:0;font-size:15px;font-weight:700;color:#111b1e;">Event day</p>
                            </td>
                            <td style="padding:0 0 12px;">
                              <p style="margin:0 0 4px;font-size:12px;color:#6b7b7c;text-transform:uppercase;letter-spacing:.8px;">Mahali</p>
                              <p style="margin:0;font-size:15px;font-weight:700;color:#111b1e;">Venue entrance</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                      <td align="center" style="vertical-align:top;width:190px;padding:0 0 20px;">
                        <div style="border:1px solid #dfe8e8;border-radius:18px;background:#ffffff;padding:12px;">
                          <img alt="QR code for ${safeTicketCode}" src="cid:ticket-qr" width="166" height="166" style="display:block;width:166px;height:166px;border:0;" />
                        </div>
                        <p style="margin:10px 0 0;font-size:12px;line-height:1.4;color:#6b7b7c;">Scan QR hii langoni au kwenye banda.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0 28px 28px;">
                  <div style="border-top:1px dashed #cad8d8;padding-top:18px;">
                    <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:#111b1e;">Maelekezo muhimu</p>
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#5d6e70;">Weka email hii tayari siku ya tukio. Kama QR haitasomeka, toa namba ya tiketi <strong>${safeTicketCode}</strong> kwa mhudumu. Tiketi kamili imeambatanishwa kama faili la picha.</p>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  if (!resend) {
    return { status: "skipped", resendMessageId: null, error: "RESEND_API_KEY is not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: config.emailFrom,
      to: attendee.email,
      subject: `${config.eventName} ticket: ${ticketCode}`,
      html,
      attachments: [
        {
          filename: "chimbo-logo.png",
          content: logoBuffer,
          contentType: "image/png",
          inlineContentId: "chimbo-logo"
        },
        {
          filename: `${ticketCode}-qr.png`,
          content: qrBuffer,
          contentType: "image/png",
          inlineContentId: "ticket-qr"
        },
        {
          filename: `${ticketCode}-ticket.svg`,
          content: Buffer.from(ticketSvg),
          contentType: "image/svg+xml"
        }
      ]
    });
    return {
      status: "sent",
      resendMessageId: result?.data?.id || null,
      error: null
    };
  } catch (error) {
    return {
      status: "failed",
      resendMessageId: null,
      error: error.message || "Failed to send email"
    };
  }
}

export async function sendStaffCredentialsEmail({ user, password, roles }) {
  const logoBase64 = logoBuffer.toString("base64");
  const eventName = escapeHtml(config.eventName);
  const safeName = escapeHtml(user.name);
  const safeEmail = escapeHtml(user.email);
  const safePassword = escapeHtml(password);
  const roleText = escapeHtml(formatRoles(roles));
  const boothName = user.booth_name || user.boothName || "";
  const safeBooth = escapeHtml(boothName || "Not assigned");
  const loginUrl = `${config.frontendUrl.replace(/\/$/, "")}/login`;
  const safeLoginUrl = escapeHtml(loginUrl);
  const credentialSvg = makeCredentialSvg({
    eventName,
    safeName,
    safeEmail,
    safePassword,
    roleText,
    safeBooth,
    logoBase64
  });

  const html = `
    <div style="margin:0;padding:0;background:#f4f7f7;font-family:Arial,Helvetica,sans-serif;color:#142326;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f7;margin:0;padding:28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #dfe8e8;border-radius:22px;overflow:hidden;">
              <tr>
                <td style="background:#0d4f4f;padding:24px 28px;color:#ffffff;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td style="width:74px;vertical-align:top;padding:0 18px 0 0;">
                        <img alt="Chimbo logo" src="cid:chimbo-logo" width="62" height="62" style="display:block;width:62px;height:62px;border:0;border-radius:12px;background:#ffffff;" />
                      </td>
                      <td style="vertical-align:top;">
                        <p style="margin:0 0 8px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f6c453;font-weight:700;">Akaunti ya dashboard</p>
                        <h1 style="margin:0;font-size:30px;line-height:1.08;font-weight:800;">${eventName}</h1>
                        <p style="margin:10px 0 0;font-size:15px;line-height:1.5;color:#d9efef;">Umeongezwa kwenye timu ya tukio. Tumia taarifa hizi kuingia kwenye mfumo.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:28px;">
                  <p style="margin:0 0 6px;font-size:13px;color:#6b7b7c;">Jina</p>
                  <p style="margin:0 0 18px;font-size:22px;line-height:1.25;font-weight:700;color:#111b1e;">${safeName}</p>

                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dfe8e8;border-radius:16px;background:#fbfdfd;margin:0 0 22px;">
                    <tr>
                      <td style="padding:18px;border-bottom:1px solid #edf2f2;">
                        <p style="margin:0 0 5px;font-size:12px;text-transform:uppercase;letter-spacing:1.4px;color:#6b7b7c;font-weight:700;">Email</p>
                        <p style="margin:0;font-size:17px;font-weight:700;color:#111b1e;">${safeEmail}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:18px;border-bottom:1px solid #edf2f2;">
                        <p style="margin:0 0 5px;font-size:12px;text-transform:uppercase;letter-spacing:1.4px;color:#6b7b7c;font-weight:700;">Temporary password</p>
                        <div style="display:inline-block;padding:12px 16px;border:1px dashed #0d8f87;border-radius:12px;background:#effafa;color:#0a5d58;font-size:24px;font-weight:800;letter-spacing:1px;">${safePassword}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:18px;">
                        <p style="margin:0 0 5px;font-size:12px;text-transform:uppercase;letter-spacing:1.4px;color:#6b7b7c;font-weight:700;">Roles</p>
                        <p style="margin:0;font-size:16px;font-weight:700;color:#111b1e;">${roleText}</p>
                        <p style="margin:8px 0 0;font-size:14px;color:#5d6e70;">Banda: <strong>${safeBooth}</strong></p>
                      </td>
                    </tr>
                  </table>

                  <a href="${safeLoginUrl}" style="display:inline-block;border-radius:12px;background:#111b1e;color:#ffffff;text-decoration:none;padding:13px 18px;font-size:15px;font-weight:800;">Ingia kwenye dashboard</a>
                  <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#5d6e70;">Kwa usalama, badilisha password yako mara ya kwanza ukiingia. Kama hukutarajia email hii, wasiliana na msimamizi wa tukio.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  if (!resend) {
    return { status: "skipped", resendMessageId: null, error: "RESEND_API_KEY is not configured" };
  }

  try {
    const result = await resend.emails.send({
      from: config.emailFrom,
      to: user.email,
      subject: `${config.eventName} dashboard credentials`,
      html,
      attachments: [
        {
          filename: "chimbo-logo.png",
          content: logoBuffer,
          contentType: "image/png",
          inlineContentId: "chimbo-logo"
        },
        {
          filename: `${safeFileName(user.email)}-credentials.svg`,
          content: Buffer.from(credentialSvg),
          contentType: "image/svg+xml"
        }
      ]
    });
    return {
      status: "sent",
      resendMessageId: result?.data?.id || null,
      error: null
    };
  } catch (error) {
    return {
      status: "failed",
      resendMessageId: null,
      error: error.message || "Failed to send email"
    };
  }
}

function makeTicketSvg({ eventName, attendeeName, safeTicketCode, qrBase64, logoBase64 }) {
  return `
<svg width="1000" height="620" viewBox="0 0 1000 620" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1000" height="620" rx="36" fill="#F4F7F7"/>
  <rect x="40" y="40" width="920" height="540" rx="32" fill="white" stroke="#DCE7E7" stroke-width="2"/>
  <path d="M40 72C40 54.3269 54.3269 40 72 40H928C945.673 40 960 54.3269 960 72V212H40V72Z" fill="#0D4F4F"/>
  <image href="data:image/png;base64,${logoBase64}" x="78" y="75" width="82" height="82" preserveAspectRatio="xMidYMid meet"/>
  <text x="185" y="91" fill="#F6C453" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="4">TIKETI IMETHIBITISHWA</text>
  <text x="185" y="138" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="48" font-weight="800">${escapeSvg(eventName)}</text>
  <text x="185" y="174" fill="#D9EFEF" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="500">Tiketi rasmi ya kuingia na kuthibitishwa kwenye huduma</text>
  <text x="82" y="274" fill="#6B7B7C" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700">Jina la mshiriki</text>
  <text x="82" y="322" fill="#111B1E" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="800">${escapeSvg(attendeeName)}</text>
  <text x="82" y="390" fill="#6B7B7C" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700">Namba ya tiketi</text>
  <rect x="82" y="414" width="322" height="80" rx="14" fill="#EFFAFA" stroke="#0D8F87" stroke-width="2" stroke-dasharray="5 5"/>
  <text x="110" y="466" fill="#0A5D58" font-family="Arial, Helvetica, sans-serif" font-size="40" font-weight="800" letter-spacing="3">${escapeSvg(safeTicketCode)}</text>
  <text x="82" y="536" fill="#6B7B7C" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" letter-spacing="2">TAREHE</text>
  <text x="82" y="562" fill="#111B1E" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="800">Event day</text>
  <text x="222" y="536" fill="#6B7B7C" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" letter-spacing="2">MAHALI</text>
  <text x="222" y="562" fill="#111B1E" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="800">Venue entrance</text>
  <rect x="675" y="270" width="210" height="210" rx="24" fill="white" stroke="#DCE7E7" stroke-width="2"/>
  <image href="data:image/png;base64,${qrBase64}" x="695" y="290" width="170" height="170"/>
  <text x="780" y="520" text-anchor="middle" fill="#5D6E70" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700">Scan QR hii langoni au kwenye banda</text>
</svg>`;
}

function makeCredentialSvg({ eventName, safeName, safeEmail, safePassword, roleText, safeBooth, logoBase64 }) {
  return `
<svg width="1000" height="620" viewBox="0 0 1000 620" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1000" height="620" rx="36" fill="#F4F7F7"/>
  <rect x="40" y="40" width="920" height="540" rx="32" fill="white" stroke="#DCE7E7" stroke-width="2"/>
  <path d="M40 72C40 54.3269 54.3269 40 72 40H928C945.673 40 960 54.3269 960 72V216H40V72Z" fill="#0D4F4F"/>
  <image href="data:image/png;base64,${logoBase64}" x="78" y="76" width="82" height="82" preserveAspectRatio="xMidYMid meet"/>
  <text x="185" y="93" fill="#F6C453" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="4">AKAUNTI YA DASHBOARD</text>
  <text x="185" y="140" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="800">${escapeSvg(eventName)}</text>
  <text x="185" y="176" fill="#D9EFEF" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="500">Taarifa zako za kuingia kwenye mfumo wa tukio</text>
  <text x="82" y="286" fill="#6B7B7C" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700">Jina</text>
  <text x="82" y="334" fill="#111B1E" font-family="Arial, Helvetica, sans-serif" font-size="36" font-weight="800">${escapeSvg(safeName)}</text>
  <text x="82" y="402" fill="#6B7B7C" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700">Email</text>
  <text x="82" y="438" fill="#111B1E" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800">${escapeSvg(safeEmail)}</text>
  <text x="82" y="500" fill="#6B7B7C" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700">Roles</text>
  <text x="82" y="536" fill="#111B1E" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="800">${escapeSvg(roleText)}</text>
  <rect x="586" y="290" width="322" height="104" rx="18" fill="#EFFAFA" stroke="#0D8F87" stroke-width="2" stroke-dasharray="5 5"/>
  <text x="616" y="328" fill="#6B7B7C" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700">Temporary password</text>
  <text x="616" y="368" fill="#0A5D58" font-family="Arial, Helvetica, sans-serif" font-size="31" font-weight="800" letter-spacing="1">${escapeSvg(safePassword)}</text>
  <text x="586" y="466" fill="#6B7B7C" font-family="Arial, Helvetica, sans-serif" font-size="19" font-weight="700">Banda</text>
  <text x="586" y="502" fill="#111B1E" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="800">${escapeSvg(safeBooth)}</text>
  <text x="586" y="552" fill="#5D6E70" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700">Badilisha password baada ya kuingia.</text>
</svg>`;
}

function formatRoles(roles = []) {
  const labels = { admin: "Admin", exhibitor: "Banda", food: "Chakula" };
  return roles.map((role) => labels[role] || role).join(" · ");
}

function safeFileName(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dashboard-user";
}

function escapeSvg(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

