"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Camera, CheckCircle2, ClipboardList, DoorOpen, Search, Utensils, X } from "lucide-react";
import { RequireAuth } from "../../../components/RequireAuth";
import { api, post } from "../../../lib/api";
import { SERVICES } from "../../../lib/regions";
import { isTrainingCentre, PURPOSE_OPTIONS, SATISFACTION_OPTIONS, servicesForBooth, TRAINING_INSTITUTIONS } from "../../../lib/boothSurvey";
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
  const canCheckIn = hasRole(user, "admin") || hasRole(user, "checkin");
  const qrRef = useRef(null);
  const scannerRef = useRef(null);
  const mountedRef = useRef(true);
  const stoppingRef = useRef(false);
  const [ticketCode, setTicketCode] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [lookup, setLookup] = useState(null);
  const [loading, setLoading] = useState("");
  const [usedDialog, setUsedDialog] = useState(null);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [camera, setCamera] = useState(false);
  const [mode, setMode] = useState(canCheckIn ? "checkin" : canScanBooth ? "booth" : "food");
  const [visit, setVisit] = useState(defaultVisit());
  const [booths, setBooths] = useState([]);
  const [selectedBoothId, setSelectedBoothId] = useState("");
  const [scanDay, setScanDay] = useState(defaultScanDay());
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
    if (mode === "booth") {
      setLookup(null);
      setSearchResults([]);
    }
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
          setSearchTerm(code);
          setSearchResults([]);
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
      setTicketCode(result.attendee.ticketCode);
      setSearchTerm(result.attendee.ticketCode);
      setSearchResults([]);
      setLookup(result);
      setVisit(defaultVisit());
      if (mode === "booth" && result.attendee.attendanceDays?.includes(scanDay) && !result.currentBoothVisit) {
        setSurveyOpen(true);
      }
      toast.success(`Tiketi sahihi: ${result.attendee.name}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading("");
    }
  }

  async function searchAttendee() {
    const query = searchTerm.trim();
    if (query.length < 2) {
      toast.warning("Andika angalau herufi mbili, namba ya simu, au ticket code.");
      return;
    }
    if (requiresBoothChoice && !selectedBoothId) {
      toast.warning("Chagua banda kabla ya kutafuta mshiriki.");
      return;
    }
    setLoading("lookup");
    setLookup(null);
    setSearchResults([]);
    try {
      const result = await post("/exhibitor/scans/search", { query });
      const attendees = result.attendees || [];
      if (!attendees.length) {
        toast.error("Hakuna mshiriki aliyepatikana.");
        return;
      }
      if (attendees.length === 1) {
        setTicketCode(attendees[0].ticketCode);
        await lookupTicket(attendees[0].ticketCode);
        return;
      }
      setSearchResults(attendees);
      toast.warning("Wapo washiriki zaidi ya mmoja. Chagua mshiriki sahihi.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading("");
    }
  }

  async function chooseSearchResult(attendee) {
    setTicketCode(attendee.ticketCode);
    setSearchTerm(attendee.ticketCode);
    setSearchResults([]);
    await lookupTicket(attendee.ticketCode);
  }

  async function saveVisit(surveyStatus = "completed") {
    if (requiresBoothChoice && !selectedBoothId) {
      toast.warning("Chagua banda kabla ya kuhifadhi ziara.");
      return;
    }
    setLoading("visit");
    try {
      const surveyPayload = surveyStatus === "skipped"
        ? {
            purpose: visit.purpose || null,
            service: visit.service || null,
            trainingInstitution: visit.trainingInstitution || null,
            surveyStatus
          }
        : { ...visit, surveyStatus };
      const result = await post("/exhibitor/scans/visit", scanPayload({ ticketCode, ...surveyPayload }));
      toast.success(surveyStatus === "skipped"
        ? "Ziara imehifadhiwa na tathmini imerukwa."
        : `Survey na ziara zimehifadhiwa saa ${new Date(result.visit.createdAt).toLocaleTimeString()}`);
      setSurveyOpen(false);
      await lookupTicket(ticketCode);
    } catch (error) {
      if (error.status === 409) {
        setUsedDialog({ title: "QR imeshatumika", text: `Tiketi hii tayari imetumika kwenye banda hili siku ya ${formatEventDay(scanDay)}.` });
        toast.warning("Tiketi hii tayari imetumika kwenye banda hili siku hii.");
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
      const result = await post("/exhibitor/scans/food", { ticketCode, scanDay });
      toast.success(`Food claim confirmed at ${new Date(result.claimedAt).toLocaleTimeString()}`);
      await lookupTicket(ticketCode);
    } catch (error) {
      if (error.status === 409) {
        setUsedDialog({ title: "QR imeshatumika", text: `Tiketi hii tayari imetumika kwa chakula siku ya ${formatEventDay(scanDay)}.` });
        toast.warning("Tiketi hii tayari imetumika kwa chakula siku hii.");
        return;
      }
      toast.error(error.message);
    } finally {
      setLoading("");
    }
  }

  async function confirmCheckin() {
    setLoading("checkin");
    try {
      const result = await post("/exhibitor/scans/checkin", { ticketCode, scanDay });
      toast.success(`Mahudhurio yamethibitishwa saa ${new Date(result.checkedInAt).toLocaleTimeString()}`);
      await lookupTicket(ticketCode);
    } catch (error) {
      if (error.status === 409) {
        setUsedDialog({ title: "QR imeshatumika", text: `Mahudhurio ya tiketi hii tayari yamethibitishwa tarehe ${formatEventDay(scanDay)}.` });
        toast.warning("Mahudhurio ya tiketi hii tayari yamethibitishwa siku hii.");
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
    if (nextMode === "checkin" && !canCheckIn) return;
    setMode(nextMode);
    setLookup(null);
    setSearchResults([]);
    setSurveyOpen(false);
  }

  function scanPayload(payload) {
    const withDay = { ...payload, scanDay };
    if (isAdmin && mode === "booth" && selectedBoothId) return { ...withDay, boothId: selectedBoothId };
    return withDay;
  }

  const allowedSelectedDay = !lookup || lookup.attendee.attendanceDays?.includes(scanDay);

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
      {surveyOpen && lookup && mode === "booth" ? (
        <BoothSurveySheet
          attendee={lookup.attendee}
          boothName={boothName || "banda ulilochagua"}
          disabled={!allowedSelectedDay || Boolean(lookup.currentBoothVisit) || loading === "visit" || (requiresBoothChoice && !selectedBoothId)}
          loading={loading === "visit"}
          scanDay={scanDay}
          setVisit={setVisit}
          visit={visit}
          onClose={() => setSurveyOpen(false)}
          onSave={saveVisit}
        />
      ) : null}
      <Card className="overflow-hidden border-0 bg-event-ink text-white">
        <CardContent className="grid gap-5 p-5 sm:p-6">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase text-white">Zana ya banda</div>
            <h1 className="text-3xl font-bold tracking-normal text-white">Scan QR ya mshiriki</h1>
            <p className="mt-2 text-sm text-white/70">Ruhusa: <strong className="text-white">{roleLabels(user)}</strong>{canScanBooth ? <> · Banda: <strong className="text-white">{boothName || "Chagua banda"}</strong></> : null}</p>
          </div>
          <div className="grid gap-2 rounded-lg border border-white/15 bg-white/5 p-1 sm:grid-cols-3">
            <button
              className={mode === "checkin" ? "flex min-h-14 items-center justify-center gap-2 rounded-md bg-accent px-3 text-sm font-black text-accent-foreground shadow-sm disabled:opacity-40" : "flex min-h-14 items-center justify-center gap-2 rounded-md px-3 text-sm font-black text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"}
              disabled={!canCheckIn}
              onClick={() => changeMode("checkin")}
              type="button"
            >
              <DoorOpen size={20} /> Kiingilio
            </button>
            <button
              className={mode === "food" ? "flex min-h-14 items-center justify-center gap-2 rounded-md bg-accent px-3 text-sm font-black text-accent-foreground shadow-sm disabled:opacity-40" : "flex min-h-14 items-center justify-center gap-2 rounded-md px-3 text-sm font-black text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"}
              disabled={!canScanFood}
              onClick={() => changeMode("food")}
              type="button"
            >
              <Utensils size={20} /> Chakula
            </button>
            <button
              className={mode === "booth" ? "flex min-h-14 items-center justify-center gap-2 rounded-md bg-accent px-3 text-sm font-black text-accent-foreground shadow-sm disabled:opacity-40" : "flex min-h-14 items-center justify-center gap-2 rounded-md px-3 text-sm font-black text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"}
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
                  {mode === "food"
                    ? "Chakula kinathibitishwa mara moja kwa siku baada ya mshiriki kutembelea mabanda 3 tofauti siku hiyo."
                    : mode === "checkin"
                      ? "Kiingilio kinathibitisha kuwa mshiriki amehudhuria siku uliyochagua."
                      : "Mode ya banda itahifadhi ziara na survey kwa siku uliyochagua."}
                </p>
                <Field className="mb-3" label="Siku ya kuscan">
                  <SelectInput value={scanDay} onChange={(e) => {
                    setScanDay(e.target.value);
                    setLookup(null);
                    setSearchResults([]);
                  }}>
                    <option value="2026-10-24">24 October</option>
                    <option value="2026-10-25">25 October</option>
                  </SelectInput>
                </Field>
                {requiresBoothChoice ? (
                  <Field className="mb-3" label="Banda la kuscan">
                    <SelectInput value={selectedBoothId} onChange={(e) => setSelectedBoothId(e.target.value)}>
                      <option value="">Chagua banda</option>
                      {booths.map((booth) => <option key={booth.id} value={booth.id}>{booth.name}</option>)}
                    </SelectInput>
                  </Field>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Field label="Tafuta kwa ticket code, jina au simu">
                    <TextInput
                      className="h-14 text-base font-semibold"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setSearchResults([]);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") searchAttendee();
                      }}
                      placeholder="CLV-XXXXXX, jina au 0687..."
                    />
                  </Field>
                  <Button className="h-14" disabled={loading === "lookup"} variant="sun" onClick={searchAttendee}>{loading === "lookup" ? <Spinner /> : <Search size={18} />} Tafuta</Button>
                </div>
                {searchResults.length ? (
                  <div className="mt-3 overflow-hidden rounded-md border border-white/15 bg-white text-foreground">
                    <div className="border-b bg-secondary px-3 py-2 text-xs font-bold uppercase text-muted-foreground">Chagua mshiriki sahihi</div>
                    <div className="divide-y">
                      {searchResults.map((attendee) => (
                        <button
                          className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-secondary/60"
                          key={attendee.id}
                          onClick={() => chooseSearchResult(attendee)}
                          type="button"
                        >
                          <span className="min-w-0">
                            <strong className="block truncate text-sm">{attendee.name}</strong>
                            <span className="block text-xs text-muted-foreground">{attendee.phone}</span>
                          </span>
                          <Badge>{attendee.ticketCode}</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
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
                  <div className="grid gap-1 text-sm text-muted-foreground">
                    <span>Siku alizochagua: <strong className="text-foreground">{formatAttendanceDays(lookup.attendee.attendanceDays)}</strong></span>
                    <span>Siku ya scan: <strong className="text-foreground">{formatEventDay(scanDay)}</strong></span>
                  </div>
                  {!allowedSelectedDay ? (
                    <Badge tone="warn">Tiketi hii hairuhusiwi kwa siku hii</Badge>
                  ) : null}
                  {mode === "food" ? (
                    <>
                      <div className="grid gap-2 rounded-md border bg-secondary/50 p-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <strong>Ziara za mabanda</strong>
                          <Badge tone={lookup.boothEligibility?.eligible ? "ok" : "warn"}>
                            {lookup.boothEligibility?.visited || 0} / {lookup.boothEligibility?.required || 3}
                          </Badge>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-border">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, ((lookup.boothEligibility?.visited || 0) / (lookup.boothEligibility?.required || 3)) * 100)}%` }} />
                        </div>
                        {lookup.boothEligibility?.booths?.length ? (
                          <p className="text-xs text-muted-foreground">Yaliyotembelewa: {lookup.boothEligibility.booths.join(", ")}</p>
                        ) : <p className="text-xs text-muted-foreground">Bado hajatembelea banda lolote siku hii.</p>}
                      </div>
                      <Badge tone={lookup.foodClaim ? "warn" : "ok"}>
                        {lookup.foodClaim ? `Chakula kimetumika ${formatEventDay(scanDay)} · ${new Date(lookup.foodClaim.claimedAt).toLocaleString()}` : `Chakula cha ${formatEventDay(scanDay)} bado hakijatumika`}
                      </Badge>
                      {!lookup.boothEligibility?.eligible ? <Badge tone="warn">Atembelee mabanda {lookup.boothEligibility?.remaining || 3} zaidi ili astahiki chakula</Badge> : null}
                      <Button disabled={!allowedSelectedDay || !lookup.boothEligibility?.eligible || Boolean(lookup.foodClaim) || loading === "food"} onClick={claimFood}>
                        {loading === "food" ? <Spinner /> : lookup.foodClaim ? <CheckCircle2 size={18} /> : <Utensils size={18} />}
                        {lookup.foodClaim ? "Chakula tayari kimethibitishwa" : `Thibitisha chakula ${formatEventDay(scanDay)}`}
                      </Button>
                    </>
                  ) : mode === "checkin" ? (
                    <>
                      <Badge tone={lookup.attendanceCheckin ? "warn" : "ok"}>
                        {lookup.attendanceCheckin
                          ? `Mahudhurio yalithibitishwa ${new Date(lookup.attendanceCheckin.checkedInAt).toLocaleString()}`
                          : `Bado hajaingia ${formatEventDay(scanDay)}`}
                      </Badge>
                      <Button disabled={!allowedSelectedDay || Boolean(lookup.attendanceCheckin) || loading === "checkin"} onClick={confirmCheckin}>
                        {loading === "checkin" ? <Spinner /> : lookup.attendanceCheckin ? <CheckCircle2 size={18} /> : <DoorOpen size={18} />}
                        {lookup.attendanceCheckin ? "Mahudhurio tayari yamethibitishwa" : `Thibitisha mahudhurio ${formatEventDay(scanDay)}`}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Badge tone={lookup.currentBoothVisit ? "warn" : "neutral"}>{lookup.currentBoothVisit ? `Tiketi tayari imescan kwenye banda hili ${formatEventDay(scanDay)}` : `Tayari kwa ziara ya banda ${formatEventDay(scanDay)}`}</Badge>
                      {!lookup.currentBoothVisit && allowedSelectedDay ? (
                        <Button onClick={() => setSurveyOpen(true)} variant="secondary">
                          <ClipboardList size={18} /> Fungua survey ya banda
                        </Button>
                      ) : null}
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
          <PageHeader title="Survey ya banda" description={`Baada ya QR kuwa sahihi, fungua survey umuulize ${lookup.attendee.name} maswali mafupi kisha uhifadhi ziara ya ${boothName || "banda ulilochagua"}.`} />
          <div className="rounded-md border bg-secondary/40 p-4 text-sm text-muted-foreground">
            Survey itafunguka kama action sheet baada ya scan kufanikiwa. Majibu yataonekana kwenye historia ya scans na CSV export.
          </div>
          <Button disabled={!allowedSelectedDay || Boolean(lookup.currentBoothVisit) || (requiresBoothChoice && !selectedBoothId)} onClick={() => setSurveyOpen(true)}>
            <ClipboardList size={18} /> {lookup.currentBoothVisit ? "Survey tayari imehifadhiwa" : `Fungua survey ${formatEventDay(scanDay)}`}
          </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function BoothSurveySheet({ attendee, boothName, disabled, loading, scanDay, visit, setVisit, onClose, onSave }) {
  const trainingCentre = isTrainingCentre(boothName);
  const serviceOptions = servicesForBooth(boothName);
  const canSubmit = visit.purpose && visit.service && visit.satisfaction && (!trainingCentre || visit.trainingInstitution);

  function updateField(field, value) {
    setVisit((current) => ({
      ...current,
      [field]: value,
      ...(field === "purpose" && value !== "question" ? { question: "" } : {})
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-hidden rounded-t-lg bg-card text-card-foreground shadow-2xl sm:mx-auto sm:max-w-2xl sm:rounded-lg">
        <div className="flex items-start justify-between gap-4 border-b p-4 sm:p-5">
          <div>
            <div className="mb-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">Survey ya banda</div>
            <h2 className="text-xl font-bold tracking-normal">Muulize mshiriki maswali haya</h2>
            <p className="mt-1 text-sm text-muted-foreground">{attendee.name} · {boothName} · {formatEventDay(scanDay)}</p>
          </div>
          <button className="grid size-9 shrink-0 place-items-center rounded-md border hover:bg-secondary" onClick={onClose} type="button" aria-label="Funga survey">
            <X size={18} />
          </button>
        </div>
        <div className="grid max-h-[60vh] gap-4 overflow-y-auto p-4 sm:p-5">
          <SurveyField index={1} label="Alichokuja kufanya" required>
            <SelectInput value={visit.purpose} onChange={(event) => updateField("purpose", event.target.value)}>
              <option value="">Chagua sababu ya ziara</option>
              {PURPOSE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectInput>
          </SurveyField>

          <SurveyField index={2} label={trainingCentre ? "Mada ya kikao alichohudhuria" : "Huduma maalum aliyopata"} required>
            {trainingCentre ? (
              <TextInput value={visit.service} onChange={(event) => updateField("service", event.target.value)} placeholder="Andika mada ya kikao" />
            ) : (
              <SelectInput value={visit.service} onChange={(event) => updateField("service", event.target.value)}>
                <option value="">Chagua huduma</option>
                {(serviceOptions.length ? serviceOptions : SERVICES).map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectInput>
            )}
          </SurveyField>

          {trainingCentre ? (
            <SurveyField index={3} label="Taasisi iliyotoa mafunzo" required>
              <SelectInput value={visit.trainingInstitution} onChange={(event) => updateField("trainingInstitution", event.target.value)}>
                <option value="">Chagua taasisi</option>
                {TRAINING_INSTITUTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectInput>
            </SurveyField>
          ) : null}

          <SurveyField index={trainingCentre ? 4 : 3} label="Kuridhika" required>
            <SelectInput value={visit.satisfaction} onChange={(event) => updateField("satisfaction", event.target.value)}>
              <option value="">Chagua kiwango</option>
              {SATISFACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </SelectInput>
          </SurveyField>

          {visit.purpose === "question" ? (
            <SurveyField index={trainingCentre ? 5 : 4} label="Aliuliza swali gani?">
              <SurveyTextarea value={visit.question} onChange={(event) => updateField("question", event.target.value)} placeholder="Andika swali la mshiriki" />
            </SurveyField>
          ) : null}

          <SurveyField index={trainingCentre ? (visit.purpose === "question" ? 6 : 5) : (visit.purpose === "question" ? 5 : 4)} label="Taarifa mpya aliyopata asiyoijua awali">
            <SurveyTextarea value={visit.newInfo} onChange={(event) => updateField("newInfo", event.target.value)} placeholder="Hiari: andika taarifa mpya aliyojifunza" />
          </SurveyField>
        </div>
        <div className="grid gap-3 border-t bg-card p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:p-5">
          <p className="text-sm text-muted-foreground">Sehemu zenye alama * ni lazima kwa survey kamili.</p>
          <Button disabled={disabled || loading} variant="secondary" onClick={() => onSave("skipped")} type="button">Ruka survey</Button>
          <Button disabled={disabled || loading || !canSubmit} onClick={() => onSave("completed")} type="button">
            {loading ? <Spinner /> : <Building2 size={18} />} Tuma na hifadhi ziara
          </Button>
        </div>
      </div>
    </div>
  );
}

function SurveyField({ index, label, required = false, children }) {
  return (
    <div className="grid gap-2 rounded-md border bg-background p-3">
      <label className="text-sm font-semibold text-foreground">{index}. {label}{required ? " *" : ""}</label>
      {children}
    </div>
  );
}

function SurveyTextarea(props) {
  return <textarea className="min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" {...props} />;
}

function hasRole(user, role) {
  return user?.roles?.includes(role) || user?.role === role;
}

function roleLabels(user) {
  const labels = { admin: "Admin", exhibitor: "Banda", food: "Chakula", checkin: "Kiingilio" };
  const roles = user?.roles?.length ? user.roles : [user?.role].filter(Boolean);
  return roles.map((role) => labels[role] || role).join(" · ");
}

function defaultScanDay() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Dar_es_Salaam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  return ["2026-10-24", "2026-10-25"].includes(today) ? today : "2026-10-24";
}

function formatEventDay(day) {
  return day === "2026-10-25" ? "25 October" : "24 October";
}

function formatAttendanceDays(days = []) {
  if (days.length === 2) return "24 & 25 October";
  return formatEventDay(days[0]);
}

function defaultVisit() {
  return {
    purpose: "",
    service: "",
    satisfaction: "",
    question: "",
    newInfo: "",
    trainingInstitution: ""
  };
}

