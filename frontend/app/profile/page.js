"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { RequireAuth } from "../../components/RequireAuth";
import { useToast } from "../../components/ToastProvider";
import { post } from "../../lib/api";
import { Badge, Button, Card, CardContent, Field, PageHeader, Spinner, TextInput } from "../../components/ui";

export default function ProfilePage() {
  return (
    <RequireAuth>
      {(user) => <Profile user={user} />}
    </RequireAuth>
  );
}

function Profile({ user }) {
  const [tab, setTab] = useState("details");
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  async function changePassword(event) {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    setLoading(true);
    try {
      await post("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password changed successfully.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Account" title="Profile" description="View your dashboard access details and manage your password." />

      <div className="grid gap-2 rounded-lg border bg-secondary/60 p-1 sm:inline-grid sm:grid-cols-2">
        <button className={tab === "details" ? "rounded-md bg-card px-4 py-2 text-sm font-semibold shadow-sm" : "rounded-md px-4 py-2 text-sm font-semibold text-muted-foreground"} onClick={() => setTab("details")} type="button">Details</button>
        <button className={tab === "password" ? "rounded-md bg-card px-4 py-2 text-sm font-semibold shadow-sm" : "rounded-md px-4 py-2 text-sm font-semibold text-muted-foreground"} onClick={() => setTab("password")} type="button">Change password</button>
      </div>

      {tab === "details" ? (
        <Card>
          <CardContent className="grid gap-5 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary text-base font-semibold text-white">{user.name?.slice(0, 2)?.toUpperCase()}</span>
              <div className="min-w-0">
                <h2 className="truncate text-2xl font-semibold tracking-normal">{user.name}</h2>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Detail label="Status" value={user.isActive ? "Active" : "Inactive"} />
              <Detail label="Assigned booth" value={user.boothName || "Not assigned"} />
              <div className="rounded-lg border bg-card p-4">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Roles</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(user.roles || [user.role]).filter(Boolean).map((role) => (
                    <Badge key={role} tone={role === "admin" ? "ok" : role === "food" ? "warn" : "neutral"}>{roleLabel(role)}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="grid gap-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-primary"><ShieldCheck size={20} /></span>
              <div>
                <h2 className="text-xl font-semibold tracking-normal">Change password</h2>
                <p className="mt-1 text-sm text-muted-foreground">Use a strong password that only you know.</p>
              </div>
            </div>
            <form className="grid max-w-xl gap-4" onSubmit={changePassword}>
              <Field label="Current password">
                <TextInput type="password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} required />
              </Field>
              <Field label="New password">
                <TextInput type="password" minLength={8} value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} required />
              </Field>
              <Field label="Confirm new password">
                <TextInput type="password" minLength={8} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required />
              </Field>
              <Button className="w-full sm:w-fit" disabled={loading}>{loading ? <Spinner /> : null} Save password</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <span className="text-xs font-semibold uppercase text-muted-foreground">{label}</span>
      <strong className="mt-2 block text-base font-semibold">{value}</strong>
    </div>
  );
}

function roleLabel(role) {
  return role === "admin" ? "Admin" : role === "food" ? "Food scanner" : "Exhibitor";
}
