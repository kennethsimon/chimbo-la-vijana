"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { RequireAuth } from "../../../components/RequireAuth";
import { api, downloadFile } from "../../../lib/api";
import { useToast } from "../../../components/ToastProvider";
import { Badge, Button, Card, CardContent, DataTable, Field, PageHeader, Spinner, TextInput } from "../../../components/ui";

export default function AttendeesPage() {
  return (
    <RequireAuth role="admin">
      {() => <Attendees />}
    </RequireAuth>
  );
}

function Attendees() {
  const [q, setQ] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const toast = useToast();

  async function load(page = pagination.page, query = q) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pagination.pageSize)
      });
      if (query) params.set("q", query);
      const data = await api(`/admin/attendees?${params.toString()}`);
      setAttendees(data.attendees);
      setPagination(data.pagination || { page, pageSize: pagination.pageSize, total: data.attendees.length, totalPages: 1 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, "");
  }, []);

  async function exportAttendees() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      await downloadFile(`/admin/attendees/export${params.toString() ? `?${params.toString()}` : ""}`, "attendees.csv");
      toast.success("Attendees CSV imepakuliwa.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Usajili"
        title="Washiriki"
        description="Tafuta na fuatilia hali ya washiriki wote waliosajiliwa."
        action={<Button disabled={exporting} onClick={exportAttendees} variant="secondary">{exporting ? <Spinner /> : <Download size={16} />} Export CSV</Button>}
      />
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
          <Field className="w-full sm:max-w-lg" label="Tafuta mshiriki">
            <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jina, simu, email, au ticket code" />
          </Field>
          <Button onClick={() => load(1)} disabled={loading}>{loading ? <Spinner /> : null}{loading ? "Inatafuta..." : "Tafuta"}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
        <DataTable
          loading={loading}
          rows={attendees}
          pagination={pagination}
          onPageChange={(page) => load(page)}
          emptyTitle={loading ? "Inapakia washiriki..." : "Hakuna washiriki waliopatikana"}
          columns={[
            { key: "name", label: "Mshiriki", render: (a) => <><strong>{a.name}</strong><div className="text-sm text-muted-foreground">{a.activity}</div></> },
            { key: "ticketCode", label: "Tiketi", render: (a) => <span className="rounded-md bg-secondary px-2 py-1 text-sm font-black text-primary">{a.ticketCode}</span> },
            { key: "contact", label: "Mawasiliano", render: (a) => <>{a.phone}<div className="text-sm text-muted-foreground">{a.email}</div></> },
            { key: "location", label: "Eneo", render: (a) => <>{a.district}<div className="text-sm text-muted-foreground">{a.region}</div></> },
            { key: "status", label: "Hali", render: (a) => <div className="grid gap-1.5"><Badge tone="neutral">{a.visitCount} ziara</Badge><Badge tone={a.foodClaimedAt ? "ok" : "warn"}>{a.foodClaimedAt ? "Chakula kimetumika" : "Chakula bado"}</Badge></div> }
          ]}
        />
        </CardContent>
      </Card>
    </div>
  );
}

