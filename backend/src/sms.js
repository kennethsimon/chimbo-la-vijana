import { config } from "./config.js";

export function registrationSmsText(ticketCode) {
  return `Asante kwa kujisajili Chimbo la Vijana! Tunatazamia kukuona. Tiketi yako ni ${ticketCode}. Ihifadhi kwa ajili ya kuingia kwenye tukio.`;
}

export async function sendRegistrationSms({ attendee, ticketCode }) {
  if (!config.smsApiToken || !config.smsSenderId) {
    return {
      status: "skipped",
      messageId: null,
      error: "SMS_API_TOKEN or SMS_SENDER_ID is not configured",
      response: null
    };
  }

  const payload = {
    from: config.smsSenderId,
    to: normalizeSmsPhone(attendee.phone),
    text: registrationSmsText(ticketCode),
    flash: 0,
    reference: ticketCode
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${config.smsApiBaseUrl.replace(/\/$/, "")}/api/sms/v2/text/single`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.smsApiToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        status: "failed",
        messageId: null,
        error: data.message || `SMS API returned HTTP ${response.status}`,
        response: data
      };
    }

    const firstMessage = Array.isArray(data.messages) ? data.messages[0] : null;
    return {
      status: "sent",
      messageId: firstMessage?.messageId ? String(firstMessage.messageId) : null,
      error: null,
      response: data
    };
  } catch (error) {
    return {
      status: "failed",
      messageId: null,
      error: error.message || "Failed to send SMS",
      response: null
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeSmsPhone(phone) {
  return String(phone).trim().replace(/^\+/, "");
}
