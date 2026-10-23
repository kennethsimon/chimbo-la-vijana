"use client";

import { useEffect, useState } from "react";
import { RefreshCw, RotateCcw } from "lucide-react";
import { RequireAuth } from "../../../components/RequireAuth";
import { api, post } from "../../../lib/api";
import { useToast } from "../../../components/ToastProvider";
import { Badge, Button, Card, CardContent, DataTable, PageHeader, Spinner } from "../../../components/ui";

export default function SmsLogsPage() {
  return (
    <RequireAuth role="admin">
      {() => <SmsLogs />}
    </RequireAuth>
  );
}

function SmsLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState({ total: 0, sent: 0, failed: 0, skipped: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingAll, setRetryingAll] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const toast = useToast();

  async function load(page = pagination.page) {
    setLoading(true);
    try {
      const data = await api(`/admin/sms-logs?page=${page}&pageSize=${pagination.pageSize}`);
      setLogs(data.smsLogs);
      setSummary(data.summary || { total: 0, sent: 0, failed: 0, skipped: 0 });
      setPagination(data.pagination || { page, pageSize: pagination.pageSize, total: data.smsLogs.length, totalPages: 1 });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, []);

  async function refreshDelivery() {
    setRefreshing(true);
    try {
      const result = await post("/admin/sms-logs/refresh");
      toast.success(`Delivery status refreshed: ${result.refreshed}/${result.checked} updated.`);
      await load(pagination.page);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRefreshing(false);
    }
  }

  async function retryFailed() {
    setRetryingAll(true);
    try {
      const result = await post("/admin/sms-logs/retry-failed");
      const message = `Retry complete: ${result.sent} sent, ${result.failed + result.skipped} not sent.`;
      result.failed || result.skipped ? toast.error(message) : toast.success(message);
      await load(1);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRetryingAll(false);
    }
  }

  async function retryOne(log) {
    setRetryingId(log.id);
    try {
      const result = await post(`/admin/sms-logs/${log.id}/retry`);
      result.sent ? toast.success("SMS sent successfully.") : toast.error(result.results?.[0]?.error || "SMS was not sent.");
      await load(pagination.page);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Ujumbe"
        title="SMS logs"
        description="Angalia ujumbe wa tiketi uliotumwa, message ID, na delivery status kutoka kwa provider."
        action={<div className="flex flex-wrap gap-2">
          <Button disabled={retryingAll || loading || !(summary.failed + summary.skipped)} onClick={retryFailed}>
            {retryingAll ? <Spinner /> : <RotateCcw size={16} />} Retry failed ({summary.failed + summary.skipped})
          </Button>
          <Button disabled={refreshing || loading} onClick={refreshDelivery} variant="secondary">
            {refreshing ? <Spinner /> : <RefreshCw size={16} />} Refresh delivery
          </Button>
        </div>}
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SmsMetric label="Tracked" value={summary.total} />
        <SmsMetric label="Sent" value={summary.sent} tone="text-emerald-700" />
        <SmsMetric label="Failed" value={summary.failed} tone="text-red-700" />
        <SmsMetric label="Skipped" value={summary.skipped} tone="text-amber-700" />
      </section>

      <Card>
        <CardContent className="p-5">
          <DataTable
            loading={loading}
            rows={logs}
            pagination={pagination}
            onPageChange={load}
            emptyTitle="Hakuna SMS logs bado"
            columns={[
              { key: "attendee", label: "Mshiriki", render: (log) => <><strong>{log.attendeeName || "-"}</strong><div className="text-sm text-muted-foreground">{log.ticketCode || "-"}</div></> },
              { key: "phone", label: "Simu", render: (log) => log.toPhone },
              { key: "sent", label: "Kutuma", render: (log) => <SendStatus log={log} /> },
              { key: "delivery", label: "Delivery", render: (log) => <DeliveryStatus log={log} /> },
              { key: "messageId", label: "Message ID", render: (log) => <span className="text-xs text-muted-foreground">{log.providerMessageId || "-"}</span> },
              { key: "createdAt", label: "Muda", render: (log) => new Date(log.createdAt).toLocaleString() },
              { key: "action", label: "", render: (log) => isRetryable(log) ? (
                <Button className="h-8 px-2" disabled={Boolean(retryingId) || retryingAll} onClick={() => retryOne(log)} variant="secondary">
                  {retryingId === log.id ? <Spinner /> : <RotateCcw size={14} />} Retry
                </Button>
              ) : null }
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SmsMetric({ label, value, tone = "text-foreground" }) {
  return <div className="border-l-2 border-border px-3 py-1"><div className="text-xs font-semibold text-muted-foreground">{label}</div><div className={`text-xl font-bold ${tone}`}>{value}</div></div>;
}

function isRetryable(log) {
  const delivery = String(log.deliveryStatusName || log.deliveryStatus || "").toUpperCase();
  return log.isLatest && (
    log.status === "failed" || log.status === "skipped" ||
    ["REJECTED", "UNDELIVERABLE", "EXPIRED", "DELETED"].includes(delivery)
  );
}

function SendStatus({ log }) {
  const tone = log.status === "sent" ? "ok" : log.status === "failed" ? "err" : "warn";
  return (
    <div className="grid gap-1">
      <Badge tone={tone}>{log.status}</Badge>
      {log.retryOf ? <span className="text-xs font-semibold text-primary">Retry attempt</span> : null}
      {log.providerStatusName ? <span className="max-w-xs text-xs text-muted-foreground">{log.providerStatusName}</span> : null}
      {log.error ? <span className="max-w-xs text-xs text-amber-700">{log.error}</span> : null}
    </div>
  );
}

function DeliveryStatus({ log }) {
  const label = log.deliveryStatusName || log.deliveryStatus || (log.status === "sent" ? "Pending report" : "-");
  const normalized = String(label).toUpperCase();
  const tone = normalized === "DELIVERED" || normalized === "READ"
    ? "ok"
    : normalized.includes("REJECT") || normalized.includes("UNDELIVERABLE") || normalized.includes("EXPIRED")
      ? "err"
      : "neutral";

  return (
    <div className="grid gap-1">
      <Badge tone={tone}>{label}</Badge>
      {log.deliveryGroupName ? <span className="text-xs text-muted-foreground">{log.deliveryGroupName}</span> : null}
      {log.providerDoneAt ? <span className="text-xs text-muted-foreground">{new Date(log.providerDoneAt).toLocaleString()}</span> : null}
    </div>
  );
}
