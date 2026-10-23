import test from "node:test";
import assert from "node:assert/strict";
import { parseSmsSendResponse } from "../src/sms.js";

test("parseSmsSendResponse accepts an enroute provider response", () => {
  const result = parseSmsSendResponse({
    messages: [{ messageId: 123, status: { name: "ENROUTE (SENT)", groupName: "PENDING" } }]
  });

  assert.equal(result.status, "sent");
  assert.equal(result.messageId, "123");
  assert.equal(result.providerReference, "123");
  assert.equal(result.error, null);
});

test("parseSmsSendResponse rejects a successful HTTP response with a provider failure", () => {
  const result = parseSmsSendResponse({
    messages: [{
      sendReference: "ref-123",
      status: {
        name: "FAILED_NOT_ENOUGH_CREDITS",
        groupName: "REJECTED",
        description: "Not enough credits"
      }
    }]
  });

  assert.equal(result.status, "failed");
  assert.equal(result.providerReference, "ref-123");
  assert.equal(result.providerStatusName, "FAILED_NOT_ENOUGH_CREDITS");
  assert.equal(result.error, "Not enough credits");
});

test("parseSmsSendResponse rejects an empty provider response", () => {
  const result = parseSmsSendResponse({ messages: [] });
  assert.equal(result.status, "failed");
  assert.match(result.error, /no message result/i);
});
