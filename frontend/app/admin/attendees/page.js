"use client";

import { useEffect, useState } from "react";
import { Download, Eye, Printer, X } from "lucide-react";
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
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
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

  async function viewAttendee(attendee) {
    setDetailLoading(true);
    try {
      const data = await api(`/admin/attendees/${attendee.id}`);
      setDetail(data);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDetailLoading(false);
    }
  }

  function downloadTicketSvg() {
    if (!detail?.ticketEmail?.ticketSvg) return;
    downloadTextFile(detail.ticketEmail.ticketSvg, detail.ticketEmail.filename || `${detail.attendee.ticketCode}-ticket.svg`, "image/svg+xml");
    toast.success("Ticket template imepakuliwa.");
  }

  function downloadEmailHtml() {
    if (!detail?.ticketEmail?.html) return;
    downloadTextFile(detail.ticketEmail.html, `${detail.attendee.ticketCode}-email.html`, "text/html");
    toast.success("Email template imepakuliwa.");
  }

  function printTicketEmail() {
    if (!detail?.ticketEmail?.html) return;
    const frame = document.createElement("iframe");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(detail.ticketEmail.html);
    doc.close();
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 800);
    };
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
            { key: "days", label: "Siku", render: (a) => <Badge tone="neutral">{formatAttendanceDays(a.attendanceDays)}</Badge> },
            { key: "status", label: "Hali", render: (a) => <div className="grid gap-1.5"><Badge tone="neutral">{a.visitCount} ziara</Badge><Badge tone={a.foodClaimCount ? "ok" : "warn"}>{a.foodClaimCount ? `${a.foodClaimCount} chakula` : "Chakula bado"}</Badge></div> },
            { key: "actions", label: "", render: (a) => (
              <Button className="h-9 px-3" disabled={detailLoading} onClick={() => viewAttendee(a)} type="button" variant="secondary">
                {detailLoading ? <Spinner /> : <Eye size={15} />} View
              </Button>
            ) }
          ]}
        />
        </CardContent>
      </Card>
      {detail ? (
        <AttendeeDetailModal
          detail={detail}
          onClose={() => setDetail(null)}
          onDownloadEmail={downloadEmailHtml}
          onDownloadTicket={downloadTicketSvg}
          onPrint={printTicketEmail}
        />
      ) : null}
    </div>
  );
}

function formatAttendanceDays(days = []) {
  if (days.length === 2) return "24 & 25 Oct";
  return days[0] === "2026-10-25" ? "25 Oct" : "24 Oct";
}

function AttendeeDetailModal({ detail, onClose, onDownloadEmail, onDownloadTicket, onPrint }) {
  const attendee = detail.attendee;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[94vh] w-full overflow-hidden rounded-t-2xl border bg-background shadow-2xl sm:mx-auto sm:max-w-6xl sm:rounded-2xl">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div>
            <p className="text-xs font-bold uppercase text-primary">{attendee.ticketCode}</p>
            <h2 className="text-2xl font-bold tracking-normal">{attendee.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{attendee.email} · {attendee.phone}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="h-9 px-3" onClick={onDownloadTicket} type="button" variant="secondary"><Download size={15} /> Ticket SVG</Button>
            <Button className="h-9 px-3" onClick={onDownloadEmail} type="button" variant="secondary"><Download size={15} /> Email HTML</Button>
            <Button className="h-9 px-3" onClick={onPrint} type="button"><Printer size={15} /> Print</Button>
            <Button className="h-9 px-3" onClick={onClose} type="button" variant="secondary"><X size={15} /> Close</Button>
          </div>
        </div>

        <div className="grid max-h-[calc(94vh-96px)] gap-5 overflow-y-auto p-4 lg:grid-cols-[320px_minmax(0,1fr)] sm:p-5">
          <div className="grid content-start gap-4">
            <InfoPanel title="Details">
              <InfoRow label="Activity" value={attendee.activity} />
              <InfoRow label="Gender" value={attendee.gender} />
              <InfoRow label="Age" value={attendee.age} />
              <InfoRow label="Location" value={`${attendee.district}, ${attendee.region}`} />
              <InfoRow label="Days" value={formatAttendanceDays(attendee.attendanceDays)} />
              <InfoRow label="Booth visits" value={attendee.visitCount} />
              <InfoRow label="Food claims" value={attendee.foodClaimCount} />
            </InfoPanel>
            <InfoPanel title="Email delivery">
              {detail.emails.length ? detail.emails.map((email) => (
                <div className="rounded-md border p-3 text-sm" key={email.id}>
                  <div className="flex items-center justify-between gap-3">
                    <strong>{email.template}</strong>
                    <Badge tone={email.status === "sent" ? "ok" : email.status === "failed" ? "warn" : "neutral"}>{email.status}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{email.to_email}</p>
                  {email.error ? <p className="mt-1 text-amber-700">{email.error}</p> : null}
                </div>
              )) : <p className="text-sm text-muted-foreground">No email log found.</p>}
            </InfoPanel>
          </div>

          <div className="grid gap-3">
            <div>
              <h3 className="text-lg font-bold tracking-normal">Ticket email template</h3>
              <p className="text-sm text-muted-foreground">This is the same ticket template sent to the attendee, with QR and logo embedded for preview, print, and download.</p>
            </div>
            <div className="overflow-hidden rounded-xl border bg-white">
              <iframe
                className="h-[720px] w-full bg-white"
                title={`Ticket email for ${attendee.name}`}
                srcDoc={detail.ticketEmail.html}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPanel({ title, children }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="mb-3 text-sm font-bold uppercase text-muted-foreground">{title}</h3>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <strong className="max-w-[60%] text-right text-sm font-semibold">{value || "-"}</strong>
    </div>
  );
}

function downloadTextFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

