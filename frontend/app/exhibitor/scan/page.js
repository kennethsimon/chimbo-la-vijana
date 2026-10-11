"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Camera, CheckCircle2, Search, Utensils } from "lucide-react";
import { RequireAuth } from "../../../components/RequireAuth";
import { api, post } from "../../../lib/api";
import { SERVICES } from "../../../lib/regions";
import { useToast } from "../../../components/ToastProvider";
import { Badge, Button, Card, CardContent, Field, PageHeader, SelectInput, Spinner, TextInput } from "../../../components/ui";

export default function ScanPage() {
  return (
    <RequireAuth>
      {(user) => <Scanner user={user} />}
    </RequireAuth>
  );
}

function Scanner({ user }) {
  const canScanBooth = hasRole(user, "admin") || hasRole(user, "exhibitor");
  const canScanFood = hasRole(user, "admin") || hasRole(user, "food");
  const qrRef = useRef(null);
  const scannerRef = useRef(null);
  const mountedRef = useRef(true);
  const stoppingRef = useRef(false);
  const [ticketCode, setTicketCode] = useState("");
  const [lookup, setLookup] = useState(null);
  const [loading, setLoading] = useState("");
  const [usedDialog, setUsedDialog] = useState(null);
  const [camera, setCamera] = useState(false);
  const [mode, setMode] = useState(canScanFood ? "food" : "booth");
  const [visit, setVisit] = useState({ service: SERVICES[0], satisfaction: 3, question: "" });
  const [booths, setBooths] = useState([]);
  const [selectedBoothId, setSelectedBoothId] = useState("");
  const toast = useToast();
  const isAdmin = hasRole(user, "admin");
  const selectedBooth = booths.find((booth) => booth.id === selectedBoothId);
  const boothName = isAdmin ? selectedBooth?.name : user.boothName;
  const requiresBoothChoice = isAdmin && mode === "booth";

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopScannerSafely();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    api("/admin/booths")
      .then((data) => {
        const activeBooths = (data.booths || []).filter((booth) => booth.is_active);
        setBooths(activeBooths);
        setSelectedBoothId((current) => current || activeBooths[0]?.id || "");
      })
      .catch((error) => toast.error(error.message));
  }, [isAdmin, toast]);

  useEffect(() => {
    if (mode === "booth") setLookup(null);
  }, [selectedBoothId, mode]);

  async function stopScannerSafely() {
    const scanner = scannerRef.current;
    if (!scanner || stoppingRef.current) return;

    try {
      const state = scanner.getState?.();
      if (state !== 2 && state !== 3) return;

      stoppingRef.current = true;
      await scanner.stop();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || "");
      if (!message.includes("Cannot stop")) {
        console.warn("QR scanner cleanup failed", error);
      }
    } finally {
      stoppingRef.current = false;
      if (mountedRef.current) setCamera(false);
    }
  }

  async function startCamera() {
    setLoading("camera");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      await stopScannerSafely();
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await stopScannerSafely();
          if (!mountedRef.current) return;
          const code = decodedText.trim();
          setTicketCode(code);
          await lookupTicket(code);
        }
      );
      if (mountedRef.current) setCamera(true);
    } catch (error) {
      if (mountedRef.current) {
        toast.error("Kamera haikuweza kuwaka. Tumia ticket code kwa mkono.");
        setCamera(false);
      }
    } finally {
      if (mountedRef.current) setLoading("");
    }
  }

  async function stopCamera() {
    await stopScannerSafely();
  }

  async function lookupTicket(code = ticketCode) {
    if (requiresBoothChoice && !selectedBoothId) {
      toast.warning("Chagua banda kabla ya kuscan.");
      return;
    }
    setLoading("lookup");
    setLookup(null);
    try {
      const result = await post("/exhibitor/scans/lookup", scanPayload({ ticketCode: code }));
      setLookup(result);
      toast.success(`Tiketi sahihi: ${result.attendee.name}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading("");
    }
  }

  async function saveVisit() {
    if (requiresBoothChoice && !selectedBoothId) {
      toast.warning("Chagua banda kabla ya kuhifadhi ziara.");
      return;
    }
    setLoading("visit");
    try {
      const result = await post("/exhibitor/scans/visit", scanPayload({ ticketCode, ...visit }));
      toast.success(`Visit saved at ${new Date(result.visit.createdAt).toLocaleTimeString()}`);
      await lookupTicket(ticketCode);
    } catch (error) {
      if (error.status === 409) {
        setUsedDialog({ title: "QR imeshatumika", text: "Tiketi hii tayari imetumika kwenye banda hili." });
        toast.warning("Tiketi hii tayari imetumika kwenye banda hili.");
        return;
      }
      toast.error(error.message);
    } finally {
      setLoading("");
    }
  }

  async function claimFood() {
    setLoading("food");
    try {
      const result = await post("/exhibitor/scans/food", { ticketCode });
      toast.success(`Food claim confirmed at ${new Date(result.claimedAt).toLocaleTimeString()}`);
      await lookupTicket(ticketCode);
    } catch (error) {
      if (error.status === 409) {
        setUsedDialog({ title: "QR imeshatumika", text: "Tiketi hii tayari imetumika kwa chakula." });
        toast.warning("Tiketi hii tayari imetumika kwa chakula.");
        return;
      }
      toast.error(error.message);
    } finally {
      setLoading("");
    }
  }

  function changeMode(nextMode) {
    if (nextMode === "food" && !canScanFood) return;
    if (nextMode === "booth" && !canScanBooth) return;
    setMode(nextMode);
  }

  function scanPayload(payload) {
    if (isAdmin && mode === "booth" && selectedBoothId) return { ...payload, boothId: selectedBoothId };
    return payload;
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-5">
      {usedDialog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 text-foreground shadow-xl">
            <h2 className="text-xl font-bold tracking-normal">{usedDialog.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{usedDialog.text}</p>
            <Button className="mt-5 w-full" onClick={() => setUsedDialog(null)}>Sawa</Button>
          </div>
        </div>
      ) : null}
      <Card className="overflow-hidden border-0 bg-event-ink text-white">
        <CardContent className="grid gap-5 p-5 sm:p-6">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase text-white">Zana ya banda</div>
            <h1 className="text-3xl font-bold tracking-normal text-white">Scan QR ya mshiriki</h1>
            <p className="mt-2 text-sm text-white/70">Ruhusa: <strong className="text-white">{roleLabels(user)}</strong>{canScanBooth ? <> · Banda: <strong className="text-white">{boothName || "Chagua banda"}</strong></> : null}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/15 bg-white/5 p-1">
            <button
              className={mode === "food" ? "flex min-h-14 items-center justify-center gap-2 rounded-md bg-accent px-4 text-base font-black text-accent-foreground shadow-sm disabled:opacity-40" : "flex min-h-14 items-center justify-center gap-2 rounded-md px-4 text-base font-black text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"}
              disabled={!canScanFood}
              onClick={() => changeMode("food")}
              type="button"
            >
              <Utensils size={20} /> Chakula (mara moja)
            </button>
            <button
              className={mode === "booth" ? "flex min-h-14 items-center justify-center gap-2 rounded-md bg-accent px-4 text-base font-black text-accent-foreground shadow-sm disabled:opacity-40" : "flex min-h-14 items-center justify-center gap-2 rounded-md px-4 text-base font-black text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"}
              disabled={!canScanBooth}
              onClick={() => changeMode("booth")}
              type="button"
            >
              <Building2 size={20} /> Banda (fuatilia)
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="grid gap-3">
              <div id="qr-reader" ref={qrRef} className="min-h-[340px] overflow-hidden rounded-lg border border-white/15 bg-black" />
              <div className="flex flex-wrap gap-2">
                {!camera ? (
                  <Button className="w-full sm:w-auto" disabled={loading === "camera"} variant="sun" onClick={startCamera}>{loading === "camera" ? <Spinner /> : <Camera size={18} />} Washa kamera</Button>
                ) : (
                  <Button className="w-full sm:w-auto" variant="secondary" onClick={stopCamera}>Zima kamera</Button>
                )}
              </div>
            </div>
            <div className="grid content-start gap-4">
              <div className="rounded-lg border border-white/15 bg-white/5 p-4">
                <p className="mb-3 text-sm font-medium text-white/70">
                  {mode === "food" ? "Mode ya chakula itathibitisha tiketi mara moja." : "Mode ya banda itahifadhi ziara na survey ya mshiriki."}
                </p>
                {requiresBoothChoice ? (
                  <Field className="mb-3" label="Banda la kuscan">
                    <SelectInput value={selectedBoothId} onChange={(e) => setSelectedBoothId(e.target.value)}>
                      <option value="">Chagua banda</option>
                      {booths.map((booth) => <option key={booth.id} value={booth.id}>{booth.name}</option>)}
                    </SelectInput>
                  </Field>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Field label="Ingiza ticket code kwa mkono">
                    <TextInput className="h-14 text-xl font-black uppercase" value={ticketCode} onChange={(e) => setTicketCode(e.target.value.toUpperCase())} placeholder="CLV-XXXXXX" />
                  </Field>
                  <Button className="h-14" disabled={loading === "lookup"} variant="sun" onClick={() => lookupTicket()}>{loading === "lookup" ? <Spinner /> : <Search size={18} />} Tafuta</Button>
                </div>
              </div>

              {lookup ? (
                <div className="grid gap-4 rounded-lg border border-white/15 bg-white p-4 text-foreground shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="text-xl">{lookup.attendee.name}</strong>
                      <div className="text-sm text-muted-foreground">{lookup.attendee.phone}</div>
                    </div>
                    <span className="rounded-md bg-secondary px-2 py-1 text-sm font-black text-primary">{lookup.attendee.ticketCode}</span>
                  </div>
                  <span>{lookup.attendee.district}, {lookup.attendee.region}</span>
                  {mode === "food" ? (
                    <>
                      <Badge tone={lookup.foodClaim ? "warn" : "ok"}>
                        {lookup.foodClaim ? `Chakula kimetumika · ${new Date(lookup.foodClaim.claimedAt).toLocaleString()}` : "Chakula bado hakijatumika"}
                      </Badge>
                      <Button disabled={Boolean(lookup.foodClaim) || loading === "food"} onClick={claimFood}>
                        {loading === "food" ? <Spinner /> : lookup.foodClaim ? <CheckCircle2 size={18} /> : <Utensils size={18} />}
                        {lookup.foodClaim ? "Chakula tayari kimethibitishwa" : "Thibitisha chakula"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge tone={lookup.currentBoothVisit ? "warn" : "neutral"}>{lookup.currentBoothVisit ? "Tiketi tayari imescan kwenye banda hili" : "Tayari kwa ziara ya banda"}</Badge>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {lookup && mode === "booth" ? (
        <Card>
          <CardContent className="grid gap-5 p-5 sm:p-6">
          <PageHeader title="Hifadhi ziara ya banda" description={`Rekodi huduma aliyopata ${lookup.attendee.name} kwenye ${boothName || "banda ulilochagua"}.`} />
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Huduma">
              <SelectInput value={visit.service} onChange={(e) => setVisit({ ...visit, service: e.target.value })}>
                {SERVICES.map((service) => <option key={service}>{service}</option>)}
              </SelectInput>
            </Field>
            <Field label="Kuridhika">
              <SelectInput value={visit.satisfaction} onChange={(e) => setVisit({ ...visit, satisfaction: Number(e.target.value) })}>
                <option value={1}>Hajaridhika</option>
                <option value={2}>Wastani</option>
                <option value={3}>Ameridhika</option>
              </SelectInput>
            </Field>
            <Field label="Swali lake kuu">
              <TextInput value={visit.question} onChange={(e) => setVisit({ ...visit, question: e.target.value })} placeholder="Hiari" />
            </Field>
          </div>
          <Button disabled={Boolean(lookup.currentBoothVisit) || loading === "visit" || (requiresBoothChoice && !selectedBoothId)} onClick={saveVisit}>{loading === "visit" ? <Spinner /> : <Building2 size={18} />} {lookup.currentBoothVisit ? "Tayari imetumika" : "Hifadhi ziara ya banda"}</Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function hasRole(user, role) {
  return user?.roles?.includes(role) || user?.role === role;
}

function roleLabels(user) {
  const labels = { admin: "Admin", exhibitor: "Banda", food: "Chakula" };
  const roles = user?.roles?.length ? user.roles : [user?.role].filter(Boolean);
  return roles.map((role) => labels[role] || role).join(" · ");
}

