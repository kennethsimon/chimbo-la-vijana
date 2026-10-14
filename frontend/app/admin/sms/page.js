"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  async function load(page = pagination.page) {
    setLoading(true);
    try {
      const data = await api(`/admin/sms-logs?page=${page}&pageSize=${pagination.pageSize}`);
      setLogs(data.smsLogs);
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

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Ujumbe"
        title="SMS logs"
        description="Angalia ujumbe wa tiketi uliotumwa, message ID, na delivery status kutoka kwa provider."
        action={
          <Button disabled={refreshing || loading} onClick={refreshDelivery} variant="secondary">
            {refreshing ? <Spinner /> : <RefreshCw size={16} />} Refresh delivery
          </Button>
        }
      />

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
              { key: "createdAt", label: "Muda", render: (log) => new Date(log.createdAt).toLocaleString() }
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function SendStatus({ log }) {
  const tone = log.status === "sent" ? "ok" : log.status === "failed" ? "err" : "warn";
  return (
    <div className="grid gap-1">
      <Badge tone={tone}>{log.status}</Badge>
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
