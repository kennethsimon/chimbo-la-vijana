"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, QrCode, TrendingUp, UsersRound, Utensils } from "lucide-react";
import { RequireAuth } from "../../../components/RequireAuth";
import { useLanguage } from "../../../components/LanguageProvider";
import { api } from "../../../lib/api";
import { Badge, Card, CardContent, EmptyState, StatusAlert } from "../../../components/ui";

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

  if (error) return <StatusAlert type="err">{error}</StatusAlert>;
  if (!data) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Inapakia dashibodi...</CardContent></Card>;

  const foodRate = data.totals.attendees ? Math.round((data.totals.foodClaims / data.totals.attendees) * 100) : 0;
  const boothRows = data.topBooths.slice(0, 8);
  const recentRows = data.recentActivity.slice(0, 8);
  const serviceRows = data.services.slice(0, 5);

  return (
    <div className="grid gap-5 sm:gap-6">
      <section className="rounded-[14px] border bg-card p-5 shadow-none sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">{t("dashboardTitle")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{t("dashboardSubtitle")}</p>
          </div>
          <Badge tone="ok">Live</Badge>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={<UsersRound size={22} />} label="Attendees" value={data.totals.attendees} trend="+18%" />
        <MetricCard icon={<Building2 size={22} />} label="Exhibitors" value={data.totals.exhibitors || 0} trend="Active" />
        <MetricCard icon={<QrCode size={22} />} label="Booth scans" value={data.totals.visits} trend="+12%" />
        <MetricCard icon={<Utensils size={22} />} label="Food claims" value={data.totals.foodClaims} trend={`${foodRate}%`} />
        <MetricCard icon={<CheckCircle2 size={22} />} label="Food team" value={data.totals.foodUsers || 0} trend="Ready" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Card className="shadow-none">
          <CardContent className="grid gap-5 p-5 sm:p-6">
            <PanelHeading title="Exhibitors" description="Mabanda na idadi ya scans" />
            <div className="grid gap-3">
              {boothRows.length ? boothRows.map((row, index) => (
                <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-4 py-3" key={row.name}>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm sm:text-base">{row.name}</strong>
                    <span className="text-xs text-muted-foreground">{index === 0 ? "Top exhibitor" : "Exhibitor"}</span>
                  </div>
                  <Badge tone={Number(row.visits || 0) > 0 ? "ok" : "neutral"}>{row.visits} scans</Badge>
                </div>
              )) : <EmptyState title="Hakuna mabanda bado" />}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="grid gap-5 p-5 sm:p-6">
            <PanelHeading title="Recent activity" description="Matukio ya hivi karibuni" />
            <div className="grid gap-3">
              {recentRows.length ? recentRows.map((row, index) => (
                <div className="flex items-start gap-3 rounded-md border bg-card px-4 py-3" key={`${row.type}-${row.created_at}-${index}`}>
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary text-primary">
                    {row.type === "food" ? <Utensils size={17} /> : row.type === "visit" ? <QrCode size={17} /> : <UsersRound size={17} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">{row.actor}</strong>
                    <p className="truncate text-xs text-muted-foreground">{row.detail}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(row.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              )) : <EmptyState title="Hakuna shughuli bado" />}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardContent className="grid gap-5 p-5 sm:p-6">
            <PanelHeading title="Service trends" description="Huduma zilizochaguliwa kwenye scans" />
            {serviceRows.length ? serviceRows.map((row) => (
              <div className="flex items-center justify-between gap-3" key={row.service}>
                <span className="truncate text-sm font-medium">{row.service}</span>
                <Badge tone="neutral">{row.count}</Badge>
              </div>
            )) : <EmptyState title="Hakuna huduma zilizorekodiwa" />}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="grid gap-5 p-5 sm:p-6">
            <PanelHeading title="Operational trends" description="Mwelekeo wa tukio bila charts" />
            <TrendLine label="Registration momentum" value={data.totals.attendees ? "+18%" : "0%"} />
            <TrendLine label="Booth engagement" value={data.totals.visits ? "+12%" : "0%"} />
            <TrendLine label="Food claim rate" value={`${foodRate}%`} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, trend }) {
  return (
    <Card className="rounded-[14px] border-[#e5e5e5] shadow-none">
      <CardContent className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span className="grid h-10 w-10 place-items-center rounded-full border bg-card text-foreground">{icon}</span>
        </div>
        <strong className="text-3xl font-semibold tracking-normal text-foreground">{Number(value || 0).toLocaleString()}</strong>
        <div className="flex items-center gap-2 text-sm text-teal-700"><TrendingUp size={15} /> {trend}</div>
      </CardContent>
    </Card>
  );
}

function PanelHeading({ title, description }) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-normal text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function TrendLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border bg-card px-4 py-3">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <Badge tone="ok">{value}</Badge>
    </div>
  );
}
