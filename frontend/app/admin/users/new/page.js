"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireAuth } from "../../../../components/RequireAuth";
import { useLanguage } from "../../../../components/LanguageProvider";
import { useToast } from "../../../../components/ToastProvider";
import { api, post } from "../../../../lib/api";
import { Badge, Button, Field, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner, TextInput } from "../../../../components/ui";

const initialForm = {
  name: "",
  email: "",
  roles: ["exhibitor"],
  boothId: "",
  isActive: true
};

export default function NewUserPage() {
  return (
    <RequireAuth role="admin">
      {() => <NewUser />}
    </RequireAuth>
  );
}

function NewUser() {
  const router = useRouter();
  const { t } = useLanguage();
  const toast = useToast();
  const [booths, setBooths] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api("/admin/booths").then((data) => setBooths(data.booths)).catch((err) => toast.error(err.message));
  }, [toast]);

  async function createUser(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await post("/admin/users", { ...form, boothId: form.roles.includes("exhibitor") ? form.boothId || null : null });
      if (result.credentialEmail?.status === "sent") {
        toast.success("User created and credentials email sent.");
      } else {
        toast.warning(result.credentialEmail?.error || "User created, but credentials email was not sent.");
      }
      router.push("/admin/users");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-xl py-4 sm:py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">{t("createUser")}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Chagua role moja au zaidi. Mfumo utatengeneza password na kumtumia mtumiaji email ya credentials.
        </p>
      </div>

      <form className="grid gap-5" onSubmit={createUser}>
        <Field label="Jina">
          <TextInput className="h-11 rounded-md bg-card text-sm shadow-none" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Email">
          <TextInput className="h-11 rounded-md bg-card text-sm shadow-none" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        </Field>

        <Field label="Majukumu">
          <Select value="" onValueChange={(role) => setForm((prev) => addRole(prev, role))}>
            <SelectTrigger className="h-11 bg-card text-sm shadow-none">
              <SelectValue placeholder="Ongeza jukumu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="exhibitor">Mhudumu wa banda</SelectItem>
              <SelectItem value="food">Mhudumu wa chakula</SelectItem>
              <SelectItem value="checkin">Mhudumu wa kiingilio</SelectItem>
            </SelectContent>
          </Select>
          <div className="mt-2 flex flex-wrap gap-2">
            {form.roles.map((role) => (
              <button className="rounded-full" key={role} onClick={() => setForm((prev) => removeRole(prev, role))} type="button" title="Remove role">
                <Badge tone={role === "admin" ? "ok" : role === "food" ? "warn" : "neutral"}>{roleLabel(role)} ×</Badge>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Banda">
          <Select value={form.boothId || undefined} onValueChange={(boothId) => setForm({ ...form, boothId })} disabled={!form.roles.includes("exhibitor")}>
            <SelectTrigger className="h-11 bg-card text-sm shadow-none">
              <SelectValue placeholder="Chagua banda" />
            </SelectTrigger>
            <SelectContent>
              {booths.map((booth) => <SelectItem key={booth.id} value={booth.id}>{booth.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button className="h-10 w-auto bg-blue-600 px-5 text-sm font-semibold uppercase tracking-wide hover:bg-blue-700" disabled={loading}>
            {loading ? <Spinner /> : null}{t("createUser")}
          </Button>
          <Button className="h-10 w-auto px-5 shadow-none" type="button" variant="secondary" onClick={() => router.push("/admin/users")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}

function toggleRole(form, role, checked) {
  const roles = checked ? [...new Set([...form.roles, role])] : form.roles.filter((item) => item !== role);
  const nextRoles = roles.length ? roles : [role];
  return {
    ...form,
    roles: nextRoles,
    boothId: nextRoles.includes("exhibitor") ? form.boothId : ""
  };
}

function addRole(form, role) {
  const roles = [...new Set([...form.roles, role])];
  return {
    ...form,
    roles,
    boothId: roles.includes("exhibitor") ? form.boothId : ""
  };
}

function removeRole(form, role) {
  const roles = form.roles.filter((item) => item !== role);
  const nextRoles = roles.length ? roles : ["exhibitor"];
  return {
    ...form,
    roles: nextRoles,
    boothId: nextRoles.includes("exhibitor") ? form.boothId : ""
  };
}

function roleLabel(role) {
  return role === "admin" ? "Admin" : role === "food" ? "Chakula" : role === "checkin" ? "Kiingilio" : "Banda";
}
