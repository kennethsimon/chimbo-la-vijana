"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "../lib/utils";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((items) => items.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(({ type = "ok", title, message }) => {
    const id = crypto.randomUUID();
    setToasts((items) => [...items, { id, type, title, message }]);
    window.setTimeout(() => remove(id), 4800);
  }, [remove]);

  const value = useMemo(() => ({
    show,
    success: (message, title = "Success") => show({ type: "ok", title, message }),
    error: (message, title = "Error") => show({ type: "err", title, message }),
    warning: (message, title = "Notice") => show({ type: "warn", title, message }),
    info: (message, title = "Info") => show({ type: "info", title, message })
  }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[80] grid w-[calc(100vw-2rem)] max-w-sm gap-3">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={() => remove(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

function Toast({ toast, onClose }) {
  const tone = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-950",
    err: "border-red-200 bg-red-50 text-red-950",
    warn: "border-amber-200 bg-amber-50 text-amber-950",
    info: "border-sky-200 bg-sky-50 text-sky-950"
  }[toast.type] || "border-border bg-card text-foreground";
  const icon = {
    ok: <CheckCircle2 size={18} />,
    err: <AlertCircle size={18} />,
    warn: <AlertCircle size={18} />,
    info: <Info size={18} />
  }[toast.type] || <Info size={18} />;

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border p-4 shadow-lg", tone)}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <strong className="block text-sm font-semibold">{toast.title}</strong>
        {toast.message ? <p className="mt-1 text-sm opacity-80">{toast.message}</p> : null}
      </div>
      <button className="rounded-md p-1 opacity-70 transition hover:opacity-100" onClick={onClose} type="button" aria-label="Close notification">
        <X size={16} />
      </button>
    </div>
  );
}
