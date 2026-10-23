"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MoreVertical, Power, PowerOff } from "lucide-react";
import { RequireAuth } from "../../../components/RequireAuth";
import { api, patch, post } from "../../../lib/api";
import { useLanguage } from "../../../components/LanguageProvider";
import { useToast } from "../../../components/ToastProvider";
import { Badge, Button, Card, CardContent, DataTable, PageHeader, Popover, PopoverContent, PopoverTrigger, Spinner } from "../../../components/ui";

export default function UsersPage() {
  return (
    <RequireAuth role="admin">
      {() => <Users />}
    </RequireAuth>
  );
}

function Users() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [busyUser, setBusyUser] = useState("");
  const { t } = useLanguage();
  const toast = useToast();

  async function load(page = pagination.page) {
    setLoading(true);
    const userData = await api(`/admin/users?page=${page}&pageSize=${pagination.pageSize}`);
    setUsers(userData.users);
    setPagination(userData.pagination || { page, pageSize: pagination.pageSize, total: userData.users.length, totalPages: 1 });
    setLoading(false);
  }

  useEffect(() => {
    load().catch((err) => {
      setLoading(false);
      toast.error(err.message);
    });
  }, [toast]);

  async function toggleUser(user) {
    setBusyUser(user.id);
    try {
      await patch(`/admin/users/${user.id}`, { isActive: !user.isActive });
      await load(pagination.page);
      toast.success(`${user.name} ${user.isActive ? "deactivated" : "activated"}.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyUser("");
    }
  }

  async function resendCredentials(user) {
    setBusyUser(user.id);
    try {
      const result = await post(`/admin/users/${user.id}/resend-credentials`);
      if (result.credentialEmail?.status === "sent") {
        toast.success(`Credentials sent to ${user.email}.`);
      } else {
        toast.warning(result.credentialEmail?.error || "Password was reset, but the email was not sent.");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyUser("");
    }
  }

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Timu"
        title={t("users")}
        description="Simamia akaunti za dashboard na majukumu yao."
        action={<Button asChild><Link href="/admin/users/new">{t("addUser")}</Link></Button>}
      />

      <Card>
        <CardContent className="p-5">
        <DataTable
          loading={loading}
          rows={users}
          pagination={pagination}
          onPageChange={load}
          emptyTitle="Hakuna watumiaji bado"
          columns={[
            { key: "name", label: "Jina" },
            { key: "email", label: "Email" },
            { key: "role", label: "Jukumu", render: (user) => <div className="flex flex-wrap gap-1">{(user.roles || [user.role]).map((role) => <Badge key={role} tone={role === "admin" ? "ok" : role === "food" ? "warn" : "neutral"}>{roleLabel(role)}</Badge>)}</div> },
            { key: "boothName", label: "Banda", render: (user) => user.boothName || "-" },
            { key: "isActive", label: "Hali", render: (user) => <Badge tone={user.isActive ? "ok" : "err"}>{user.isActive ? "Active" : "Inactive"}</Badge> },
            { key: "action", label: "", render: (user) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button className="h-9 w-9 p-0" disabled={busyUser === user.id} size="icon" type="button" variant="ghost" aria-label="User actions">
                    {busyUser === user.id ? <Spinner /> : <MoreVertical size={18} />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-1">
                  <button
                    className={user.isActive ? "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50" : "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-emerald-700 hover:bg-emerald-50"}
                    onClick={() => toggleUser(user)}
                    type="button"
                  >
                    {user.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                    {user.isActive ? "Deactivate user" : "Activate user"}
                  </button>
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-secondary"
                    onClick={() => resendCredentials(user)}
                    type="button"
                  >
                    Resend credentials
                  </button>
                </PopoverContent>
              </Popover>
            ) }
          ]}
        />
        </CardContent>
      </Card>
    </div>
  );
}

function roleLabel(role) {
  return role === "admin" ? "Admin" : role === "food" ? "Chakula" : role === "checkin" ? "Kiingilio" : "Banda";
}

