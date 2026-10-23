import { config } from "./config.js";

export function registrationSmsText(ticketCode) {
  return `Asante kwa kujisajili Chimbo la Vijana! Tunatazamia kukuona. Tiketi yako ni ${ticketCode}. Ihifadhi kwa ajili ya kuingia kwenye tukio.`;
}

export function parseSmsSendResponse(data) {
  const message = Array.isArray(data?.messages) ? data.messages[0] : null;
  if (!message) {
    return {
      status: "failed",
      messageId: null,
      providerReference: null,
      providerStatusName: null,
      providerStatusGroup: null,
      error: "SMS provider returned no message result"
    };
  }

  const providerStatusName = message.status?.name || null;
  const providerStatusGroup = message.status?.groupName || null;
  const rejected = providerStatusGroup === "REJECTED" || String(providerStatusName || "").startsWith("FAILED_");

  return {
    status: rejected ? "failed" : "sent",
    messageId: message.messageId ? String(message.messageId) : null,
    providerReference: String(message.messageId || message.sendReference || "") || null,
    providerStatusName,
    providerStatusGroup,
    error: rejected
      ? message.status?.description || providerStatusName || "SMS provider rejected the message"
      : null
  };
}

export async function sendRegistrationSms({ attendee, ticketCode }) {
  if (!config.smsApiToken || !config.smsSenderId) {
    return {
      status: "skipped",
      messageId: null,
      providerReference: null,
      providerStatusName: null,
      providerStatusGroup: null,
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
        providerReference: null,
        providerStatusName: null,
        providerStatusGroup: null,
        error: data.message || `SMS API returned HTTP ${response.status}`,
        response: data
      };
    }

    const parsed = parseSmsSendResponse(data);
    return {
      ...parsed,
      response: data
    };
  } catch (error) {
    return {
      status: "failed",
      messageId: null,
      providerReference: null,
      providerStatusName: null,
      providerStatusGroup: null,
      error: error.message || "Failed to send SMS",
      response: null
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getSmsDeliveryReport(messageId) {
  if (!config.smsApiToken) {
    return {
      status: "skipped",
      error: "SMS_API_TOKEN is not configured",
      report: null
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const url = new URL(`${config.smsApiBaseUrl.replace(/\/$/, "")}/api/v2/reports`);
    url.searchParams.set("messageId", messageId);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.smsApiToken}`,
        Accept: "application/json"
      },
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        status: "failed",
        error: data.message || `SMS report API returned HTTP ${response.status}`,
        report: data
      };
    }

    return {
      status: "ok",
      error: null,
      report: Array.isArray(data.results) ? data.results[0] || null : null,
      response: data
    };
  } catch (error) {
    return {
      status: "failed",
      error: error.message || "Failed to fetch SMS delivery report",
      report: null
    };
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeSmsPhone(phone) {
  return String(phone).trim().replace(/^\+/, "");
}
