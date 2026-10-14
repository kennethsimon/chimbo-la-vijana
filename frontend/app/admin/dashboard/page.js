"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Mail,
  MessageSquareText,
  QrCode,
  TrendingUp,
  UsersRound,
  Utensils
} from "lucide-react";
import { RequireAuth } from "../../../components/RequireAuth";
import { useLanguage } from "../../../components/LanguageProvider";
import { api } from "../../../lib/api";
import { Badge, Card, CardContent, EmptyState, StatusAlert } from "../../../components/ui";

const CHART_COLORS = ["#0f766e", "#f59e0b", "#2563eb", "#ef4444", "#7c3aed", "#10b981", "#111827", "#64748b"];

export default function DashboardPage() {
  return (
    <RequireAuth role="admin">
      {() => <Dashboard />}
    </RequireAuth>
  );
}

function Dashboard() {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/admin/dashboard").then(setData).catch((err) => setError(err.message));
  }, []);

  const totals = data?.totals || {};
  const attendeeTotal = Number(totals.attendees || 0);
  const foodRate = percentage(totals.foodClaims, attendeeTotal);
  const smsRate = percentage(totals.smsSentAttendees, attendeeTotal);
  const emailRate = percentage(totals.emailSentAttendees, attendeeTotal);

  const communicationRows = useMemo(() => {
    const sms = data?.communications?.smsStatus || [];
    const delivery = data?.communications?.smsDeliveryStatus || [];
    const email = data?.communications?.emailStatus || [];
    return { sms, delivery, email };
  }, [data]);

  if (error) return <StatusAlert type="err">{error}</StatusAlert>;
  if (!data) {
    return (
      <div className="grid gap-4">
        <Card><CardContent className="h-32 animate-pulse bg-secondary/50" /></Card>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => <Card key={index}><CardContent className="h-32 animate-pulse bg-secondary/50" /></Card>)}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:gap-6">
      <section className="rounded-[14px] border bg-card p-5 shadow-none sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge tone="ok">Admin analytics</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">{t("dashboardTitle")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{t("dashboardSubtitle")}</p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Activity size={16} /> Live data
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<UsersRound size={20} />} label="Total attendees" value={attendeeTotal} hint="Registered coupons" />
        <MetricCard icon={<MessageSquareText size={20} />} label="SMS sent rate" value={`${smsRate}%`} hint={`${formatNumber(totals.smsSentAttendees)} sent`} tone="amber" />
        <MetricCard icon={<Mail size={20} />} label="Email sent rate" value={`${emailRate}%`} hint={`${formatNumber(totals.emailSentAttendees)} tickets`} tone="blue" />
        <MetricCard icon={<Utensils size={20} />} label="Food claim rate" value={`${foodRate}%`} hint={`${formatNumber(totals.unclaimedFood)} unclaimed`} tone="red" />
        <MetricCard icon={<QrCode size={20} />} label="Booth scans" value={totals.visits} hint={`${formatNumber(totals.exhibitors)} exhibitors`} tone="dark" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Registration trend" description="Daily attendee registrations">
          <TrendBars rows={data.operations?.registrationTrend || []} />
        </Panel>
        <Panel title="Attendance days" description="Which event days attendees selected">
          <DonutChart rows={data.demographics?.attendanceDays || []} />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Panel title="Gender" description="Attendee gender split">
          <DonutChart rows={data.demographics?.gender || []} />
        </Panel>
        <Panel title="Age groups" description="Age distribution from registrations">
          <BarChart rows={data.demographics?.ageGroups || []} />
        </Panel>
        <Panel title="Current activity" description="What attendees are doing now">
          <BarChart rows={data.demographics?.activity || []} maxRows={6} />
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="Location" description="Top regions and districts">
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <BarChart rows={data.demographics?.region || []} maxRows={6} title="Regions" />
            <BarChart rows={data.districts || []} maxRows={6} title="Districts" />
          </div>
        </Panel>
        <Panel title="Communication status" description="SMS, delivery reports, and email ticket status">
          <div className="grid gap-4">
            <StatusBars title="SMS API" rows={communicationRows.sms} />
            <StatusBars title="SMS delivery" rows={communicationRows.delivery} />
            <StatusBars title="Email tickets" rows={communicationRows.email} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Operations" description="Food claims and booth engagement">
          <div className="grid gap-5 lg:grid-cols-2">
            <DonutChart rows={data.operations?.foodClaims || []} centerLabel="Food" />
            <BarChart rows={(data.topBooths || []).map((row) => ({ label: row.name, count: row.visits }))} maxRows={8} title="Top booths" />
          </div>
        </Panel>
        <Panel title="Recent activity" description="Latest registrations, booth scans, and food claims">
          <RecentActivity rows={data.recentActivity || []} />
        </Panel>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, hint, tone = "teal" }) {
  const toneClasses = {
    teal: "bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950/40 dark:text-teal-200 dark:border-teal-900",
    amber: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900",
    blue: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900",
    red: "bg-red-50 text-red-700 border-red-100 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900",
    dark: "bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
  };
  return (
    <Card className="rounded-[14px] shadow-none">
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span className={`grid h-10 w-10 place-items-center rounded-full border ${toneClasses[tone]}`}>{icon}</span>
        </div>
        <strong className="text-3xl font-semibold tracking-normal text-foreground">{typeof value === "number" ? formatNumber(value) : value}</strong>
        <span className="text-xs font-medium text-muted-foreground">{hint}</span>
      </CardContent>
    </Card>
  );
}

