"use client";

import Link from "next/link";
import { Bell, ChevronDown, LayoutDashboard, LogOut, Mail, Menu, MessageSquareText, QrCode, ScanLine, UserRound, UsersRound, UserRoundCog } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../lib/api";
import { BrandMark } from "./BrandMark";
import { Button, Popover, PopoverContent, PopoverTrigger } from "./ui";
import { cn } from "../lib/utils";
import { LanguageSwitcher, useLanguage } from "./LanguageProvider";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader({ user }) {
  const router = useRouter();

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return <StaffNav user={user} onLogout={logout} />;
}

export function StaffNav({ user, onLogout, compact = false, collapsed = false }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const isAdmin = hasRole(user, "admin");
  const canScan = isAdmin || hasRole(user, "exhibitor") || hasRole(user, "food");
  const home = isAdmin ? "/admin/dashboard" : "/exhibitor/scan";
  const linkClass = (href) => cn(
    "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-bold transition-colors",
    pathname === href ? "bg-foreground text-background shadow-sm" : "text-foreground hover:bg-secondary",
    compact ? "border bg-card" : "",
    collapsed ? "justify-center px-0" : ""
  );
  const iconSize = collapsed ? 21 : 19;
  return (
    <div className={cn("flex h-full flex-col", collapsed ? "items-center" : "")}>
      <Link className={cn("flex h-16 items-center gap-3 px-1", collapsed ? "justify-center px-0" : "")} href={home}>
        <BrandMark compact={compact} />
        <span className={cn("min-w-0", collapsed ? "hidden" : "")}>
          <span className="block truncate text-lg font-semibold text-foreground">Chimbo.</span>
          {user ? <span className="block truncate text-xs text-muted-foreground">{user.name} · {roleLabels(user)}</span> : null}
          {user?.boothName ? <span className="block truncate text-xs text-muted-foreground">Banda: {user.boothName}</span> : null}
        </span>
      </Link>
      {user ? (
        <nav className={compact ? "flex flex-wrap gap-2" : cn("grid gap-5", collapsed ? "w-full" : "")}>
          {isAdmin ? (
            <div className="grid gap-2">
              {!compact && !collapsed ? <p className="px-3 text-xs font-medium uppercase text-muted-foreground">{t("dashboard")}</p> : null}
              <Link className={linkClass("/admin/dashboard")} href="/admin/dashboard" title={t("analytics")}><LayoutDashboard size={iconSize} />{!collapsed ? t("analytics") : null}</Link>
              <Link className={linkClass("/admin/attendees")} href="/admin/attendees" title={t("attendees")}><UsersRound size={iconSize} />{!collapsed ? t("attendees") : null}</Link>
              <Link className={linkClass("/admin/sms")} href="/admin/sms" title="SMS logs"><MessageSquareText size={iconSize} />{!collapsed ? "SMS logs" : null}</Link>
              <Link className={linkClass("/admin/users")} href="/admin/users" title={t("users")}><UserRoundCog size={iconSize} />{!collapsed ? t("users") : null}</Link>
            </div>
          ) : null}
          <div className="grid gap-2">
            {!compact && !collapsed ? <p className="px-3 text-xs font-medium uppercase text-muted-foreground">{t("apps")}</p> : null}
            {canScan ? <Link className={linkClass("/exhibitor/scan")} href="/exhibitor/scan" title={t("scanQr")}><ScanLine size={iconSize} />{!collapsed ? t("scanQr") : null}</Link> : null}
            <Link className={linkClass("/admin/scans")} href="/admin/scans" title={t("scanHistory")}><QrCode size={iconSize} />{!collapsed ? t("scanHistory") : null}</Link>
            <Link className={linkClass("/profile")} href="/profile" title="Profile"><UserRound size={iconSize} />{!collapsed ? "Profile" : null}</Link>
            <Button className={cn("h-10 px-3 text-sm font-bold", compact ? "" : "w-full", collapsed ? "justify-center px-0" : "justify-start")} variant="ghost" onClick={onLogout} title={t("logout")}><LogOut size={iconSize} />{!collapsed ? t("logout") : null}</Button>
          </div>
        </nav>
      ) : null}
      {!compact && !collapsed ? (
        <div className="mt-auto rounded-lg bg-secondary p-4 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-card text-primary">
            <QrCode size={30} />
          </div>
          <h3 className="font-semibold">{t("eventReady")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("eventReadyText")}</p>
        </div>
      ) : null}
    </div>
  );
}

export function StaffHeader({ user, collapsed, onToggleSidebar, onOpenMobileSidebar }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-card px-4 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
        <Button className="h-9 w-9 lg:hidden" size="icon" variant="ghost" aria-label="Open sidebar" onClick={onOpenMobileSidebar}>
          <Menu size={19} />
        </Button>
        <Button className="hidden h-9 w-9 border-r pr-4 lg:inline-flex" size="icon" variant="ghost" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={onToggleSidebar}>
          <Menu size={19} />
        </Button>
        <span className="truncate text-sm font-semibold text-foreground">Menu</span>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <LanguageSwitcher compact />
        <Button className="h-9 w-9" variant="ghost" size="icon" aria-label="Notifications"><Bell size={19} /></Button>
        <Button className="h-9 w-9" variant="ghost" size="icon" aria-label="Messages"><Mail size={19} /></Button>
        <UserMenu user={user} onLogout={async () => {
          await api("/auth/logout", { method: "POST" });
          window.location.href = "/login";
        }} />
      </div>
    </header>
  );
}

function UserMenu({ user, onLogout }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="ml-1 flex items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-secondary" type="button">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-semibold text-white">{user?.name?.slice(0, 2)?.toUpperCase() || "AD"}</span>
          <span className="hidden text-sm font-bold lg:block">{user?.name || "Admin"}</span>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <div className="border-b px-3 py-2">
          <strong className="block truncate text-sm">{user?.name}</strong>
          <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
        </div>
        <div className="grid gap-1 py-2">
          <Link className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-secondary" href="/profile">
            <UserRound size={17} /> Profile
          </Link>
          <button className="flex h-10 items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-red-700 hover:bg-red-50" onClick={onLogout} type="button">
            <LogOut size={17} /> Logout
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function hasRole(user, role) {
  return user?.roles?.includes(role) || user?.role === role;
}

function roleLabels(user) {
  const labels = {
    admin: "Msimamizi",
    exhibitor: "Banda",
    food: "Chakula"
  };
  const roles = user?.roles?.length ? user.roles : [user?.role].filter(Boolean);
  return roles.map((role) => labels[role] || role).join(" · ");
}

