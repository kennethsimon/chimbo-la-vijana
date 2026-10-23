"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, MoreVertical, Power, PowerOff, Trash2 } from "lucide-react";
import { RequireAuth } from "../../../components/RequireAuth";
import { api, patch, post, remove } from "../../../lib/api";
import { useLanguage } from "../../../components/LanguageProvider";
import { useToast } from "../../../components/ToastProvider";
import { Badge, Button, Card, CardContent, DataTable, PageHeader, Popover, PopoverContent, PopoverTrigger, Spinner } from "../../../components/ui";

export default function UsersPage() {
  return (
    <RequireAuth role="admin">
      {(currentUser) => <Users currentUser={currentUser} />}
    </RequireAuth>
  );
}

function Users({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [busyUser, setBusyUser] = useState("");
  const [deleteUser, setDeleteUser] = useState(null);
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

  async function permanentlyDeleteUser() {
    if (!deleteUser) return;
    const user = deleteUser;
    setBusyUser(user.id);
    try {
      await remove(`/admin/users/${user.id}`);
      setDeleteUser(null);
      const nextPage = users.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      await load(nextPage);
      toast.success(`${user.name} has been permanently deleted.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusyUser("");
    }
  }

  return (
    <div className="grid gap-5">
      {deleteUser ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
          <div className="w-full max-w-md rounded-lg border bg-card p-5 text-foreground shadow-xl">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"><AlertTriangle size={20} /></span>
              <div>
                <h2 className="text-lg font-semibold" id="delete-user-title">Delete {deleteUser.name}?</h2>
                <p className="mt-1 text-sm text-muted-foreground">This permanently removes the account and login credentials. Existing scan history will remain and be labelled “Deleted user”.</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button disabled={busyUser === deleteUser.id} onClick={() => setDeleteUser(null)} type="button" variant="secondary">Cancel</Button>
              <Button className="bg-red-600 text-white hover:bg-red-700" disabled={busyUser === deleteUser.id} onClick={permanentlyDeleteUser} type="button">
                {busyUser === deleteUser.id ? <Spinner /> : <Trash2 size={16} />} Delete permanently
              </Button>
            </div>
          </div>
        </div>
      ) : null}
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
                  <button
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45 dark:text-red-300 dark:hover:bg-red-950"
                    disabled={user.id === currentUser.id}
                    onClick={() => setDeleteUser(user)}
                    title={user.id === currentUser.id ? "You cannot delete your own account" : "Permanently delete user"}
                    type="button"
                  >
                    <Trash2 size={16} /> Delete permanently
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

