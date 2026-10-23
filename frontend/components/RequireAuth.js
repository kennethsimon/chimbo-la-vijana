"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { api } from "../lib/api";
import { getStaffHome } from "../lib/authRouting.mjs";
import { StaffHeader, StaffNav } from "./AppHeader";
import { Button, Card, CardContent, Skeleton, Spinner } from "./ui";

export function RequireAuth({ role, children }) {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, user: null, error: "" });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api("/auth/me", { cache: "no-store" })
      .then(({ user }) => {
        if (!active) return;
        if (role && !hasRole(user, role)) {
          router.replace(getStaffHome(user));
          return;
        }
        setState({ loading: false, user, error: "" });
      })
      .catch(() => router.replace("/login"));
    return () => {
      active = false;
    };
  }, [role, router]);

  if (state.loading) {
    return (
      <main className="min-h-screen bg-background p-6">
        <Card className="mx-auto mt-20 max-w-md">
          <CardContent className="grid gap-4 p-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Spinner /> Inapakia...</div>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className={sidebarCollapsed ? "min-h-screen bg-background lg:grid lg:grid-cols-[82px_minmax(0,1fr)]" : "min-h-screen bg-background lg:grid lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]"}>
      <aside className={sidebarCollapsed ? "sticky top-0 hidden h-screen border-r bg-card px-3 pb-4 lg:block" : "sticky top-0 hidden h-screen border-r bg-card px-5 pb-5 lg:block"}>
        <StaffNav collapsed={sidebarCollapsed} user={state.user} onLogout={async () => {
          await api("/auth/logout", { method: "POST" });
          router.push("/login");
        }} />
      </aside>
      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/35" type="button" aria-label="Close sidebar" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-[286px] max-w-[84vw] border-r bg-card px-4 pb-5 shadow-xl">
            <div className="flex h-14 items-center justify-end">
              <Button className="h-9 w-9" size="icon" variant="ghost" onClick={() => setMobileSidebarOpen(false)} aria-label="Close sidebar">
                <X size={18} />
              </Button>
            </div>
            <StaffNav user={state.user} onLogout={async () => {
              await api("/auth/logout", { method: "POST" });
              router.push("/login");
            }} />
          </aside>
        </div>
      ) : null}
      <div className="min-w-0">
        <StaffHeader collapsed={sidebarCollapsed} onOpenMobileSidebar={() => setMobileSidebarOpen(true)} onToggleSidebar={() => setSidebarCollapsed((value) => !value)} user={state.user} />
        <main className="min-w-0 bg-background p-4 sm:p-5">
          {children(state.user)}
        </main>
      </div>
    </div>
  );
}

function hasRole(user, role) {
  return user?.roles?.includes(role) || user?.role === role;
}

