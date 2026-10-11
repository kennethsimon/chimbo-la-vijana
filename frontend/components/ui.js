"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

export { Button } from "./ui/button";
export { Badge } from "./ui/badge";
export { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
export { Input as TextInput } from "./ui/input";
export { NativeSelect as SelectInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
export { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export function Field({ label, children, className }) {
  return (
    <div className={cn("grid gap-2", className)}>
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function StatusAlert({ type = "ok", children }) {
  if (!children) return null;
  const tones = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    err: "border-red-200 bg-red-50 text-red-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800"
  };
  return <div className={cn("rounded-md border px-4 py-3 text-sm font-medium", tones[type] || tones.ok)}>{children}</div>;
}

export function Spinner({ className }) {
  return <span className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} aria-hidden="true" />;
}

export function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-secondary", className)} />;
}

export function StatCard({ label, value, hint, icon }) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon ? <span className="rounded-md bg-secondary p-2 text-primary">{icon}</span> : null}
      </div>
      <strong className="mt-3 block text-3xl font-bold tracking-normal">{value}</strong>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <div className="mb-2 inline-flex rounded-full bg-accent/20 px-3 py-1 text-xs font-bold uppercase text-accent-foreground">{eyebrow}</div> : null}
        <h1 className="text-3xl font-bold tracking-normal text-foreground">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title = "Hakuna taarifa bado", children }) {
  return (
    <div className="rounded-lg border border-dashed bg-card/60 p-8 text-center text-muted-foreground">
      <strong className="text-sm font-semibold text-foreground">{title}</strong>
      {children ? <div className="mt-2 text-sm">{children}</div> : null}
    </div>
  );
}

export function DataTable({ columns, rows, emptyTitle, loading = false, pageSize = 10, pagination, onPageChange }) {
  const [page, setPage] = useState(1);
  const serverMode = Boolean(pagination && onPageChange);
  const totalRows = serverMode ? pagination.total || 0 : rows?.length || 0;
  const totalPages = serverMode ? Math.max(1, pagination.totalPages || 1) : Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = serverMode ? pagination.page || 1 : Math.min(page, totalPages);
  const visibleRows = useMemo(() => {
    if (!rows?.length) return [];
    if (serverMode) return rows;
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [currentPage, pageSize, rows, serverMode]);
  const goToPage = (nextPage) => {
    const boundedPage = Math.min(totalPages, Math.max(1, nextPage));
    if (serverMode) onPageChange(boundedPage);
    else setPage(boundedPage);
  };

  if (loading) return <TableSkeleton columns={columns?.length || 5} />;
  if (!rows?.length) return <EmptyState title={emptyTitle || "Hakuna rekodi bado"} />;
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="divide-y sm:hidden">
        {visibleRows.map((row, index) => (
          <div className="bg-card px-4 py-3" key={row.id || row.ticketCode || `mobile-${currentPage}-${index}`}>
            {columns.map((column) => (
              <div className="flex items-start justify-between gap-3 py-1.5" key={column.key}>
                {column.label ? <span className="text-xs font-semibold uppercase text-muted-foreground">{column.label}</span> : <span />}
                <div className="min-w-0 max-w-[65%] text-right text-sm">{column.render ? column.render(row) : row[column.key]}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-secondary/70 text-muted-foreground">
            <tr>{columns.map((column) => <th className="px-4 py-3 text-left text-xs font-semibold uppercase" key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y bg-card">
            {visibleRows.map((row, index) => (
              <tr className="transition-colors hover:bg-secondary/40" key={row.id || row.ticketCode || `${currentPage}-${index}`}>
                {columns.map((column) => (
                  <td className="px-4 py-3 align-top" key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t bg-card px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalRows)} of {totalRows}</span>
        <div className="flex items-center gap-2">
          <Button className="h-8 px-3" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)} type="button" variant="secondary">
            <ChevronLeft size={15} /> Prev
          </Button>
          <span className="min-w-16 text-center text-xs font-semibold text-foreground">Page {currentPage}/{totalPages}</span>
          <Button className="h-8 px-3" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)} type="button" variant="secondary">
            Next <ChevronRight size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TableSkeleton({ columns }) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid gap-3 bg-card p-4">
        {Array.from({ length: 6 }).map((_, row) => (
          <div className="grid gap-3 sm:grid-cols-5" key={row}>
            {Array.from({ length: Math.min(columns, 5) }).map((__, col) => (
              <Skeleton className="h-5" key={col} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