function Panel({ title, description, children }) {
  return (
    <Card className="rounded-[14px] shadow-none">
      <CardContent className="grid gap-5 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold tracking-normal text-foreground sm:text-xl">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function BarChart({ rows = [], maxRows = 8, title }) {
  const items = normalizeRows(rows).slice(0, maxRows);
  const max = Math.max(...items.map((row) => row.count), 0);
  if (!items.length) return <EmptyState title="No data yet" />;
  return (
    <div className="grid gap-3">
      {title ? <h3 className="text-sm font-semibold text-foreground">{title}</h3> : null}
      {items.map((row, index) => (
        <div className="grid gap-1.5" key={`${row.label}-${index}`}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-foreground">{row.label}</span>
            <span className="shrink-0 text-muted-foreground">{formatNumber(row.count)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full"
              style={{ width: `${max ? Math.max(4, (row.count / max) * 100) : 0}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendBars({ rows = [] }) {
  const items = normalizeRows(rows);
  const max = Math.max(...items.map((row) => row.count), 0);
  if (!items.length) return <EmptyState title="No registrations yet" />;
  return (
    <div className="grid min-h-64 gap-4">
      <div className="flex h-56 items-end gap-2 border-b border-l px-2 pb-2 sm:gap-3">
        {items.map((row, index) => (
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={`${row.label}-${index}`}>
            <div
              className="w-full rounded-t-md bg-teal-700 transition-all dark:bg-teal-400"
              style={{ height: `${max ? Math.max(8, (row.count / max) * 100) : 0}%` }}
              title={`${row.label}: ${row.count}`}
            />
            <span className="w-full truncate text-center text-[11px] font-medium text-muted-foreground">{row.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <TrendingUp size={16} /> Peak day: {items.reduce((best, row) => (row.count > best.count ? row : best), items[0]).label}
      </div>
    </div>
  );
}

function DonutChart({ rows = [], centerLabel = "Total" }) {
  const items = normalizeRows(rows);
  const total = items.reduce((sum, row) => sum + row.count, 0);
  if (!items.length || total <= 0) return <EmptyState title="No data yet" />;

  let cursor = 0;
  const gradient = items.map((row, index) => {
    const start = cursor;
    const end = cursor + (row.count / total) * 100;
    cursor = end;
    return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${end}%`;
  }).join(", ");

  return (
    <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
      <div
        className="mx-auto grid h-36 w-36 place-items-center rounded-full sm:mx-0"
        style={{ background: `conic-gradient(${gradient})` }}
        aria-label={`${centerLabel}: ${total}`}
      >
        <div className="grid h-24 w-24 place-items-center rounded-full bg-card text-center">
          <span className="text-xs font-medium text-muted-foreground">{centerLabel}</span>
          <strong className="block text-xl font-semibold text-foreground">{formatNumber(total)}</strong>
        </div>
      </div>
      <div className="grid gap-2">
        {items.map((row, index) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={`${row.label}-${index}`}>
            <span className="min-w-0 truncate text-muted-foreground">
              <i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
              {row.label}
            </span>
            <strong className="shrink-0 font-semibold text-foreground">{formatNumber(row.count)} <span className="text-muted-foreground">({percentage(row.count, total)}%)</span></strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBars({ title, rows = [] }) {
  const items = normalizeRows(rows);
  const total = items.reduce((sum, row) => sum + row.count, 0);
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed p-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">No records yet</p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs font-medium text-muted-foreground">{formatNumber(total)} total</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
        {items.map((row, index) => (
          <span
            className="h-full"
            key={`${row.label}-${index}`}
            style={{ width: `${percentage(row.count, total)}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
            title={`${row.label}: ${row.count}`}
          />
        ))}
      </div>
      <div className="grid gap-1.5">
        {items.map((row, index) => (
          <div className="flex items-center justify-between gap-3 text-xs" key={`${row.label}-legend-${index}`}>
            <span className="min-w-0 truncate text-muted-foreground">
              <i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
              {row.label}
            </span>
            <strong className="font-semibold text-foreground">{formatNumber(row.count)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivity({ rows = [] }) {
  const items = rows.slice(0, 8);
  if (!items.length) return <EmptyState title="No activity yet" />;
  return (
    <div className="grid gap-3">
      {items.map((row, index) => (
        <div className="flex items-start gap-3 rounded-lg border px-4 py-3" key={`${row.type}-${row.created_at}-${index}`}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary text-primary">
            {row.type === "food" ? <Utensils size={17} /> : row.type === "visit" ? <QrCode size={17} /> : <UsersRound size={17} />}
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-semibold text-foreground">{row.actor}</strong>
            <p className="truncate text-xs text-muted-foreground">{row.detail}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      ))}
    </div>
  );
}

function normalizeRows(rows = []) {
  return rows
    .map((row) => ({
      label: String(row.label || row.name || row.service || "Unknown"),
      count: Number(row.count ?? row.visits ?? 0)
    }))
    .filter((row) => row.count > 0);
}

function percentage(value, total) {
  const current = Number(value || 0);
  const base = Number(total || 0);
  return base > 0 ? Math.round((current / base) * 100) : 0;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}
