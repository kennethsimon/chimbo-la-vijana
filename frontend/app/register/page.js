"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { ACTIVITIES, REGIONS } from "../../lib/regions";
import { post } from "../../lib/api";
import { Button, Card, CardContent, Field, Popover, PopoverContent, PopoverTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Spinner, TextInput } from "../../components/ui";
import { BrandMark } from "../../components/BrandMark";
import { LanguageSwitcher, useLanguage } from "../../components/LanguageProvider";
import { useToast } from "../../components/ToastProvider";
import { ThemeToggle } from "../../components/ThemeToggle";

const TANZANIA_PHONE_PATTERN = "^(\\+255|255|0)(6|7)\\d{8}$";
const TANZANIA_PHONE_REGEX = /^(\+255|255|0)(6|7)\d{8}$/;
const EVENT_START_AT = new Date("2026-10-24T12:00:00+03:00").getTime();

const initialForm = {
  name: "",
  phone: "",
  email: "",
  birthDate: "",
  age: "",
  gender: "",
  region: "",
  district: "",
  activity: "",
  attendanceChoice: "both"
};

export default function RegisterPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [birthPickerOpen, setBirthPickerOpen] = useState(false);
  const [countdown, setCountdown] = useState(() => getCountdownParts());
  const districts = useMemo(() => REGIONS[form.region] || [], [form.region]);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdownParts()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function update(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "region" ? { district: "" } : {})
    }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!isValidTanzanianPhone(form.phone)) {
      toast.error("Weka namba sahihi ya Tanzania, mfano 0687615616, 255687615616 au +255687615616.");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const payload = {
        ...form,
        age: calculateAge(form.birthDate),
        attendanceDays: attendanceChoiceToDays(form.attendanceChoice)
      };
      delete payload.attendanceChoice;
      const result = await post("/public/registrations", payload);
      setStatus({
        type: "ok",
        ticketCode: result.attendee.ticketCode,
        email: result.attendee.email
      });
      toast.success(result.attendee.email
        ? t("registrationSuccessEmail").replace("{ticketCode}", result.attendee.ticketCode)
        : t("registrationSuccessSms").replace("{ticketCode}", result.attendee.ticketCode));
      setForm(initialForm);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(245,185,66,0.24),transparent_30%),linear-gradient(135deg,hsl(var(--background))_0%,hsl(var(--secondary))_58%,hsl(var(--background))_100%)] px-4 py-3 sm:py-5">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5 sm:gap-4">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span>
              <span className="block text-lg font-bold">Chimbo La Vijana Brunch</span>
              <span className="block text-sm text-muted-foreground">{t("headerSubtitle")}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </header>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="py-0 lg:py-2">
            <div className="mb-2 inline-flex rounded-full bg-accent/25 px-3 py-1 text-[10px] font-bold uppercase text-accent-foreground sm:text-[11px]">{t("heroEyebrow")}</div>
            <h1 className="max-w-3xl text-balance text-[1.6rem] font-black leading-[1.04] tracking-normal text-foreground sm:text-4xl lg:text-5xl">{t("heroTitle")}</h1>
            <p className="mt-1.5 max-w-2xl text-xs font-black uppercase tracking-normal text-primary sm:text-sm lg:text-base">{t("heroTagline")}</p>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-foreground sm:text-lg">{t("heroSubtitle")}</p>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">{t("heroParagraph")}</p>

            <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-3">
              <EventChip icon={<CalendarDays size={18} />} label={t("eventDateLabel")} value={t("eventDateValue")} />
              <EventChip icon={<Clock size={18} />} label={t("eventTimeLabel")} value={t("eventTimeValue")} />
              <EventChip icon={<MapPin size={18} />} label={t("eventLocationLabel")} value={t("eventLocationValue")} />
            </div>

            <Countdown countdown={countdown} t={t} />

            <div className="mt-3 grid gap-1.5 text-xs leading-5 text-muted-foreground sm:mt-4 sm:text-sm sm:leading-6">
              <p className="font-semibold text-foreground">{t("heroPullUp")}</p>
              <p>{t("heroCoupon")}</p>
              <p className="font-semibold text-primary">{t("heroQuestion")}</p>
            </div>
          </div>

          <Card className="shadow-glow">
            <CardContent className="grid gap-5 p-5 sm:p-6">
              <div>
                <div className="mb-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">{t("registerEyebrow")}</div>
                <h2 className="text-2xl font-bold tracking-normal">{t("registerTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("registerDescription")}</p>
              </div>

              {status?.type === "ok" ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
                  <div className="mb-2 flex items-center gap-2"><CheckCircle2 size={18} /> Umesajiliwa kikamilifu.</div>
                  Tiketi yako ni <span className="rounded-md bg-card px-2 py-1 font-black text-primary">{status.ticketCode}</span>. {status.email ? `${t("checkEmail")}: ${status.email}` : t("checkSms")}
                </div>
              ) : null}

              <form className="grid gap-5" onSubmit={submit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t("fullName")}><TextInput value={form.name} onChange={(e) => update("name", e.target.value)} required /></Field>
                  <Field label={t("phone")}><TextInput inputMode="tel" pattern={TANZANIA_PHONE_PATTERN} placeholder="0687615616" title="Tumia namba ya Tanzania kama 0687615616, 255687615616 au +255687615616" value={form.phone} onChange={(e) => update("phone", e.target.value)} required /></Field>
                  <Field label={t("emailOptional")}><TextInput type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></Field>
                  <Field label={t("birthDate")}>
                    <DatePicker
                      value={form.birthDate}
                      onChange={(value) => update("birthDate", value)}
                      open={birthPickerOpen}
                      onOpenChange={setBirthPickerOpen}
                    />
                  </Field>
                  <Field label={t("gender")}>
                    <AppSelect value={form.gender} onValueChange={(value) => update("gender", value)} placeholder={t("selectGender")} options={["Mwanaume", "Mwanamke"]} />
                  </Field>
                  <Field label={t("activity")}>
                    <AppSelect value={form.activity} onValueChange={(value) => update("activity", value)} placeholder={t("selectActivity")} options={ACTIVITIES} />
                  </Field>
                  <Field label={t("attendanceDays")}>
                    <AppSelect
                      value={form.attendanceChoice}
                      onValueChange={(value) => update("attendanceChoice", value)}
                      placeholder={t("selectAttendanceDays")}
                      options={[
                        { label: t("attendDayOne"), value: "day1" },
                        { label: t("attendDayTwo"), value: "day2" },
                        { label: t("attendBothDays"), value: "both" }
                      ]}
                    />
                  </Field>
                  <Field label={t("region")}>
                    <AppSelect value={form.region} onValueChange={(value) => update("region", value)} placeholder={t("selectRegion")} options={Object.keys(REGIONS)} />
                  </Field>
                  <Field label={t("district")}>
                    <AppSelect value={form.district} onValueChange={(value) => update("district", value)} placeholder={t("selectDistrict")} options={districts} disabled={!districts.length} />
                  </Field>
                </div>
                <Button disabled={loading} size="lg">{loading ? <Spinner /> : null}{loading ? t("registering") : t("registerSubmit")}</Button>
              </form>
              <p className="text-center text-xs font-bold uppercase tracking-normal text-primary">{t("registerNow")}</p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

function DatePicker({ value, onChange, open, onOpenChange }) {
  const selectedDate = parseDate(value);
  const [viewDate, setViewDate] = useState(selectedDate || new Date(2000, 0, 1));
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, index) => String(currentYear - index));
  }, []);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ago", "Sep", "Okt", "Nov", "Des"];
  const days = getCalendarDays(viewDate);

  function chooseDate(date) {
    if (date > startOfToday()) return;
    onChange(formatDateValue(date));
    onOpenChange(false);
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          className={!value ? "h-12 w-full justify-start border-input bg-card text-left text-base font-normal text-muted-foreground shadow-sm hover:bg-card" : "h-12 w-full justify-start border-input bg-card text-left text-base font-normal text-foreground shadow-sm hover:bg-card"}
          type="button"
          variant="secondary"
        >
          <CalendarDays size={18} />
          {selectedDate ? formatDisplayDate(selectedDate) : "Chagua tarehe ya kuzaliwa"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[330px] p-3">
        <div className="mb-3 flex items-center gap-2">
          <Button className="h-9 w-9 shrink-0" onClick={() => setViewDate(addMonths(viewDate, -1))} size="icon" type="button" variant="ghost">
            <ChevronLeft size={16} />
          </Button>
          <AppSelect value={String(viewDate.getMonth())} onValueChange={(month) => setViewDate(new Date(viewDate.getFullYear(), Number(month), 1))} options={months.map((label, index) => ({ label, value: String(index) }))} />
          <AppSelect value={String(viewDate.getFullYear())} onValueChange={(year) => setViewDate(new Date(Number(year), viewDate.getMonth(), 1))} options={years.map((year) => ({ label: year, value: year }))} />
          <Button className="h-9 w-9 shrink-0" onClick={() => setViewDate(addMonths(viewDate, 1))} size="icon" type="button" variant="ghost">
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
          {["Jp", "Jt", "Jn", "Al", "Ij", "Im", "Js"].map((day) => <span className="py-1" key={day}>{day}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const disabled = day.date > startOfToday();
            const selected = selectedDate && isSameDate(day.date, selectedDate);
            return (
              <button
                className={[
                  "grid h-9 place-items-center rounded-md text-sm transition-colors",
                  day.inMonth ? "text-foreground" : "text-muted-foreground/45",
                  selected ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-secondary",
                  disabled ? "pointer-events-none opacity-35" : ""
                ].join(" ")}
                key={day.date.toISOString()}
                onClick={() => chooseDate(day.date)}
                type="button"
              >
                {day.date.getDate()}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AppSelect({ value, onValueChange, placeholder, options, disabled = false }) {
  const normalizedOptions = options.map((option) => typeof option === "string" ? { label: option, value: option } : option);
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled} required>
      <SelectTrigger className="h-12 text-base">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {normalizedOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function calculateAge(birthDate) {
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDelta = today.getMonth() - date.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age;
}

function attendanceChoiceToDays(choice) {
  if (choice === "day1") return ["2026-10-24"];
  if (choice === "day2") return ["2026-10-25"];
  return ["2026-10-24", "2026-10-25"];
}

function EventChip({ icon, label, value }) {
  return (
    <div className="rounded-md border bg-card/75 p-2 shadow-sm backdrop-blur sm:rounded-lg sm:p-3">
      <div className="mb-1 flex items-center gap-1 text-primary sm:gap-1.5">
        <span className="grid size-4 shrink-0 place-items-center sm:size-5">{icon}</span>
        <span className="text-[9px] font-bold uppercase sm:text-[11px]">{label}</span>
      </div>
      <strong className="block text-[10px] leading-3 sm:text-xs sm:leading-4">{value}</strong>
    </div>
  );
}

function Countdown({ countdown, t }) {
  if (countdown.done) {
    return (
      <div className="mt-3 rounded-md border bg-card/80 p-2.5 text-xs font-semibold text-primary shadow-sm sm:mt-4 sm:text-sm">
        {t("countdownStarted")}
      </div>
    );
  }

  const items = [
    [t("countdownDays"), countdown.days],
    [t("countdownHours"), countdown.hours],
    [t("countdownMinutes"), countdown.minutes],
    [t("countdownSeconds"), countdown.seconds]
  ];

  return (
    <div className="mt-3 rounded-md border bg-card/80 p-2.5 shadow-sm backdrop-blur sm:mt-4 sm:p-3">
      <div className="mb-2 text-[10px] font-bold uppercase text-primary sm:text-xs">{t("countdownTitle")}</div>
      <div className="grid grid-cols-4 gap-2">
        {items.map(([label, value]) => (
          <div className="rounded-md bg-secondary px-1.5 py-2 text-center" key={label}>
            <strong className="block text-base font-black leading-none text-foreground sm:text-xl">{String(value).padStart(2, "0")}</strong>
            <span className="mt-1 block text-[8px] font-semibold uppercase leading-none text-muted-foreground sm:text-[10px]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function isValidTanzanianPhone(value) {
  return TANZANIA_PHONE_REGEX.test(value.trim().replace(/[\s-]/g, ""));
}

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("sw-TZ", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getCalendarDays(viewDate) {
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      inMonth: date.getMonth() === viewDate.getMonth()
    };
  });
}

function getCountdownParts() {
  const distance = Math.max(0, EVENT_START_AT - Date.now());
  const totalSeconds = Math.floor(distance / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    done: distance === 0
  };
}
