"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { RequireAuth } from "../../../components/RequireAuth";
import { api, downloadFile } from "../../../lib/api";
import { useToast } from "../../../components/ToastProvider";
import { Badge, Button, Card, CardContent, DataTable, PageHeader, Spinner } from "../../../components/ui";

export default function ScansPage() {
  return (
    <RequireAuth>
      {(user) => <Scans user={user} />}
    </RequireAuth>
  );
}

function Scans({ user }) {
  const [scans, setScans] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  async function load(page = pagination.page) {
    setLoading(true);
    try {
      const data = await api(`/admin/scans?page=${page}&pageSize=${pagination.pageSize}`);
      setScans(data.scans);
      setPagination(data.pagination || { page, pageSize: pagination.pageSize, total: data.scans.length, totalPages: 1 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, [toast]);

  async function exportScans() {
    setExporting(true);
    try {
      await downloadFile("/admin/scans/export", "scans.csv");
      toast.success("Scans CSV imepakuliwa.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Ufuatiliaji"
        title="Historia ya scan"
        description={hasRole(user, "admin") ? "Admin anaona scans zote za mabanda na chakula." : "Unaona scans ulizofanya wewe tu."}
        action={<Button disabled={exporting} onClick={exportScans} variant="secondary">{exporting ? <Spinner /> : <Download size={16} />} Export CSV</Button>}
      />
      <Card>
        <CardContent className="p-5">
        <DataTable
          loading={loading}
          rows={scans}
          pagination={pagination}
          onPageChange={load}
          emptyTitle="Hakuna scan zilizohifadhiwa bado"
          columns={[
            { key: "attendee", label: "Mshiriki", render: (scan) => <><strong>{scan.attendee_name}</strong><div className="text-sm text-muted-foreground">{scan.ticket_code}</div></> },
            { key: "type", label: "Aina", render: (scan) => <Badge tone={scan.type === "food" ? "warn" : "neutral"}>{scan.type === "food" ? "Chakula" : "Banda"}</Badge> },
            { key: "booth", label: "Banda/eneo", render: (scan) => <Badge tone="neutral">{scan.booth_name}</Badge> },
            { key: "survey", label: "Utafiti", render: (scan) => <>{scan.service || "-"}<div className="text-sm text-muted-foreground">Kuridhika: {scan.satisfaction || "-"}</div>{scan.question ? <div>{scan.question}</div> : null}</> },
            { key: "scanned_by", label: "Aliyescan" },
            { key: "created_at", label: "Muda", render: (scan) => new Date(scan.created_at).toLocaleString() }
          ]}
        />
        </CardContent>
      </Card>
    </div>
  );
}

function hasRole(user, role) {
  return user?.roles?.includes(role) || user?.role === role;
}

